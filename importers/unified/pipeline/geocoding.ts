/**
 * Geocoding interface for the unified pipeline.
 *
 * The pipeline depends only on the `Geocoder` interface, so the live Nominatim
 * implementation (importers/mikvahs/geocoder.ts) can be adapted in later
 * without the staging/review code knowing about HTTP, rate-limits, or caching.
 *
 * This file performs NO network calls. The only concrete implementation here is
 * `NullGeocoder`, which always returns `failed` — a safe default that lets the
 * pipeline run end-to-end (and tests stay offline) until a real geocoder is
 * wired by the orchestrator.
 */
import type { GeoPoint } from '../schema/normalized-record.ts';

export type GeocodePrecision = 'address' | 'city' | 'failed';

export interface GeocodeRequest {
  /** Full street address, when available. */
  address?: string;
  /** City / locality name, used as the fallback query. */
  city?: string;
  /** Country bias; defaults to Israel in real implementations. */
  countryCode?: string;
}

export interface GeocodeOutcome {
  /** null when nothing resolved (precision === 'failed'). */
  location: GeoPoint | null;
  precision: GeocodePrecision;
  /** The exact query string that produced this outcome. */
  query: string;
  /** ISO date the coordinate was resolved. */
  resolvedAt?: string;
}

export interface Geocoder {
  geocode(request: GeocodeRequest): Promise<GeocodeOutcome>;
}

/**
 * Cache contract a real geocoder is expected to honor. A cached value of
 * `null`/`failed` means "searched, not found" and must NOT be re-queried.
 */
export interface GeocodeCache {
  get(key: string): GeocodeOutcome | undefined;
  set(key: string, value: GeocodeOutcome): void;
  /** Persist to durable storage (disk, db). No-op for in-memory caches. */
  flush?(): void;
}

/** Stable cache key for a request (address preferred, else city). */
export function geocodeCacheKey(req: GeocodeRequest): string {
  const base = (req.address ?? req.city ?? '').trim();
  return `${(req.countryCode ?? 'il').toLowerCase()}|${base}`;
}

/** Always-failed geocoder — offline-safe default; never touches the network. */
export class NullGeocoder implements Geocoder {
  async geocode(request: GeocodeRequest): Promise<GeocodeOutcome> {
    return {
      location: null,
      precision: 'failed',
      query: (request.address ?? request.city ?? '').trim(),
    };
  }
}

/** Simple in-memory cache implementing the `GeocodeCache` contract. */
export class MemoryGeocodeCache implements GeocodeCache {
  private readonly store = new Map<string, GeocodeOutcome>();
  get(key: string): GeocodeOutcome | undefined {
    return this.store.get(key);
  }
  set(key: string, value: GeocodeOutcome): void {
    this.store.set(key, value);
  }
}
