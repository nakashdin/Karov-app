/**
 * source_registry — the catalog of WHERE unified-importer data may come from.
 *
 * One entry per registered source (a council website, gov.il dataset, OSM
 * extract, manual seed, …). The registry is the *only* place that knows about
 * licensing, robots compliance, trust and which adapter handles a source; the
 * pipeline and adapters read it but never hard-code a source.
 *
 * It can later be *populated from* research catalogs such as
 * council-domain-catalog.json via `fromCouncilCatalogEntry` below — that mapper
 * takes a plain object, so the registry never imports (or modifies) the
 * research files.
 */
import type { ImportType } from './normalized-record.ts';

export type SourceKind =
  | 'council-website'
  | 'data-gov'
  | 'osm'
  | 'manual'
  | 'partner-feed';

/** Lifecycle of a source in the registry (not of its data). */
export type SourceStatus = 'draft' | 'active' | 'paused' | 'retired';

/** Licensing + attribution obligations carried with every record. */
export interface SourceLicense {
  /** SPDX-ish id or stable slug, e.g. 'ODbL-1.0', 'gov-il-open', 'unknown'. */
  id: string;
  attributionRequired: boolean;
  /** Exact attribution string to surface in-app when required. */
  attributionText?: string;
  url?: string;
}

/** robots.txt compliance snapshot for a web source. */
export interface RobotsStatus {
  checked: boolean;
  /** null = unknown / not yet fetched. */
  allowed: boolean | null;
  checkedAt?: string;
}

export interface SourceRegistryEntry {
  /** Stable slug, e.g. 'council:petah-tikva', 'osm:synagogues', 'datagov:mikvahs'. */
  id: string;
  displayName: string;
  kind: SourceKind;
  /** Which SourceAdapter handles fetch+normalize for this source. */
  adapterId: string;
  status: SourceStatus;
  /** Categories this source is expected to yield. */
  produces: ImportType[];
  url?: string;
  domain?: string;
  license: SourceLicense;
  /** Baseline trust 0..1 used to seed each record's `confidence`. */
  trust: number;
  robots?: RobotsStatus;
  estimatedRecordCount?: number;
  /** ISO timestamp of the last successful staged import. */
  lastImportAt?: string;
  notes?: string;
}

export interface SourceRegistry {
  version: 1;
  /** ISO timestamp of the last edit to the registry. */
  updatedAt: string;
  entries: SourceRegistryEntry[];
}

/** Look up a single source; returns undefined when not registered. */
export function findSource(
  registry: SourceRegistry,
  id: string,
): SourceRegistryEntry | undefined {
  return registry.entries.find((e) => e.id === id);
}

/** Sources the orchestrator may actually run right now. */
export function activeSources(registry: SourceRegistry): SourceRegistryEntry[] {
  return registry.entries.filter((e) => e.status === 'active');
}

/**
 * Minimal read-only view of one council-domain-catalog.json row. Declared here
 * (not imported) so the registry can be *seeded from* that research artifact
 * without ever reading or mutating the file itself.
 */
export interface CouncilCatalogEntryLike {
  councilName: string;
  domain: string | null;
  confidence: number;
  cms?: string | null;
  hasSynagogueDirectory?: boolean;
  supportedByCurrentParser?: boolean;
  estimatedCount?: number | null;
  robots?: { fetched: boolean; directoryAllowed: boolean | null };
  evidenceUrl?: string | null;
}

/**
 * Map one research-catalog row → a draft registry entry. Pure: caller decides
 * whether/when to persist. Entries land as `draft` (never auto-active) and are
 * confidence-gated by the caller before promotion.
 */
export function fromCouncilCatalogEntry(
  row: CouncilCatalogEntryLike,
  opts: { adapterId: string },
): SourceRegistryEntry {
  const slug = row.councilName.trim().toLowerCase().replace(/\s+/g, '-');
  return {
    id: `council:${slug}`,
    displayName: row.councilName.trim(),
    kind: 'council-website',
    adapterId: opts.adapterId,
    status: 'draft',
    produces: ['synagogue'],
    url: row.domain ?? row.evidenceUrl ?? undefined,
    domain: row.domain ?? undefined,
    license: { id: 'unknown', attributionRequired: true },
    // Catalog confidence is 0..1-ish already; clamp defensively.
    trust: Math.max(0, Math.min(1, row.confidence)),
    robots: row.robots
      ? { checked: row.robots.fetched, allowed: row.robots.directoryAllowed }
      : undefined,
    estimatedRecordCount: row.estimatedCount ?? undefined,
    notes: row.cms ? `cms=${row.cms}` : undefined,
  };
}
