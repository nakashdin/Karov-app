/**
 * Source adapter contract.
 *
 * An adapter is the *only* component that knows how one source is shaped: how to
 * fetch its raw records and how to turn each into a `NormalizedImportRecord`.
 * Everything downstream (validation, dedup, geocode, staging, review) is
 * source-agnostic and works off the normalized output.
 *
 * `fetch` is the single network boundary in the whole architecture. It is
 * invoked ONLY by an orchestrator, ONLY when a source is explicitly run — it is
 * never called by importing this module. No adapter is registered here yet, so
 * loading this file pulls no live data.
 */
import type { NormalizedImportRecord, ImportType } from '../schema/normalized-record.ts';
import type { SourceKind, SourceRegistryEntry } from '../schema/source-registry.ts';

/** What an adapter advertises about itself, independent of any one source. */
export interface AdapterDescription {
  id: string;
  kind: SourceKind;
  produces: ImportType[];
  /** Human summary of the source family this adapter handles. */
  summary?: string;
}

/** Ambient services handed to an adapter for one run (no globals). */
export interface AdapterContext {
  /** The registry entry being imported (carries url, license, trust, …). */
  source: SourceRegistryEntry;
  /** Structured log sink; defaults to console in the orchestrator. */
  log: (message: string) => void;
  /** Cooperative cancellation for long fetches. */
  signal?: AbortSignal;
}

/** Raw payload an adapter pulled, paired with where it came from. */
export interface RawFetchResult {
  /** Opaque source records, passed back to `normalize` one at a time. */
  items: unknown[];
  /** URL/endpoint actually read (for provenance). */
  fetchedFrom?: string;
  /** ISO timestamp of the fetch. */
  fetchedAt: string;
}

export interface SourceAdapter {
  /** Stable id referenced by `SourceRegistryEntry.adapterId`. */
  readonly id: string;
  describe(): AdapterDescription;

  /**
   * NETWORK BOUNDARY. Pull raw records for `ctx.source`. Implementations must
   * honor robots/rate-limits and `ctx.signal`. Called only by the orchestrator.
   */
  fetch(ctx: AdapterContext): Promise<RawFetchResult>;

  /**
   * Map one raw item → zero or more normalized records (pure; no IO). Returning
   * `[]` drops an item the adapter recognizes as unusable.
   */
  normalize(rawItem: unknown, ctx: AdapterContext): NormalizedImportRecord[];
}

/** A lookup the orchestrator uses to resolve `adapterId` → adapter. */
export interface AdapterRegistry {
  register(adapter: SourceAdapter): void;
  get(adapterId: string): SourceAdapter | undefined;
  list(): SourceAdapter[];
}

/** Minimal in-memory adapter registry (no adapters registered by default). */
export class MapAdapterRegistry implements AdapterRegistry {
  private readonly byId = new Map<string, SourceAdapter>();
  register(adapter: SourceAdapter): void {
    this.byId.set(adapter.id, adapter);
  }
  get(adapterId: string): SourceAdapter | undefined {
    return this.byId.get(adapterId);
  }
  list(): SourceAdapter[] {
    return [...this.byId.values()];
  }
}
