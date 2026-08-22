import AsyncStorage from '@react-native-async-storage/async-storage';
import { DYNAMIC_KEY_PREFIXES } from './keys';

/**
 * Typed, non-throwing wrapper around AsyncStorage.
 *
 * Every previous call site hand-rolled the same `try { JSON.parse(raw) } catch {}`
 * dance and typed the result as `any`. That is how a change to a stored shape
 * turns into a crash on an existing install instead of a fallback.
 *
 * Rules here:
 *   • a read never throws — it returns the fallback;
 *   • a write never throws — storage being full or unavailable (Safari private
 *     mode, cleared site data) must not take a screen down;
 *   • parsed values are validated by an optional guard before being trusted.
 */

/** Narrow a parsed value; return false to fall back rather than trust it. */
export type Guard<T> = (value: unknown) => value is T;

export async function getString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setString(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and JSON-parse a value.
 *
 * `fallback` is returned for a missing key, unparseable JSON, or a value the
 * guard rejects — the three cases the old inline code conflated into one.
 */
export async function getJSON<T>(
  key: string,
  fallback: T,
  guard?: Guard<T>,
): Promise<T> {
  const raw = await getString(key);
  if (raw === null) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }

  if (guard && !guard(parsed)) return fallback;
  return parsed as T;
}

export async function setJSON<T>(key: string, value: T): Promise<boolean> {
  try {
    return await setString(key, JSON.stringify(value));
  } catch {
    // A value with a circular reference, or a BigInt.
    return false;
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Nothing useful to do — the value stays until the next write.
  }
}

export async function removeMany(keys: readonly string[]): Promise<void> {
  try {
    await AsyncStorage.multiRemove([...keys]);
  } catch {
    // Fall back to a best-effort per-key pass.
    await Promise.all(keys.map(remove));
  }
}

/**
 * Drop every dynamically-keyed cache entry (per-day, per-topic, per-coordinate).
 *
 * These accumulate forever otherwise: one entry per day the app was opened,
 * per parasha read, per place the user has stood in.
 */
export async function clearDynamicCaches(): Promise<number> {
  try {
    const all = await AsyncStorage.getAllKeys();
    const stale = all.filter((k) => DYNAMIC_KEY_PREFIXES.some((p) => k.startsWith(p)));
    if (stale.length) await removeMany(stale);
    return stale.length;
  } catch {
    return 0;
  }
}

// ── Common guards ─────────────────────────────────────────────────────────────

export const isString = (v: unknown): v is string => typeof v === 'string';
export const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');
export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
