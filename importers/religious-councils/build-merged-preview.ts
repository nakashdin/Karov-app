/**
 * PREVIEW MERGE (additive-only) — shows how the dataset would look WITH the
 * council synagogues, WITHOUT touching live data.
 *
 * Guarantees: never replaces/edits places.osm.json, never deletes/overwrites,
 * no real app merge. It writes a SEPARATE preview file + reports. Existing
 * records are preserved; matches ENRICH a clone (fill empty fields only);
 * new/conflict council records are APPENDED. Nothing is dropped.
 *
 * Run:  node importers/religious-councils/build-merged-preview.ts
 * Out:  output/places.with-councils.preview.json
 *       output/reports/{new,enriched,conflicts,rejected}.json , merge-summary.json
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Place } from '../../src/types/place.ts';
import type { CouncilPlace } from './sources.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const REPORTS = join(OUT, 'reports');
const LIVE = join(HERE, '..', '..', 'src', 'data', 'generated', 'places.osm.json');
// Step-2 batch: the 2 newly-discovered councils (the first 12 are already in live).
const COUNCIL_IDS = ['hadera', 'givat-zeev'];

type PreviewPlace = Place & { provenance?: Record<string, unknown> };

// --- improved Hebrew fuzzy normalization (matching only) --------------------
function fuzzyNorm(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/בית\s+ה?כנסת/g, ' ')
    .replace(/ביה["'׳]?כ["'׳]?נ|בהכ["'׳]?נ|ביכנ/g, ' ')
    .replace(/["'׳״’”`\-]/g, '')
    .replace(/וו/g, 'ו').replace(/יי/g, 'י')   // spelling variants (נווה≈נוה)
    .replace(/\s+/g, ' ').trim();
}
const tok = (s: string): string[] => fuzzyNorm(s).split(' ').filter((t) => t.length > 1);
function nameSim(a: string, b: string): number {
  const A = new Set(tok(a)), B = new Set(tok(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const jac = inter / (A.size + B.size - inter);
  const na = fuzzyNorm(a).replace(/\s/g, ''), nb = fuzzyNorm(b).replace(/\s/g, '');
  if (na.length > 2 && nb.length > 2 && (na.includes(nb) || nb.includes(na))) return Math.max(jac, 0.85);
  return jac;
}
const toRad = (d: number): number => (d * Math.PI) / 180;
function meters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function councilToPlace(c: CouncilPlace, conflictWith?: string): PreviewPlace {
  const p: PreviewPlace = {
    id: c.sourceId, name: c.name, type: 'synagogue', cityId: c.city, address: c.address,
    location: { latitude: c.lat, longitude: c.lng }, lastVerifiedAt: c.verifiedAt,
    provenance: { source: 'religious-council', council: c.council, sourceUrl: c.sourceUrl, ...(conflictWith ? { conflictWith } : {}) },
  };
  if (c.gabbaiPhone) p.phone = c.gabbaiPhone;
  if (c.nusach) p.nusach = c.nusach;
  return p;
}

function main(): void {
  const live = JSON.parse(readFileSync(LIVE, 'utf8')) as Place[];
  const synagogues = live.filter((p) => p.type === 'synagogue');

  const council: CouncilPlace[] = [];
  for (const id of COUNCIL_IDS) {
    const f = join(OUT, `${id}.normalized.json`);
    if (existsSync(f)) council.push(...(JSON.parse(readFileSync(f, 'utf8')) as CouncilPlace[]));
  }

  // clone ALL existing (unchanged baseline); enrich matched synagogue clones
  const byId = new Map<string, PreviewPlace>(live.map((p) => [p.id, { ...p }]));
  const enrichedOf = new Set<string>();

  const newRecs: PreviewPlace[] = [];
  const reportNew: { sourceId: string; council: string; name: string }[] = [];
  const reportEnriched: { existingId: string; existingName: string; council: string; fields: string[]; distanceM: number }[] = [];
  const reportConflicts: { sourceId: string; council: string; name: string; existingId: string; existingName: string; distanceM: number; nameSim: number }[] = [];
  const reportOver300: { sourceId: string; council: string; name: string; existingName: string; distanceM: number; nameSim: number }[] = [];
  const reportRejected: { sourceId: string; reason: string }[] = [];

  for (const c of council) {
    if (!c.name || c.lat == null || c.lng == null) { reportRejected.push({ sourceId: c.sourceId, reason: 'missing name/coords' }); continue; }

    let best: { e: Place; d: number; sim: number } | null = null;
    for (const e of synagogues) {
      const d = meters(c.lat, c.lng, e.location.latitude, e.location.longitude);
      if (d > 600) continue;
      const sim = nameSim(c.name, e.name);
      if (!best || sim > best.sim || (sim === best.sim && d < best.d)) best = { e, d, sim };
    }

    // Tightened: NEVER auto-match above 300m — such high-name candidates are
    // reported (reportOver300) for manual review instead of merging.
    const isMatch = best && best.d <= 300 && ((best.d <= 150 && best.sim >= 0.6) || best.sim >= 0.8);
    const isConflict = !isMatch && best && best.d <= 150 && best.sim >= 0.3;
    const isOver300 = !isMatch && best && best.sim >= 0.8 && best.d > 300 && best.d <= 600;
    if (isOver300 && best) {
      reportOver300.push({ sourceId: c.sourceId, council: c.council, name: c.name, existingName: best.e.name, distanceM: Math.round(best.d), nameSim: Number(best.sim.toFixed(2)) });
    }

    if (isMatch && best) {
      if (enrichedOf.has(best.e.id)) {
        // a second council record matched the same existing — append as new, flag
        newRecs.push(councilToPlace(c, best.e.id));
        reportNew.push({ sourceId: c.sourceId, council: c.council, name: c.name });
        continue;
      }
      const clone = byId.get(best.e.id)!;
      const fields: string[] = [];
      if (c.nusach && !clone.nusach) { clone.nusach = c.nusach; fields.push('nusach'); }
      if (c.gabbaiPhone && !clone.phone) { clone.phone = c.gabbaiPhone; fields.push('phone'); }
      if (c.address && (!clone.address || clone.address === clone.cityId)) { clone.address = c.address; fields.push('address'); }
      clone.provenance = { enrichedBy: 'religious-council', council: c.council, sourceId: c.sourceId, fields };
      enrichedOf.add(best.e.id);
      reportEnriched.push({ existingId: best.e.id, existingName: best.e.name, council: c.council, fields, distanceM: Math.round(best.d) });
    } else if (isConflict && best) {
      newRecs.push(councilToPlace(c, best.e.id));
      reportConflicts.push({ sourceId: c.sourceId, council: c.council, name: c.name, existingId: best.e.id, existingName: best.e.name, distanceM: Math.round(best.d), nameSim: Number(best.sim.toFixed(2)) });
    } else {
      newRecs.push(councilToPlace(c));
      reportNew.push({ sourceId: c.sourceId, council: c.council, name: c.name });
    }
  }

  const merged: PreviewPlace[] = [...byId.values(), ...newRecs];

  const summary = {
    existingTotal: live.length,
    existingSynagogues: synagogues.length,
    councilRecords: council.length,
    enrichedExisting: reportEnriched.length,
    newRecords: reportNew.length,
    conflicts: reportConflicts.length,
    matchesOver300m: reportOver300.length,
    rejected: reportRejected.length,
    mergedTotal: merged.length,
    mergedSynagogues: merged.filter((p) => p.type === 'synagogue').length,
    note: 'PREVIEW ONLY — additive, no live data touched, no real merge',
    dryRun: true, liveDataTouched: false,
  };

  writeFileSync(join(OUT, 'places.with-councils.preview.json'), JSON.stringify(merged, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'new.json'), JSON.stringify(reportNew, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'enriched.json'), JSON.stringify(reportEnriched, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'conflicts.json'), JSON.stringify(reportConflicts, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'over300m.json'), JSON.stringify(reportOver300, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'rejected.json'), JSON.stringify(reportRejected, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'merge-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n========== PREVIEW MERGE (additive) ==========');
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`);
}

main();
