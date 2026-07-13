/**
 * REAL MERGE — ArcGIS Batch 3 → live. Same gated iron pipeline as batch1/2.
 * Batch 3 = Holon, Herzliya, Or Akiva, Kiryat Ono, Lod.
 * (Modi'in Ilit HELD — it has no existing cityId; merging it would create a new
 *  cityId, which is forbidden this batch.)
 *
 * ADDITIVE-ONLY: fresh backup → gate → write → post-write validation (auto-
 * restore on any failure). 0 deletions, fill-empty-only, conflicts/over300 held,
 * cityId by NAME-MATCH to an existing label (no new cityId), mikveh+restaurant
 * untouched, prior ArcGIS (batch1/2) untouched, cities.osm.json untouched.
 *
 * Run:  node importers/arcgis/connect-batch3.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Place } from '../../src/types/place.ts';
import type { NormalizedImportRecord } from '../unified/schema/normalized-record.ts';
import { isInIsrael } from '../shared/utils.ts';
import { CITIES } from './cities.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const REPORTS = join(OUT, 'batch3-reports');
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const PLACES = join(GEN, 'places.osm.json');
const PLACES_BACKUP = join(GEN, 'places.osm.pre-arcgis-batch3.backup.json');

const BATCH = ['holon', 'herzliya', 'or-akiva', 'kiryat-ono', 'lod'];
const PRIOR_ARCGIS = ['tel-aviv', 'haifa', 'ashdod', 'ashkelon', 'jerusalem', 'nahariya', 'modiin', 'nof-hagalil'];

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

const normCity = (s: string): string => s.replace(/[\s\-–—'"׳״]/g, '');

/** Canonical cityId = dominant EXISTING spelling of this city across ALL place types (name-match). */
function canonicalCityId(configCity: string, all: Place[]): string | null {
  const target = normCity(configCity);
  const counts: Record<string, number> = {};
  for (const e of all) if (e.cityId && normCity(e.cityId) === target) counts[e.cityId] = (counts[e.cityId] || 0) + 1;
  const best = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  return best ?? null; // null = no existing cityId → caller must hold (no new cityId allowed)
}

function recordToPlace(r: NormalizedImportRecord, cityId: string): LivePlace {
  const p: LivePlace = {
    id: r.id, name: r.name, type: 'synagogue', cityId,
    address: r.address ?? cityId, location: r.location!,
    lastVerifiedAt: r.provenance.fetchedAt.slice(0, 10),
    provenance: { source: r.provenance.sourceId, by: 'arcgis-municipal', sourceUrl: r.provenance.sourceUrl },
  };
  if (r.phone) p.phone = r.phone;
  if (r.nusach) p.nusach = r.nusach;
  return p;
}

