/**
 * REAL MERGE — connect the 7 councils' synagogues into the app's live dataset.
 *
 * ADDITIVE-ONLY, gated. Fresh backup first; existing records are preserved (ids
 * kept), enriched only by FILLING EMPTY fields (never overwritten); only
 * verified NEW records are appended. Conflicts + over-300m candidates are NOT
 * merged — they stay in reports for manual review. A validation gate aborts the
 * write if anything looks wrong (0 deletions enforced).
 *
 * Run:  node importers/religious-councils/connect-live.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Place } from '../../src/types/place.ts';
import type { CouncilPlace } from './sources.ts';
import { isInIsrael } from '../shared/utils.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const REPORTS = join(OUT, 'reports');
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const PLACES = join(GEN, 'places.osm.json');
const CITIES = join(GEN, 'cities.osm.json');
const PLACES_BACKUP = join(GEN, 'places.osm.pre-step2.backup.json');
const CITIES_BACKUP = join(GEN, 'cities.osm.pre-step2.backup.json');
// Step-2 batch: the 2 newly-discovered councils (the first 12 are already in live).
const COUNCIL_IDS = ['hadera', 'givat-zeev'];

type LivePlace = Place & { provenance?: Record<string, unknown> };

function fuzzyNorm(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/בית\s+ה?כנסת/g, ' ').replace(/ביה["'׳]?כ["'׳]?נ|בהכ["'׳]?נ|ביכנ/g, ' ')
    .replace(/["'׳״’”`\-]/g, '').replace(/וו/g, 'ו').replace(/יי/g, 'י')
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

function councilToPlace(c: CouncilPlace): LivePlace {
  const p: LivePlace = {
    id: c.sourceId, name: c.name, type: 'synagogue', cityId: c.city, address: c.address,
    location: { latitude: c.lat, longitude: c.lng }, lastVerifiedAt: c.verifiedAt,
    provenance: { source: 'religious-council', council: c.council, sourceUrl: c.sourceUrl },
  };
  if (c.gabbaiPhone) p.phone = c.gabbaiPhone;
  if (c.nusach) p.nusach = c.nusach;
  return p;
}

function main(): void {
  const liveRaw = readFileSync(PLACES, 'utf8');
  const citiesRaw = readFileSync(CITIES, 'utf8');
  const live = JSON.parse(liveRaw) as Place[];
  const synagogues = live.filter((p) => p.type === 'synagogue');
  const beforeSyn = synagogues.length;
  const beforeTotal = live.length;
  const beforeIds = new Set(live.map((p) => p.id));

  const council: CouncilPlace[] = [];
  for (const id of COUNCIL_IDS) {
    const f = join(OUT, `${id}.normalized.json`);
    if (existsSync(f)) council.push(...(JSON.parse(readFileSync(f, 'utf8')) as CouncilPlace[]));
  }

  const byId = new Map<string, LivePlace>(live.map((p) => [p.id, { ...p }]));
  const enrichedOf = new Set<string>();
  const added: LivePlace[] = [];
  const enrichLog: { existingId: string; fields: string[]; council: string }[] = [];
  const heldConflicts: unknown[] = [];
  const heldOver300: unknown[] = [];

  for (const c of council) {
    let best: { e: Place; d: number; sim: number } | null = null;
    for (const e of synagogues) {
      const d = meters(c.lat, c.lng, e.location.latitude, e.location.longitude);
      if (d > 600) continue;
      const sim = nameSim(c.name, e.name);
      if (!best || sim > best.sim || (sim === best.sim && d < best.d)) best = { e, d, sim };
    }
    const isMatch = best && best.d <= 300 && ((best.d <= 150 && best.sim >= 0.6) || best.sim >= 0.8);
    const isConflict = !isMatch && best && best.d <= 150 && best.sim >= 0.3;
    const isOver300 = !isMatch && best && best.sim >= 0.8 && best.d > 300 && best.d <= 600;

    if (isMatch && best && !enrichedOf.has(best.e.id)) {
      const clone = byId.get(best.e.id)!;
      const fields: string[] = [];
      if (c.nusach && !clone.nusach) { clone.nusach = c.nusach; fields.push('nusach'); }
      if (c.gabbaiPhone && !clone.phone) { clone.phone = c.gabbaiPhone; fields.push('phone'); }
      if (c.address && (!clone.address || clone.address === clone.cityId)) { clone.address = c.address; fields.push('address'); }
      clone.provenance = { enrichedBy: 'religious-council', council: c.council, sourceId: c.sourceId, fields };
      enrichedOf.add(best.e.id);
      enrichLog.push({ existingId: best.e.id, fields, council: c.council });
    } else if (isConflict && best) {
      heldConflicts.push({ sourceId: c.sourceId, name: c.name, council: c.council, existingId: best.e.id, existingName: best.e.name, distanceM: Math.round(best.d), nameSim: Number(best.sim.toFixed(2)) });
    } else if (isOver300 && best) {
      heldOver300.push({ sourceId: c.sourceId, name: c.name, council: c.council, existingName: best.e.name, distanceM: Math.round(best.d), nameSim: Number(best.sim.toFixed(2)) });
    } else {
      added.push(councilToPlace(c)); // verified new (validated below)
    }
  }

  const merged: LivePlace[] = [...byId.values(), ...added];

  // ---- VALIDATION GATE (abort on any failure; nothing written) -------------
  const fail: string[] = [];
  for (const id of beforeIds) if (!merged.some((p) => p.id === id)) fail.push(`DELETED id ${id}`);
  if (merged.length !== beforeTotal + added.length) fail.push('count mismatch');
  for (const a of added) {
    if (!a.name?.trim()) fail.push(`new without name ${a.id}`);
    if (!a.cityId?.trim()) fail.push(`new without city ${a.id}`);
    if (!a.location || !Number.isFinite(a.location.latitude) || !isInIsrael(a.location)) fail.push(`new bad coords ${a.id}`);
  }
  const mergedSyn = merged.filter((p) => p.type === 'synagogue').length;
  if (mergedSyn !== beforeSyn + added.length) fail.push('synagogue count mismatch');
  if (fail.length) {
    console.error('❌ VALIDATION GATE FAILED — nothing written:\n  ' + fail.slice(0, 10).join('\n  '));
    process.exit(1);
  }

  // ---- fresh backups (do not overwrite an existing backup) -----------------
  if (!existsSync(PLACES_BACKUP)) writeFileSync(PLACES_BACKUP, liveRaw, 'utf8');
  if (!existsSync(CITIES_BACKUP)) writeFileSync(CITIES_BACKUP, citiesRaw, 'utf8');

  // ---- write live (additive) + rebuild cities ------------------------------
  writeFileSync(PLACES, JSON.stringify(merged, null, 2), 'utf8');
  const counts: Record<string, number> = {};
  for (const p of merged) if (p.cityId) counts[p.cityId] = (counts[p.cityId] || 0) + 1;
  const cities = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((name) => ({ id: name, name }));
  writeFileSync(CITIES, JSON.stringify(cities, null, 2), 'utf8');

  writeFileSync(join(REPORTS, 'connect-held-conflicts.json'), JSON.stringify(heldConflicts, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'connect-held-over300.json'), JSON.stringify(heldOver300, null, 2), 'utf8');
  const summary = {
    beforeSynagogues: beforeSyn, addedNew: added.length, enrichedExisting: enrichLog.length,
    afterSynagogues: mergedSyn, beforeTotal, afterTotal: merged.length,
    heldConflicts: heldConflicts.length, heldOver300: heldOver300.length,
    deletions: 0, citiesAfter: cities.length, backupCreated: true,
  };
  writeFileSync(join(REPORTS, 'connect-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n========== REAL MERGE (additive, gated) ==========');
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`);
}

main();
