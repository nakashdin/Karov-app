/**
 * The single record shape every unified-importer source maps onto.
 *
 * This is the contract between the *adapters* (which know one source each) and
 * the *pipeline* (validation → dedup → geocode → review), which is deliberately
 * source-agnostic. It is a richer sibling of the legacy per-category
 * `NormalizedPlace` (importers/shared/types.ts): it adds first-class provenance
 * and per-record confidence so the staging + review layers can audit every
 * field back to where it came from.
 *
 * Nothing here reads or writes live data — these are types only.
 */
import type { GeoPoint, ImportType } from '../../shared/types.ts';

// Re-exported so unified consumers can stay within the `unified/` surface.
export type { GeoPoint, ImportType };

/** How much we trust a field/record. Seeded from the source's registry trust. */
export type Confidence = 'high' | 'medium' | 'low';

/**
 * Exactly where one record came from — kept for trust, audit, and re-pull.
 * `raw` is the untouched source payload so a record can be re-normalized after
 * an adapter bug-fix without re-fetching.
 */
export interface RecordProvenance {
  /** FK → SourceRegistryEntry.id. */
  sourceId: string;
  /** Which adapter produced this record (SourceAdapter.id). */
  adapterId: string;
  /** Stable id WITHIN the source (council row id, OSM node, gov.il key, …). */
  sourceRecordId: string;
  /** Page / endpoint the record was read from. */
  sourceUrl?: string;
  /** ISO timestamp of the fetch that produced it. */
  fetchedAt: string;
  /** Untouched source payload, for re-normalize / audit. */
  raw?: Record<string, unknown>;
}

/**
 * A normalized, source-agnostic place record.
 *
 * `location` is optional on purpose: many sources (council directories, gov.il)
 * arrive without coordinates and are resolved later by the geocoding stage.
 * App-only fields (rating, kosherType, …) are intentionally absent — no free
 * source provides them reliably.
 */
export interface NormalizedImportRecord {
  /** Deterministic id derived from provenance — see `makeRecordId`. */
  id: string;
  type: ImportType;
  name: string;
  address?: string;
  /** Raw city string from the source, before locality resolution. */
  cityHint?: string;
  /** Absent until the geocoding stage resolves it. */
  location?: GeoPoint;
  phone?: string;
  openingHours?: string;
  tags?: string[];
  /** Synagogue rite (אשכנז / ספרד / …) when the source provides it. */
  nusach?: string;
  confidence?: Confidence;
  provenance: RecordProvenance;
  /** Free-form per-source fields kept for later enrichment. */
  extra?: Record<string, unknown>;
}

/** Deterministic, collision-resistant id from provenance (no randomness). */
export function makeRecordId(sourceId: string, sourceRecordId: string): string {
  const slug = (s: string): string =>
    s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9:_-]/g, '');
  return `${slug(sourceId)}::${slug(sourceRecordId)}`;
}