function main(): void {
  const liveRaw = readFileSync(PLACES, 'utf8');
  const live = JSON.parse(liveRaw) as Place[];
  const beforeTotal = live.length;
  const beforeSyn = live.filter((p) => p.type === 'synagogue').length;
  const beforeMikveh = live.filter((p) => p.type === 'mikveh').length;
  const beforeRest = live.filter((p) => p.type === 'restaurant').length;
  const beforeArcgis = live.filter((p) => typeof p.id === 'string' && p.id.startsWith('arcgis:')).length;
  const beforeIds = new Set(live.map((p) => p.id));
  const baseCityIds = new Set(live.map((p) => p.cityId).filter(Boolean));
  const originalById = new Map<string, Place>(live.map((p) => [p.id, p]));
  const synagogues = live.filter((p) => p.type === 'synagogue');

  const fail: string[] = [];
  const byCity = new Map<string, NormalizedImportRecord[]>();
  for (const c of BATCH) byCity.set(c, JSON.parse(readFileSync(join(OUT, c, `${c}.normalized.json`), 'utf8')) as NormalizedImportRecord[]);

  const cityIdOf = new Map<string, string>();
  for (const c of BATCH) {
    const cid = canonicalCityId(CITIES[`arcgis:${c}`].city, live);
    if (!cid) fail.push(`no existing cityId for ${c} (would create new cityId)`);
    else cityIdOf.set(c, cid);
  }
  if (fail.length) { console.error('❌ PRE-GATE FAILED (no write):\n  ' + fail.join('\n  ')); process.exit(1); }

  const byId = new Map<string, LivePlace>(live.map((p) => [p.id, { ...p }]));
  const enrichedOf = new Set<string>();
  const added: LivePlace[] = [];
  const enrichLog: unknown[] = [];
  const heldConflicts: unknown[] = [];
  const heldOver300: unknown[] = [];

  for (const c of BATCH) {
    const cityId = cityIdOf.get(c)!;
    for (const r of byCity.get(c)!) {
      const here = r.location!;
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

      if (isMatch && best && !enrichedOf.has(best.e.id)) {
        const clone = byId.get(best.e.id)!;
        const fields: string[] = [];
        if (r.nusach && !clone.nusach) { clone.nusach = r.nusach; fields.push('nusach'); }
        if (r.phone && !clone.phone) { clone.phone = r.phone; fields.push('phone'); }
        if (r.address && (!clone.address || clone.address === clone.cityId)) { clone.address = r.address; fields.push('address'); }
        clone.provenance = { enrichedBy: 'arcgis-municipal', source: r.provenance.sourceId, sourceRecordId: r.provenance.sourceRecordId, fields };
        enrichedOf.add(best.e.id);
        enrichLog.push({ existingId: best.e.id, existingName: best.e.name, city: c, fields, distanceM: Math.round(best.d) });
      } else if (isConflict && best) {
        heldConflicts.push({ sourceRecordId: r.provenance.sourceRecordId, name: r.name, city: c, existingId: best.e.id, existingName: best.e.name, distanceM: Math.round(best.d), nameSim: Number(best.sim.toFixed(2)) });
      } else if (isOver300 && best) {
        heldOver300.push({ sourceRecordId: r.provenance.sourceRecordId, name: r.name, city: c, existingName: best.e.name, distanceM: Math.round(best.d), nameSim: Number(best.sim.toFixed(2)) });
      } else {
        added.push(recordToPlace(r, cityId));
      }
    }
  }

  const merged: LivePlace[] = [...byId.values(), ...added];

  // ---- GATE (pre-write) ----------------------------------------------------
  const mergedIds = new Set(merged.map((p) => p.id));
  for (const id of beforeIds) if (!mergedIds.has(id)) fail.push(`DELETED existing id ${id}`);
  if (merged.length !== beforeTotal + added.length) fail.push('count mismatch');
  if (mergedIds.size !== merged.length) fail.push('duplicate id in merged set');
  const addedIds = new Set<string>();
  for (const a of added) {
    if (!a.name?.trim()) fail.push(`new without name ${a.id}`);
    if (!a.cityId?.trim()) fail.push(`new without city ${a.id}`);
    if (!a.location || !isInIsrael(a.location)) fail.push(`new bad coords ${a.id}`);
    if (beforeIds.has(a.id)) fail.push(`new id collides ${a.id}`);
    if (addedIds.has(a.id)) fail.push(`duplicate new id ${a.id}`);
    if (!baseCityIds.has(a.cityId)) fail.push(`NEW cityId "${a.cityId}" on ${a.id}`);
    addedIds.add(a.id);
  }
  for (const id of beforeIds) {
    const o = originalById.get(id)!, m = byId.get(id)!;
    if (m.name !== o.name || m.type !== o.type) fail.push(`mutated name/type ${id}`);
    if (m.location.latitude !== o.location.latitude || m.location.longitude !== o.location.longitude) fail.push(`mutated location ${id}`);
    if (m.cityId !== o.cityId) fail.push(`mutated cityId ${id}`);
    for (const k of ['phone', 'nusach'] as const) { const ov = o[k]; if (ov != null && String(ov).trim() !== '' && m[k] !== ov) fail.push(`overwrote ${k} on ${id}`); }
    if (o.address && o.address.trim() !== '' && o.address !== o.cityId && m.address !== o.address) fail.push(`overwrote address on ${id}`);
  }
  const mergedSyn = merged.filter((p) => p.type === 'synagogue').length;
  const mergedMik = merged.filter((p) => p.type === 'mikveh').length;
  const mergedRest = merged.filter((p) => p.type === 'restaurant').length;
  const mergedArcgis = merged.filter((p) => typeof p.id === 'string' && p.id.startsWith('arcgis:')).length;
  if (mergedSyn !== beforeSyn + added.length) fail.push('synagogue count mismatch');
  if (mergedMik !== beforeMikveh) fail.push(`mikveh changed ${beforeMikveh}->${mergedMik}`);
  if (mergedRest !== beforeRest) fail.push(`restaurant changed ${beforeRest}->${mergedRest}`);
  if (mergedArcgis !== beforeArcgis + added.length) fail.push(`arcgis count mismatch (prior batches harmed?)`);
  if (fail.length) { console.error('❌ GATE FAILED — nothing written:\n  ' + fail.slice(0, 15).join('\n  ')); process.exit(1); }

  // ---- backup (idempotent) + write -----------------------------------------
  if (!existsSync(PLACES_BACKUP)) writeFileSync(PLACES_BACKUP, liveRaw, 'utf8');
  else if (readFileSync(PLACES_BACKUP, 'utf8') !== liveRaw) { console.error('❌ backup exists & differs — abort'); process.exit(1); }
  writeFileSync(PLACES, JSON.stringify(merged, null, 2), 'utf8');

  // ---- POST-WRITE validation (auto-restore on any failure) -----------------
  const back: string[] = [];
  const rb = JSON.parse(readFileSync(PLACES, 'utf8')) as LivePlace[];
  const t: Record<string, number> = {};
  for (const p of rb) t[p.type] = (t[p.type] || 0) + 1;
  const rbIds = rb.map((p) => p.id);
  if (rb.length !== beforeTotal + added.length) back.push('readback total mismatch');
  if (new Set(rbIds).size !== rbIds.length) back.push('readback duplicate ids');
  if (t.synagogue !== beforeSyn + added.length) back.push('readback synagogue mismatch');
  if (t.mikveh !== beforeMikveh) back.push('readback mikveh changed');
  if (t.restaurant !== beforeRest) back.push('readback restaurant changed');
  const rbNewCity = rb.filter((p) => addedIds.has(p.id) && !baseCityIds.has(p.cityId)).length;
  if (rbNewCity) back.push(`${rbNewCity} new cityId in readback`);
  if (back.length) {
    writeFileSync(PLACES, liveRaw, 'utf8'); // AUTO-RESTORE
    console.error('❌ POST-WRITE VALIDATION FAILED — live AUTO-RESTORED from backup:\n  ' + back.join('\n  '));
    process.exit(1);
  }

  mkdirSync(REPORTS, { recursive: true });
  writeFileSync(join(REPORTS, 'connect-held-conflicts.json'), JSON.stringify(heldConflicts, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'connect-held-over300.json'), JSON.stringify(heldOver300, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'connect-enriched.json'), JSON.stringify(enrichLog, null, 2), 'utf8');
  const summary = {
    batch: BATCH, held_modiin_ilit: 'no existing cityId — held this batch',
    cityIdUsed: Object.fromEntries(cityIdOf),
    beforeSynagogues: beforeSyn, addedNew: added.length, enrichedExisting: enrichLog.length,
    afterSynagogues: mergedSyn, heldConflicts: heldConflicts.length, heldOver300: heldOver300.length,
    beforeTotal, afterTotal: merged.length, deletions: 0,
    mikvehBefore: beforeMikveh, mikvehAfter: mergedMik, restaurantBefore: beforeRest, restaurantAfter: mergedRest,
    arcgisBefore: beforeArcgis, arcgisAfter: mergedArcgis, backupCreated: PLACES_BACKUP, citiesFileTouched: false,
  };
  writeFileSync(join(REPORTS, 'connect-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log('\n========== ArcGIS BATCH 3 — REAL MERGE (additive, gated) ==========');
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
}

main();
