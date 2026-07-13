/**
 * Phase 19–22 BATCH write — ADDITIVE append of the 81 accumulated write-ready
 * mikveh records into the local generated app dataset. Same safety contract as
 * apply-govmap-councils.ts: BACKUP first, APPEND only (NEVER rebuild), recompute
 * cities additively, THROW + restore on any reconciliation failure. No publish,
 * backlog untouched.
 *
 * Batch = phase19 (8: Beit Shemesh + Kiryat Gat) + phase20 (8: Ashdod) +
 *         phase21 (17: haredi councils) + phase22 (48: Tier-2 councils) = 81.
 *
 * Run:  node importers/mikvahs/apply-phase19-22-batch.ts
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
const PLACES_BAK = join(GEN, 'places.osm.pre-phase19-22.backup.json');
const CITIES_BAK = join(GEN, 'cities.osm.pre-phase19-22.backup.json');
const REPORT = join(OUT, 'phase19-22-apply-result.json');

const read = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const write = (p: string, d: unknown): void => writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');

const SOURCES = [
  { phase: 'phase19', file: 'phase19-write-ready-preview.json', expect: 8 },
  { phase: 'phase20', file: 'phase20-write-ready-preview.json', expect: 8 },
  { phase: 'phase21', file: 'phase21-write-ready-preview.json', expect: 17 },
  { phase: 'phase22', file: 'phase22-write-ready-preview.json', expect: 48 },
];
const EXPECTED = 81;
const EXPECTED_MIKVEH_BEFORE = 615;
const EXPECTED_PLACES_BEFORE = 5380;

const genderOf = (p: Place): string => {
  const s = `${p.mikvehGender ?? ''} ${p.name ?? ''}`;
  if (/כלים/.test(s)) return 'כלים';
  if (/גברים/.test(s)) return 'גברים';
  return 'נשים';
};

function run(): void {
  const before = read<Place[]>(PLACES);
  const citiesBefore = read<{ id: string; name: string }[]>(CITIES);

  // --- assemble the batch from the four write-ready previews ---
  const perPhase: { phase: string; records: Place[] }[] = [];
  const incoming: Place[] = [];
  for (const s of SOURCES) {
    const recs = read<Place[]>(join(OUT, s.file));
    if (recs.length !== s.expect) throw new Error(`${s.file}: expected ${s.expect}, got ${recs.length} — STOP`);
    perPhase.push({ phase: s.phase, records: recs });
    incoming.push(...recs);
  }

  // --- PRE-WRITE GATES ---
  if (incoming.length !== EXPECTED) throw new Error(`expected ${EXPECTED} records, got ${incoming.length} — STOP`);
  const beforeIds = new Set(before.map((p) => p.id));
  const incIds = incoming.map((p) => p.id);
  if (new Set(incIds).size !== incoming.length) throw new Error('duplicate ids within the incoming batch — STOP');
  const collisions = incIds.filter((id) => beforeIds.has(id));
  if (collisions.length) throw new Error(`id collision with existing places (${collisions.length}): ${collisions.slice(0, 10)} — STOP`);
  for (const p of incoming) {
    if (p.type !== 'mikveh') throw new Error(`non-mikveh record: ${p.id} — STOP`);
    if (!p.location || !isInIsrael(p.location)) throw new Error(`invalid location: ${p.id} — STOP`);
    if (!p.name?.trim()) throw new Error(`missing name: ${p.id} — STOP`);
    if (!(p.extra as any)?.provenance) throw new Error(`missing provenance: ${p.id} — STOP`);
  }
  const mikvehBefore = before.filter((p) => p.type === 'mikveh').length;
  if (before.length !== EXPECTED_PLACES_BEFORE) throw new Error(`expected ${EXPECTED_PLACES_BEFORE} places before, found ${before.length} — STOP`);
  if (mikvehBefore !== EXPECTED_MIKVEH_BEFORE) throw new Error(`expected ${EXPECTED_MIKVEH_BEFORE} mikveh before, found ${mikvehBefore} — STOP`);

  // --- BACKUP (places + cities) ---
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

    // --- POST-WRITE VERIFICATION (hard stop on any failure) ---
    const verify = read<Place[]>(PLACES);
    const verIds = new Set(verify.map((p) => p.id));
    const errs: string[] = [];
    if (verify.length !== before.length + EXPECTED) errs.push(`count: ${before.length}+${EXPECTED} != ${verify.length}`);
    const added = [...verIds].filter((id) => !beforeIds.has(id));
    if (added.length !== EXPECTED) errs.push(`added ${added.length}, expected ${EXPECTED}`);
    const lost = [...beforeIds].filter((id) => !verIds.has(id));
    if (lost.length) errs.push(`LOST ${lost.length} existing ids`);
    if (verIds.size !== verify.length) errs.push('duplicate ids in result');
    const afterById = new Map(verify.map((p) => [p.id, p]));
    let modified = 0;
    for (const p of before) if (JSON.stringify(afterById.get(p.id)) !== JSON.stringify(p)) modified++;
    if (modified) errs.push(`${modified} existing records modified`);
    const mikvehAfter = verify.filter((p) => p.type === 'mikveh').length;
    if (mikvehAfter !== mikvehBefore + EXPECTED) errs.push(`mikveh: ${mikvehBefore}+${EXPECTED} != ${mikvehAfter}`);
    // cities must be a strict superset of the prior city set (additive; none lost)
    const cityIdsAfter = new Set(cities.map((c) => c.id));
    const citiesLost = citiesBefore.filter((c) => !cityIdsAfter.has(c.id)).map((c) => c.id);
    if (citiesLost.length) errs.push(`cities LOST ${citiesLost.length}: ${citiesLost.slice(0, 10)}`);
    if (errs.length) throw new Error('POST-WRITE VERIFICATION FAILED:\n - ' + errs.join('\n - '));

    // --- SOURCE BREAKDOWN (after write) ---
    const byPhase = Object.fromEntries(perPhase.map((p) => [p.phase, p.records.length]));
    const byCity = incoming.reduce<Record<string, number>>((a, p) => { a[p.cityId] = (a[p.cityId] ?? 0) + 1; return a; }, {});
    const byGender = incoming.reduce<Record<string, number>>((a, p) => { const g = genderOf(p); a[g] = (a[g] ?? 0) + 1; return a; }, {});
    const byCoordSource = incoming.reduce<Record<string, number>>((a, p) => { const c = String((p.extra as any)?.coordSource ?? 'unknown'); a[c] = (a[c] ?? 0) + 1; return a; }, {});
    const newCities = cities.filter((c) => !citiesBefore.some((b) => b.id === c.id)).map((c) => c.id);

    const result = {
      status: 'SUCCESS',
      scope: '81 accumulated official-council mikveh records (Phase 19–22). Additive append. rebuildAppDataset NOT run. Backlog untouched. No publish. All provenance/source fields preserved.',
      backups: { places: PLACES_BAK, cities: CITIES_BAK },
      filesModified: ['src/data/generated/places.osm.json', 'src/data/generated/cities.osm.json'],
      counts: { placesBefore: before.length, placesAfter: verify.length, added: added.length, mikvehBefore, mikvehAfter, existingLost: lost.length, existingModified: modified, idCollisions: 0 },
      sourceBreakdown: { byPhase, byCity, byGender, byCoordSource },
      citiesAdded: newCities,
      reconciliation: `EXACT: places ${before.length}→${verify.length} (+${EXPECTED}); mikveh ${mikvehBefore}→${mikvehAfter} (+${EXPECTED}); 0 lost; 0 modified; 0 id collisions; ${citiesBefore.length}→${cities.length} cities (+${newCities.length}, 0 lost).`,
      rollback: [
        `copy "${PLACES_BAK}" → "${PLACES}"`,
        `copy "${CITIES_BAK}" → "${CITIES}"`,
        'do NOT run rebuildAppDataset',
        `verify: places returns to ${before.length}, mikveh to ${mikvehBefore}, cities to ${citiesBefore.length}`,
      ],
      dryRun: false, publishPerformed: false, additiveOnly: true, rebuildRun: false, backlogTouched: false,
    };
    write(REPORT, result);
    console.log('=== Phase 19–22 BATCH WRITE — SUCCESS (additive) ===');
    console.log(`places: ${before.length} → ${verify.length} (+${added.length}) | mikveh: ${mikvehBefore} → ${mikvehAfter}`);
    console.log(`existing lost: ${lost.length} | existing modified: ${modified} | id collisions: 0`);
    console.log(`cities: ${citiesBefore.length} → ${cities.length} (+${newCities.length}: ${newCities.join(', ') || 'none'})`);
    console.log(`byPhase: ${JSON.stringify(byPhase)}`);
    console.log(`backups: ${PLACES_BAK} , ${CITIES_BAK}`);
    console.log(`report: ${REPORT}`);
  } catch (e) {
    copyFileSync(PLACES_BAK, PLACES);
    copyFileSync(CITIES_BAK, CITIES);
    console.error('WRITE FAILED — restored places + cities from backup. No changes persisted.');
    throw e;
  }
}

if (isMain(import.meta.url)) run();
