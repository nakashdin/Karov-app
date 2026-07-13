/**
 * Additive preview vs live — identical semantics to the council preview
 * (build-merged-preview.ts): classify each incoming record against existing
 * synagogues into new / enriched / conflict / over300, enriching only EMPTY
 * fields and never deleting or overwriting. DRY-RUN: callers write to a separate
 * output folder, never to places.osm.json.
 */
import type { Place } from '../../src/types/place.ts';
import type { NormalizedImportRecord } from '../unified/schema/normalized-record.ts';

type PreviewPlace = Place & { provenance?: Record<string, unknown> };

// --- Hebrew fuzzy matching (same heuristics as the council preview) ----------
function fuzzyNorm(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/בית\s+ה?כנסת/g, ' ')
    .replace(/ביה["'׳]?כ["'׳]?נ|בהכ["'׳]?נ|ביכנ/g, ' ')
    .replace(/["'׳״’”`\-]/g, '')
    .replace(/וו/g, 'ו')
    .replace(/יי/g, 'י')
    .replace(/\s+/g, ' ')
    .trim();
}
const tok = (s: string): string[] => fuzzyNorm(s).split(' ').filter((t) => t.length > 1);
function nameSim(a: string, b: string): number {
  const A = new Set(tok(a));
  const B = new Set(tok(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const jac = inter / (A.size + B.size - inter);
  const na = fuzzyNorm(a).replace(/\s/g, '');
  const nb = fuzzyNorm(b).replace(/\s/g, '');
  if (na.length > 2 && nb.length > 2 && (na.includes(nb) || nb.includes(na))) return Math.max(jac, 0.85);
  return jac;
}
const toRad = (d: number): number => (d * Math.PI) / 180;
function meters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function recordToPlace(r: NormalizedImportRecord, conflictWith?: string): PreviewPlace {
  const city = r.cityHint ?? '';
  const p: PreviewPlace = {
    id: r.id,
    name: r.name,
    type: 'synagogue',
    cityId: city,
    address: r.address ?? city,
    location: r.location!,
    lastVerifiedAt: r.provenance.fetchedAt.slice(0, 10),
    provenance: {
      source: r.provenance.sourceId,
      adapterId: r.provenance.adapterId,
      sourceUrl: r.provenance.sourceUrl,
      ...(conflictWith ? { conflictWith } : {}),
    },
  };
  if (r.phone) p.phone = r.phone;
  if (r.nusach) p.nusach = r.nusach;
  return p;
}

export interface PreviewReports {
  newRecs: { sourceRecordId: string; name: string }[];
  enriched: { existingId: string; existingName: string; fields: string[]; distanceM: number }[];
  conflicts: {
    sourceRecordId: string;
    name: string;
    existingId: string;
    existingName: string;
    distanceM: number;
    nameSim: number;
  }[];
  over300: { sourceRecordId: string; name: string; existingName: string; distanceM: number; nameSim: number }[];
  /** The additive merged dataset (live clone + enrichments + appended new/conflict). NOT live. */
  merged: PreviewPlace[];
}

/**
 * Classify `records` (already validated) against `liveSynagogues`. Pure.
 * Mirrors the council thresholds: match d≤300 ∧ ((d≤150∧sim≥0.6)∨sim≥0.8);
 * conflict d≤150 ∧ 0.3≤sim<match; over300 sim≥0.8 ∧ 300<d≤600.
 */
export function classifyPreview(
  records: NormalizedImportRecord[],
  live: Place[],
): PreviewReports {
  const synagogues = live.filter((p) => p.type === 'synagogue');
  const byId = new Map<string, PreviewPlace>(live.map((p) => [p.id, { ...p }]));
  const enrichedOf = new Set<string>();

  const reports: PreviewReports = { newRecs: [], enriched: [], conflicts: [], over300: [], merged: [] };
  const appended: PreviewPlace[] = [];

  for (const r of records) {
    if (!r.location) continue; // validated upstream; defensive
    const here = r.location;

    let best: { e: Place; d: number; sim: number } | null = null;
    for (const e of synagogues) {
      const d = meters(here.latitude, here.longitude, e.location.latitude, e.location.longitude);
      if (d > 600) continue;
      const sim = nameSim(r.name, e.name);
      if (!best || sim > best.sim || (sim === best.sim && d < best.d)) best = { e, d, sim };
    }

    const isMatch = !!best && best.d <= 300 && ((best.d <= 150 && best.sim >= 0.6) || best.sim >= 0.8);
    const isConflict = !isMatch && !!best && best.d <= 150 && best.sim >= 0.3;
    const isOver300 = !isMatch && !!best && best.sim >= 0.8 && best.d > 300 && best.d <= 600;

    if (isOver300 && best) {
      reports.over300.push({
        sourceRecordId: r.provenance.sourceRecordId,
        name: r.name,
        existingName: best.e.name,
        distanceM: Math.round(best.d),
        nameSim: Number(best.sim.toFixed(2)),
      });
    }

    if (isMatch && best) {
      if (enrichedOf.has(best.e.id)) {
        // a second incoming record matched the same existing → append as new (flagged)
        appended.push(recordToPlace(r, best.e.id));
        reports.newRecs.push({ sourceRecordId: r.provenance.sourceRecordId, name: r.name });
        continue;
      }
      const clone = byId.get(best.e.id)!;
      const fields: string[] = [];
      if (r.nusach && !clone.nusach) {
        clone.nusach = r.nusach;
        fields.push('nusach');
      }
      if (r.phone && !clone.phone) {
        clone.phone = r.phone;
        fields.push('phone');
      }
      if (r.address && (!clone.address || clone.address === clone.cityId)) {
        clone.address = r.address;
        fields.push('address');
      }
      clone.provenance = {
        enrichedBy: r.provenance.adapterId,
        source: r.provenance.sourceId,
        sourceRecordId: r.provenance.sourceRecordId,
        fields,
      };
      enrichedOf.add(best.e.id);
      reports.enriched.push({
        existingId: best.e.id,
        existingName: best.e.name,
        fields,
        distanceM: Math.round(best.d),
      });
    } else if (isConflict && best) {
      appended.push(recordToPlace(r, best.e.id));
      reports.conflicts.push({
        sourceRecordId: r.provenance.sourceRecordId,
        name: r.name,
        existingId: best.e.id,
        existingName: best.e.name,
        distanceM: Math.round(best.d),
        nameSim: Number(best.sim.toFixed(2)),
      });
    } else {
      appended.push(recordToPlace(r));
      reports.newRecs.push({ sourceRecordId: r.provenance.sourceRecordId, name: r.name });
    }
  }

  reports.merged = [...byId.values(), ...appended];
  return reports;
}
