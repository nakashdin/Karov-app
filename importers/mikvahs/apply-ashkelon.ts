/**
 * Ashkelon write — ADDITIVE append of the 4 Ashkelon mikveh records into the
 * local generated app dataset. Same safety contract as apply-phase18.ts: BACKUP
 * first, APPEND only (NEVER rebuild), recompute cities additively, THROW + restore
 * on any reconciliation failure. No publish, backlog untouched.
 *
 * Run:  node importers/mikvahs/apply-ashkelon.ts
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
const PLACES_BAK = join(GEN, 'places.osm.pre-ashkelon.backup.json');
const CITIES_BAK = join(GEN, 'cities.osm.pre-ashkelon.backup.json');
const REPORT = join(OUT, 'ashkelon-apply-result.json');

const read = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const write = (p: string, d: unknown): void => writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');

const EXPECTED = 4;
const EXPECTED_MIKVEH_BEFORE = 602;

function run(): void {
  const before = read<Place[]>(PLACES);
  const incoming = read<Place[]>(join(OUT, 'ashkelon-mikveh-write-ready-preview.json'));

  // --- PRE-WRITE GATES ---
  if (incoming.length !== EXPECTED) throw new Error(`expected ${EXPECTED} records, got ${incoming.length} — STOP`);
  const beforeIds = new Set(before.map((p) => p.id));
  const incIds = incoming.map((p) => p.id);
  if (new Set(incIds).size !== incoming.length) throw new Error('duplicate ids within the incoming batch — STOP');
  const collisions = incIds.filter((id) => beforeIds.has(id));
  if (collisions.length) throw new Error(`id collision with existing places (${collisions.length}): ${collisions} — STOP`);
  for (const p of incoming) {
    if (p.type !== 'mikveh') throw new Error(`non-mikveh record: ${p.id} — STOP`);
    if (!p.location || !isInIsrael(p.location)) throw new Error(`invalid location: ${p.id} — STOP`);
    if (!p.name?.trim()) throw new Error(`missing name: ${p.id} — STOP`);
  }
  const mikvehBefore = before.filter((p) => p.type === 'mikveh').length;
  if (mikvehBefore !== EXPECTED_MIKVEH_BEFORE) throw new Error(`expected ${EXPECTED_MIKVEH_BEFORE} mikveh before, found ${mikvehBefore} — STOP`);

  // --- BACKUP ---
  copyFileSync(PLACES, PLACES_BAK);
  copyFileSync(CITIES, CITIES_BAK);

  try {
    // --- ADDITIVE APPEND (never rebuild) ---
    const after: Place[] = [...before, ...incoming];
    const counts: Record<string, number> = {};
    for (const p of after) if (p.cityId) counts[p.cityId] = (counts[p.cityId] ?? 0) + 1;
    const cities = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((name) => ({ id: name, name }));
    write(PLACES, after);
    write(CITIES, cities);

    // --- POST-WRITE VERIFICATION ---
    const verify = read<Place[]>(PLACES);
    const verIds = new Set(verify.map((p) => p.id));
    const errs: string[] = [];
    if (verify.length !== before.length + EXPECTED) errs.push(`count: ${before.length}+${EXPECTED} != ${verify.length}`);
    const added = [...verIds].filter((id) => !beforeIds.has(id));
    if (added.length !== EXPECTED) errs.push(`added ${added.length}, expected ${EXPECTED}`);
    const lost = [...beforeIds].filter((id) => !verIds.has(id));
    if (lost.length) errs.push(`LOST ${lost.length} existing ids`);
    const afterById = new Map(verify.map((p) => [p.id, p]));
    let modified = 0;
    for (const p of before) if (JSON.stringify(afterById.get(p.id)) !== JSON.stringify(p)) modified++;
    if (modified) errs.push(`${modified} existing records modified`);
    const mikvehAfter = verify.filter((p) => p.type === 'mikveh').length;
    if (mikvehAfter !== mikvehBefore + EXPECTED) errs.push(`mikveh: ${mikvehBefore}+${EXPECTED} != ${mikvehAfter}`);
    if (errs.length) throw new Error('POST-WRITE VERIFICATION FAILED:\n - ' + errs.join('\n - '));

    const result = {
      status: 'SUCCESS',
      scope: '4 Ashkelon mikveh records (3 native Waze + 1 GovMap address geocode), additive append. rebuildAppDataset NOT run. Backlog untouched. No publish.',
      backups: { places: PLACES_BAK, cities: CITIES_BAK },
      filesModified: ['src/data/generated/places.osm.json', 'src/data/generated/cities.osm.json'],
      counts: { placesBefore: before.length, placesAfter: verify.length, added: added.length, mikvehBefore, mikvehAfter, existingLost: lost.length, existingModified: modified },
      added: incoming.map((p) => ({ id: p.id, name: p.name, precision: p.locationPrecision ?? 'native' })),
      license: 'council-public (המועצה הדתית אשקלון, mdas.org.il)',
      reconciliation: `EXACT: places ${before.length}→${verify.length} (+${EXPECTED}); mikveh ${mikvehBefore}→${mikvehAfter} (+${EXPECTED}); 0 lost; 0 modified.`,
      rollback: [`copy ${PLACES_BAK} → ${PLACES}`, `copy ${CITIES_BAK} → ${CITIES}`, 'do NOT run rebuildAppDataset', `verify: places returns to ${before.length}, mikveh to ${mikvehBefore}`],
      dryRun: false, publishPerformed: false, additiveOnly: true, rebuildRun: false, backlogTouched: false,
    };
    write(REPORT, result);
    console.log('=== Ashkelon WRITE — SUCCESS (additive) ===');
    console.log(`places: ${before.length} → ${verify.length} (+${added.length}) | mikveh: ${mikvehBefore} → ${mikvehAfter}`);
    console.log(`existing lost: ${lost.length} | existing modified: ${modified}`);
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
