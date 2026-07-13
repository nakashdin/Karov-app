/**
 * Phase 16c — ADDITIVE WRITE of the 25 Phase-16b open-source mikveh records
 * (OSM 24 + Tel Aviv GIS 1) into the local generated app dataset.
 *
 * Same safety contract as apply-tier-a.ts: BACKUP first, APPEND only (never
 * rebuild — that would delete 1619 council/gov records), recompute cities
 * additively, and THROW + restore on any reconciliation failure. Local generated
 * app data only; no external publish, no backlog records touched.
 *
 * Run:  node importers/mikvahs/apply-phase16-open.ts
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isInIsrael, isMain } from '../shared/utils.ts';
import type { Place } from '../../src/types/place.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const OUT = join(HERE, 'output');
const PLACES = join(GEN, 'places.osm.json');
const CITIES = join(GEN, 'cities.osm.json');
const PLACES_BAK = join(GEN, 'places.osm.pre-phase16-open.backup.json');
const CITIES_BAK = join(GEN, 'cities.osm.pre-phase16-open.backup.json');
const REPORT = join(OUT, 'phase16-open-apply-result.json');

const read = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const write = (p: string, d: unknown): void => writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');

function run(): void {
  const before = read<Place[]>(PLACES);
  const incoming = read<Place[]>(join(OUT, 'phase16-write-ready-preview.json'));

  // --- PRE-WRITE GATES (throw before touching disk) ---
  if (incoming.length !== 25) throw new Error(`expected 25 records, got ${incoming.length} — STOP`);
  const beforeIds = new Set(before.map((p) => p.id));
  const incIds = incoming.map((p) => p.id);
  if (new Set(incIds).size !== incoming.length) throw new Error('duplicate ids within the incoming batch — STOP');
  const collisions = incIds.filter((id) => beforeIds.has(id));
  if (collisions.length) throw new Error(`id collision with existing places (${collisions.length}): ${collisions.slice(0, 5)} — STOP`);
  for (const p of incoming) {
    if (p.type !== 'mikveh') throw new Error(`non-mikveh record: ${p.id} — STOP`);
    if (!p.location || !isInIsrael(p.location)) throw new Error(`invalid location: ${p.id} — STOP`);
    if (!p.name?.trim()) throw new Error(`missing name: ${p.id} — STOP`);
  }

  // --- BACKUP ---
  copyFileSync(PLACES, PLACES_BAK);
  copyFileSync(CITIES, CITIES_BAK);

  try {
    // --- ADDITIVE APPEND ---
    const after: Place[] = [...before, ...incoming];
    const counts: Record<string, number> = {};
    for (const p of after) if (p.cityId) counts[p.cityId] = (counts[p.cityId] ?? 0) + 1;
    const cities = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((name) => ({ id: name, name }));
    write(PLACES, after);
    write(CITIES, cities);

    // --- POST-WRITE VERIFICATION (re-read from disk) ---
    const verify = read<Place[]>(PLACES);
    const verIds = new Set(verify.map((p) => p.id));
    const errs: string[] = [];
    if (verify.length !== before.length + 25) errs.push(`count: ${before.length}+25 != ${verify.length}`);
    const added = [...verIds].filter((id) => !beforeIds.has(id));
    if (added.length !== 25) errs.push(`added ${added.length}, expected 25`);
    const lost = [...beforeIds].filter((id) => !verIds.has(id));
    if (lost.length) errs.push(`LOST ${lost.length} existing ids`);
    const afterById = new Map(verify.map((p) => [p.id, p]));
    let modified = 0;
    for (const p of before) if (JSON.stringify(afterById.get(p.id)) !== JSON.stringify(p)) modified++;
    if (modified) errs.push(`${modified} existing records modified`);
    const mikvehBefore = before.filter((p) => p.type === 'mikveh').length;
    const mikvehAfter = verify.filter((p) => p.type === 'mikveh').length;
    if (mikvehAfter !== mikvehBefore + 25) errs.push(`mikveh: ${mikvehBefore}+25 != ${mikvehAfter}`);
    if (mikvehBefore !== 531) errs.push(`expected 531 mikveh before, found ${mikvehBefore}`);
    if (errs.length) throw new Error('POST-WRITE VERIFICATION FAILED:\n - ' + errs.join('\n - '));

    const result = {
      status: 'SUCCESS',
      scope: '25 Phase-16b open-source mikveh records (OSM 24 + Tel Aviv GIS 1), additive append. Backlog records untouched. Local generated app data only; no publish.',
      backups: { places: PLACES_BAK, cities: CITIES_BAK },
      filesModified: ['src/data/generated/places.osm.json', 'src/data/generated/cities.osm.json'],
      counts: {
        placesBefore: before.length, placesAfter: verify.length, added: added.length,
        mikvehBefore, mikvehAfter, existingLost: lost.length, existingModified: modified,
      },
      bySource: { osm: incoming.filter((p) => p.source === 'osm').length, telAvivGis: incoming.filter((p) => p.source === 'seed').length },
      licenses: { osm: 'ODbL-1.0 (© OpenStreetMap contributors)', telAvivGis: 'municipal-open (Tel Aviv-Yafo Municipality GIS)' },
      reconciliation: `EXACT: places ${before.length}→${verify.length} (+25); mikveh ${mikvehBefore}→${mikvehAfter} (+25); 0 lost; 0 modified.`,
      rollback: [
        `copy ${PLACES_BAK} → ${PLACES}`,
        `copy ${CITIES_BAK} → ${CITIES}`,
        '(no code/schema change in this write — nothing else to revert)',
        'verify: places.osm.json returns to ' + before.length + ' records, mikveh to ' + mikvehBefore,
      ],
      dryRun: false, publishPerformed: false, additiveOnly: true, backlogTouched: false,
    };
    write(REPORT, result);
    console.log('=== Phase 16c WRITE — SUCCESS (additive) ===');
    console.log(`places: ${before.length} → ${verify.length} (+${added.length}) | mikveh: ${mikvehBefore} → ${mikvehAfter}`);
    console.log(`existing lost: ${lost.length} | existing modified: ${modified} | by source: OSM ${result.bySource.osm}, TLV ${result.bySource.telAvivGis}`);
    console.log(`backups: ${PLACES_BAK} , ${CITIES_BAK}`);
    console.log(`report: ${REPORT}`);
  } catch (e) {
    copyFileSync(PLACES_BAK, PLACES);
    copyFileSync(CITIES_BAK, CITIES);
    console.error('WRITE FAILED — restored from backup. No changes persisted.');
    throw e;
  }
}

if (isMain(import.meta.url)) run();
