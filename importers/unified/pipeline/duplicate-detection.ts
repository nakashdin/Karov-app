/**
 * Duplicate detection interface (+ a default geo/name implementation).
 *
 * The pipeline depends only on the `DuplicateDetector` interface, so the
 * strategy can be swapped (geo+name now, an embedding/trigram service later)
 * without touching staging or review. The default implementation ports the
 * proven classification used by the council preview-dedup: a record is a
 * `match` when it's close AND name-similar, a `conflict` when it's at the same
 * spot under a different name, otherwise `new`.
 *
 * Pure + in-memory — it never reads production data; the orchestrator supplies
 * candidates.
 */
import type { GeoPoint, ImportType, NormalizedImportRecord } from '../schema/normalized-record.ts';

export type DuplicateClass = 'new' | 'match' | 'conflict';

/** An existing record the incoming one is compared against. */
export interface DuplicateCandidate {
  id: string;
  name: string;
  type: ImportType;
  location: GeoPoint;
  /** Present fields are used to compute what the incoming record could enrich. */
  address?: string;
  phone?: string;
  nusach?: string;
  source?: string;
}

export interface DuplicateVerdict {
  class: DuplicateClass;
  matchedId?: string;
  matchedName?: string;
  distanceM?: number;
  nameSimilarity?: number;
  /** Fields the incoming record could add to the matched existing record. */
  enrichableFields?: string[];
  /** Several strong near-matches → likely a cluster; flag for human review. */
  suspicious?: boolean;
}

export interface DuplicateDetector {
  detect(
    record: NormalizedImportRecord,
    candidates: DuplicateCandidate[],
  ): DuplicateVerdict;
}

export interface DuplicateDetectorConfig {
  /** ≤ this distance + name match → `match`. */
  matchDistanceM: number;
  /** ≥ this name similarity (0..1) at match distance → `match`. */
  matchNameSim: number;
  /** Name-strong fallback distance (coords may have drifted). */
  nameMatchDistanceM: number;
  nameMatchSim: number;
  /** Same spot, weak name → `conflict`. */
  conflictDistanceM: number;
  conflictNameSim: number;
  /** Distance under which a near-match counts toward the suspicious cluster. */
  clusterDistanceM: number;
}

export const defaultDuplicateConfig: DuplicateDetectorConfig = {
  matchDistanceM: 150,
  matchNameSim: 0.6,
  nameMatchDistanceM: 600,
  nameMatchSim: 0.8,
  conflictDistanceM: 150,
  conflictNameSim: 0.3,
  clusterDistanceM: 80,
};

// --- helpers (pure) ---------------------------------------------------------

const toRad = (d: number): number => (d * Math.PI) / 180;

/** Great-circle distance in METERS. */
function meters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** Normalize a Hebrew name for comparison (strip quotes/geresh, collapse spaces). */
function normName(s: string): string {
  return s.replace(/['"׳״’”`]/g, '').replace(/\s+/g, ' ').trim();
}

function tokens(s: string): string[] {
  return normName(s).split(' ').filter((t) => t.length > 1);
}

/** Token-Jaccard with a substring boost — same heuristic as the council dedup. */
export function nameSimilarity(a: string, b: string): number {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const jac = inter / (A.size + B.size - inter);
  const na = normName(a).replace(/\s/g, '');
  const nb = normName(b).replace(/\s/g, '');
  if (na && nb && (na.includes(nb) || nb.includes(na))) return Math.max(jac, 0.85);
  return jac;
}

/** Default geo + name detector. */
export class GeoNameDuplicateDetector implements DuplicateDetector {
  private readonly cfg: DuplicateDetectorConfig;

  constructor(cfg: DuplicateDetectorConfig = defaultDuplicateConfig) {
    this.cfg = cfg;
  }

  detect(record: NormalizedImportRecord, candidates: DuplicateCandidate[]): DuplicateVerdict {
    if (!record.location) return { class: 'new' };
    const here = record.location;
    const cfg = this.cfg;

    let best: { c: DuplicateCandidate; d: number; sim: number } | null = null;
    let strongNear = 0;
    for (const c of candidates) {
      if (c.type !== record.type) continue;
      const d = meters(here, c.location);
      if (d > cfg.nameMatchDistanceM) continue;
      const sim = nameSimilarity(record.name, c.name);
      if (d <= cfg.clusterDistanceM && sim >= 0.5) strongNear++;
      if (!best || sim > best.sim || (sim === best.sim && d < best.d)) best = { c, d, sim };
    }

    if (!best) return { class: 'new' };

    let cls: DuplicateClass = 'new';
    if (best.d <= cfg.matchDistanceM && best.sim >= cfg.matchNameSim) cls = 'match';
    else if (best.sim >= cfg.nameMatchSim && best.d <= cfg.nameMatchDistanceM) cls = 'match';
    else if (best.d <= cfg.conflictDistanceM && best.sim >= cfg.conflictNameSim) cls = 'conflict';

    if (cls === 'new') return { class: 'new' };

    const verdict: DuplicateVerdict = {
      class: cls,
      matchedId: best.c.id,
      matchedName: best.c.name,
      distanceM: Math.round(best.d),
      nameSimilarity: Number(best.sim.toFixed(2)),
      suspicious: strongNear >= 2,
    };

    if (cls === 'match') {
      const ef: string[] = [];
      if (record.nusach && !best.c.nusach) ef.push('nusach');
      if (record.phone && !best.c.phone) ef.push('phone');
      const thinAddr = !best.c.address || best.c.address === best.c.name;
      if (best.c.source === 'osm' && thinAddr && record.address) ef.push('address');
      verdict.enrichableFields = ef;
    }

    return verdict;
  }
}
