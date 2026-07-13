/**
 * REAL MERGE — Modi'in Ilit (one-off): a legitimate NEW city. Authorized
 * exception to add ONE new cityId "מודיעין עילית" + update cities.osm.json.
 *
 * Fresh backups (places + cities) → gate → write places + update cities →
 * post-write validation (auto-restore BOTH files on any failure). Additive-only,
 * 0 deletions, fill-empty-only, conflicts/over300 held, exactly one new cityId.
 *
 * Run:  node importers/arcgis/connect-modiin-illit.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { City, Place } from '../../src/types/place.ts';
import type { NormalizedImportRecord } from '../unified/schema/normalized-record.ts';
import { isInIsrael } from '../shared/utils.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const REPORTS = join(OUT, 'modiin-illit-reports');
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const PLACES = join(GEN, 'places.osm.json');
const CITIES = join(GEN, 'cities.osm.json');
const PLACES_BACKUP = join(GEN, 'places.osm.pre-arcgis-modiin-illit.backup.json');
const CITIES_BACKUP = join(GEN, 'cities.osm.pre-arcgis-modiin-illit.backup.json');

const SRC = 'modiin-ilit';
const NEW_CITY = 'מודיעין עילית';

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

function recordToPlace(r: NormalizedImportRecord): LivePlace {
  const p: LivePlace = {
    id: r.id, name: r.name, type: 'synagogue', cityId: NEW_CITY,
    address: r.address ?? NEW_CITY, location: r.location!,
    lastVerifiedAt: r.provenance.fetchedAt.slice(0, 10),
    provenance: { source: r.provenance.sourceId, by: 'arcgis-municipal', sourceUrl: r.provenance.sourceUrl },
  };
  if (r.phone) p.phone = r.phone;
  if (r.nusach) p.nusach = r.nusach;
  return p;
}

function main(): void {
  const placesRaw = readFileSync(PLACES, 'utf8');
  const citiesRaw = readFileSync(CITIES, 'utf8');
  const live = JSON.parse(placesRaw) as Place[];
  const cities = JSON.parse(citiesRaw) as City[];
  const beforeTotal = live.length;
  const beforeSyn = live.filter((p) => p.type === 'synagogue').length;
  const beforeMikveh = live.filter((p) => p.type === 'mikveh').length;
  const beforeRest = live.filter((p) => p.type === 'restaurant').length;
  const beforeArcgis = live.filter((p) => typeof p.id === 'string' && p.id.startsWith('arcgis:')).length;
  const beforeIds = new Set(live.map((p) => p.id));
  const baseCityIds = new Set(live.map((p) => p.cityId).filter(Boolean));
  const originalById = new Map<string, Place>(live.map((p) => [p.id, p]));
  const synagogues = live.filter((p) => p.type === 'synagogue');

  const recs = JSON.parse(readFileSync(join(OUT, SRC, `${SRC}.normalized.json`), 'utf8')) as NormalizedImportRecord[];

  const byId = new Map<string, LivePlace>(live.map((p) => [p.id, { ...p }]));
  const enrichedOf = new Set<string>();
  const added: LivePlace[] = [];
  const enrichLog: unknown[] = [];
  const heldConflicts: unknown[] = [];
  const heldOver300: unknown[] = [];

  for (const r of recs) {
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
      enrichLog.push({ existingId: best.e.id, fields, distanceM: Math.round(best.d) });
    } else if (isConflict && best) {
      heldConflicts.push({ sourceRecordId: r.provenance.sourceRecordId, name: r.name, existingId: best.e.id, existingName: best.e.name, distanceM: Math.round(best.d), nameSim: Number(best.sim.toFixed(2)) });
    } else if (isOver300 && best) {
      heldOver300.push({ sourceRecordId: r.provenance.sourceRecordId, name: r.name, existingName: best.e.name, distanceM: Math.round(best.d), nameSim: Number(best.sim.toFixed(2)) });
    } else {
      added.push(recordToPlace(r));
    }
  }

  const merged: LivePlace[] = [...byId.values(), ...added];

  // ---- GATE (pre-write) ----------------------------------------------------
  const fail: string[] = [];
  const mergedIds = new Set(merged.map((p) => p.id));
  for (const id of beforeIds) if (!mergedIds.has(id)) fail.push(`DELETED existing id ${id}`);
  if (merged.length !== beforeTotal + added.length) fail.push('count mismatch');
  if (mergedIds.size !== merged.length) fail.push('duplicate id in merged set');
  const addedIds = new Set<string>();
  const addedCityIds = new Set<string>();
  for (const a of added) {
    if (!a.name?.trim()) fail.push(`new without name ${a.id}`);
    if (!a.location || !isInIsrael(a.location)) fail.push(`new bad coords ${a.id}`);
    if (a.phone === '0') fail.push(`phone="0" on ${a.id}`);
    if (beforeIds.has(a.id)) fail.push(`new id collides ${a.id}`);
    if (addedIds.has(a.id)) fail.push(`duplicate new id ${a.id}`);
    addedIds.add(a.id); addedCityIds.add(a.cityId);
  }
  // exactly one new cityId, and it is NEW_CITY (the authorized exception)
  if (addedCityIds.size !== 1 || !addedCityIds.has(NEW_CITY)) fail.push(`added cityIds not exactly {${NEW_CITY}}: ${[...addedCityIds].join(',')}`);
  if (baseCityIds.has(NEW_CITY)) fail.push(`${NEW_CITY} already exists — not a new city`);
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
  if (mergedMik !== beforeMikveh) fail.push(`mikveh changed`);
  if (mergedRest !== beforeRest) fail.push(`restaurant changed`);
  if (mergedArcgis !== beforeArcgis + added.length) fail.push('arcgis count mismatch (prior harmed?)');
  if (fail.length) { console.error('❌ GATE FAILED — nothing written:\n  ' + fail.slice(0, 15).join('\n  ')); process.exit(1); }

  // ---- backups (idempotent) ------------------------------------------------
  for (const [bp, raw] of [[PLACES_BACKUP, placesRaw], [CITIES_BACKUP, citiesRaw]] as const) {
    if (!existsSync(bp)) writeFileSync(bp, raw, 'utf8');
    else if (readFileSync(bp, 'utf8') !== raw) { console.error(`❌ backup ${bp} exists & differs — abort`); process.exit(1); }
  }

  // ---- write places + update cities ----------------------------------------
  const newCities: City[] = cities.some((c) => c.id === NEW_CITY || c.name === NEW_CITY)
    ? cities
    : [...cities, { id: NEW_CITY, name: NEW_CITY }];
  writeFileSync(PLACES, JSON.stringify(merged, null, 2), 'utf8');
  writeFileSync(CITIES, JSON.stringify(newCities, null, 2), 'utf8');

  // ---- POST-WRITE validation (auto-restore BOTH on any failure) ------------
  const back: string[] = [];
  const rb = JSON.parse(readFileSync(PLACES, 'utf8')) as LivePlace[];
  const rc = JSON.parse(readFileSync(CITIES, 'utf8')) as City[];
  const tt: Record<string, number> = {};
  for (const p of rb) tt[p.type] = (tt[p.type] || 0) + 1;
  const rbIds = rb.map((p) => p.id);
  if (rb.length !== beforeTotal + added.length) back.push('readback total mismatch');
  if (new Set(rbIds).size !== rbIds.length) back.push('readback duplicate ids');
  if (tt.synagogue !== beforeSyn + added.length) back.push('readback synagogue mismatch');
  if (tt.mikveh !== beforeMikveh) back.push('readback mikveh changed');
  if (tt.restaurant !== beforeRest) back.push('readback restaurant changed');
  if (rb.some((p) => p.phone === '0')) back.push('readback phone="0"');
  if (rb.some((p) => !isInIsrael(p.location))) back.push('readback coords outside Israel');
  // only the records WE added (pre-existing "" cityIds on OSM rows are not ours)
  const rbNewCityIds = [...new Set(rb.filter((p) => addedIds.has(p.id)).map((p) => p.cityId).filter((c) => !baseCityIds.has(c)))];
  if (rbNewCityIds.length !== 1 || rbNewCityIds[0] !== NEW_CITY) back.push(`readback new cityIds != {${NEW_CITY}}: ${rbNewCityIds.join(',')}`);
  if (!rc.some((c) => c.id === NEW_CITY)) back.push('cities.osm.json missing new city');
  if (rc.length !== cities.length + 1) back.push('cities.osm.json length unexpected');
  if (back.length) {
    writeFileSync(PLACES, placesRaw, 'utf8'); // AUTO-RESTORE both
    writeFileSync(CITIES, citiesRaw, 'utf8');
    console.error('❌ POST-WRITE VALIDATION FAILED — places + cities AUTO-RESTORED:\n  ' + back.join('\n  '));
    process.exit(1);
  }

  mkdirSync(REPORTS, { recursive: true });
  writeFileSync(join(REPORTS, 'connect-held-conflicts.json'), JSON.stringify(heldConflicts, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'connect-held-over300.json'), JSON.stringify(heldOver300, null, 2), 'utf8');
  const summary = {
    city: NEW_CITY, cityId: NEW_CITY,
    beforeSynagogues: beforeSyn, addedNew: added.length, enrichedExisting: enrichLog.length,
    afterSynagogues: mergedSyn, heldConflicts: heldConflicts.length, heldOver300: heldOver300.length,
    beforeTotal, afterTotal: merged.length, deletions: 0,
    mikvehBefore: beforeMikveh, mikvehAfter: mergedMik, restaurantBefore: beforeRest, restaurantAfter: mergedRest,
    arcgisBefore: beforeArcgis, arcgisAfter: mergedArcgis,
    citiesBefore: cities.length, citiesAfter: newCities.length, citiesFileTouched: true,
    placesBackup: PLACES_BACKUP, citiesBackup: CITIES_BACKUP,
  };
  writeFileSync(join(REPORTS, 'connect-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log('\n========== ArcGIS — Modi\'in Ilit MERGE (additive, gated) ==========');
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
}

main();
