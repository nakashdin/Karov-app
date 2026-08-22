/**
 * The one place a network request is made.
 *
 * Before this existed, eight `fetch` calls were scattered across hooks and a
 * screen, each with an inline URL, no timeout, no retry, and an empty
 * `catch {}` — so a network failure was indistinguishable from "there is no
 * data", and a hung request hung the screen forever.
 *
 * Everything here is platform-neutral on purpose: on web these calls are
 * subject to CORS and the page CSP, on native they are not. Keeping them behind
 * one wrapper is what makes "works in the simulator, broken in the browser"
 * debuggable.
 */

/** Why a request failed. Callers can distinguish these; `catch {}` could not. */
export type ApiFailure = 'timeout' | 'network' | 'http' | 'parse' | 'aborted';

export class ApiError extends Error {
  constructor(
    readonly failure: ApiFailure,
    readonly url: string,
    readonly status?: number,
    cause?: unknown,
  ) {
    super(`[${failure}${status ? ' ' + status : ''}] ${url}`);
    this.name = 'ApiError';
    this.cause = cause;
  }
}

export interface RequestOptions {
  /** Abort and fail with 'timeout' after this many ms. Default 8000. */
  timeoutMs?: number;
  /** Extra attempts after the first, for timeouts and 5xx only. Default 2. */
  retries?: number;
  /** Caller-owned cancellation, composed with the internal timeout. */
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

const DEFAULTS = { timeoutMs: 8_000, retries: 2 } as const;

/** Exponential backoff with a small fixed base — 300ms, 600ms, 1200ms… */
const backoffMs = (attempt: number) => 300 * 2 ** attempt;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A 4xx is the server's final answer; retrying only wastes the user's battery. */
const isRetryable = (err: ApiError) =>
  err.failure === 'timeout' ||
  err.failure === 'network' ||
  (err.failure === 'http' && (err.status ?? 0) >= 500);

async function once(url: string, opts: RequestOptions): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULTS.timeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(url, { signal: controller.signal, headers: opts.headers });
    if (!response.ok) throw new ApiError('http', url, response.status);
    return response;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // An abort is either the caller cancelling or our own timeout firing.
    if (opts.signal?.aborted) throw new ApiError('aborted', url, undefined, err);
    if (controller.signal.aborted) throw new ApiError('timeout', url, undefined, err);
    throw new ApiError('network', url, undefined, err);
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onExternalAbort);
  }
}

/** GET a URL, parse it as JSON, and throw a typed ApiError on any failure. */
export async function getJson<T>(url: string, opts: RequestOptions = {}): Promise<T> {
  const retries = opts.retries ?? DEFAULTS.retries;

  let lastError: ApiError | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await once(url, opts);
      try {
        return (await response.json()) as T;
      } catch (err) {
        // A malformed body will be malformed again — never retry a parse error.
        throw new ApiError('parse', url, response.status, err);
      }
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError('network', url, undefined, err);
      lastError = apiError;
      if (apiError.failure === 'aborted' || !isRetryable(apiError)) throw apiError;
      if (attempt < retries) await sleep(backoffMs(attempt));
    }
  }
  throw lastError ?? new ApiError('network', url);
}

/**
 * `getJson` that resolves to `null` instead of throwing.
 *
 * For the many callers whose honest answer to a failure is "show nothing".
 * Unlike the `catch {}` this replaces, the reason is still reported through
 * `onFailure`, so it can reach a crash reporter later.
 */
export async function tryGetJson<T>(
  url: string,
  opts: RequestOptions & { onFailure?: (error: ApiError) => void } = {},
): Promise<T | null> {
  try {
    return await getJson<T>(url, opts);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.failure !== 'aborted') opts.onFailure?.(err);
      return null;
    }
    throw err;
  }
}

/** Build a query string, skipping null/undefined so callers stay declarative. */
export function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}
