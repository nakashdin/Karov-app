/**
 * Phase 13 — FIRST REAL WRITE (Tier A only): additively add the 61 write-ready
 * SabaiApps mikveh Place records to the local generated app dataset.
 *
 * SAFETY: this repo's council/gov data lives DIRECTLY in places.osm.json (not in
 * the category files), so a full rebuildAppDataset() would DELETE 1619 existing
 * records (470 gov mikvahs + 1149 council synagogues). We therefore APPEND
 * additively — never rebuild, never overwrite, never delete — matching the
 * established .precouncils/.premikveh backup pattern. Every gate is enforced;
 * the script THROWS (and restores) rather than leave an inconsistent dataset.
 *
 * Writes ONLY local generated app data + backups. No external publish.
 *
 * Run:  node importers/mikvahs/apply-tier-a.ts
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
const PLACES_BAK = join(GEN, 'places.osm.pre-council-mikveh.backup.json');
const CITIES_BAK = join(GEN, 'cities.osm.pre-council-mikveh.backup.json');
const REPORT = join(OUT, 'first-write-apply-result.json');

const read = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const write = (p: string, d: unknown): void => writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');

function run(): void {
  // 1) load
  const before = read<Place[]>(PLACES);
  const fw = read<{ records: { place: Place }[] }>(join(OUT, 'first-write-apply-preview.json'));
  const incoming = fw.records.map((r) => r.place);

  // 2) PRE-WRITE GATES (throw before touching disk if anything is off)
  if (incoming.length !== 61) throw new Error(`expected 61 Tier-A records, got ${incoming.length} — STOP`);
  const beforeIds = new Set(before.map((p) => p.id));
  const incomingIds = incoming.map((p) => p.id);
  if (new Set(incomingIds).size !== incoming.length) throw new Error('duplicate ids within the incoming batch — STOP');
  const collisions = incomingIds.filter((id) => beforeIds.has(id));
  if (collisions.length) throw new Error(`id collision with existing places (${collisions.length}): ${collisions.slice(0, 5)} — STOP`);
  for (const p of incoming) {
    if (p.type !== 'mikveh') throw new Error(`non-mikveh record in batch: ${p.id} — STOP`);
    if (!p.location || !isInIsrael(p.location)) throw new Error(`record without valid Israel location: ${p.id} — STOP`);
    if (!p.name?.trim() || !p.cityId?.trim()) throw new Error(`record missing name/cityId: ${p.id} — STOP`);
  }

  // 3) BACKUP (before any write)
  copyFileSync(PLACES, PLACES_BAK);
  copyFileSync(CITIES, CITIES_BAK);

  try {
    // 4) ADDITIVE APPEND — existing records untouched, 61 appended
    const after: Place[] = [...before, ...incoming];

    // 5) cities.osm.json — recompute additively from the FULL dataset (busiest first).
    //    This only ADDS mikveh-only cities; existing cities/counts are recomputed
    //    from the same records, never deleted.
    const counts: Record<string, number> = {};
    for (const p of after) if (p.cityId) counts[p.cityId] = (counts[p.cityId] ?? 0) + 1;
    const cities = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((name) => ({ id: name, name }));

    write(PLACES, after);
    write(CITIES, cities);

    // 6) POST-WRITE VERIFICATION (re-read from disk)
    const verify = read<Place[]>(PLACES);
    const verifyIds = new Set(verify.map((p) => p.id));
    const errs: string[] = [];

    if (verify.length !== before.length + 61) errs.push(`count mismatch: ${before.length}+61 != ${verify.length}`);
    const addedIds = [...verifyIds].filter((id) => !beforeIds.has(id));
    if (addedIds.length !== 61) errs.push(`added ${addedIds.length} ids, expected 61`);
    const lostIds = [...beforeIds].filter((id) => !verifyIds.has(id));
    if (lostIds.length) errs.push(`LOST ${lostIds.length} existing ids: ${lostIds.slice(0, 5)}`);
    // every existing record byte-identical (no overwrite of existing)
    const afterById = new Map(verify.map((p) => [p.id, p]));
    let changed = 0;
    for (const p of before) if (JSON.stringify(afterById.get(p.id)) !== JSON.stringify(p)) changed++;
    if (changed) errs.push(`${changed} existing records were modified`);
    // the 61 new: valid location + preserved optional fields
    const newRecs = verify.filter((p) => incomingIds.includes(p.id));
    if (newRecs.length !== 61) errs.push(`re-read found ${newRecs.length} new records, expected 61`);
    if (newRecs.some((p) => !p.location || !isInIsrael(p.location))) errs.push('a new record lacks a valid location');
    const preserved = {
      mikvehGender: newRecs.filter((p) => p.mikvehGender).length,
      attendant: newRecs.filter((p) => p.attendant).length,
      sourceUrl: newRecs.filter((p) => p.sourceUrl).length,
      sourceName: newRecs.filter((p) => p.sourceName).length,
      extra: newRecs.filter((p) => p.extra).length,
    };
    if (preserved.sourceUrl !== 61 || preserved.sourceName !== 61 || preserved.extra !== 61) errs.push('optional provenance fields not fully preserved');

    if (errs.length) throw new Error('POST-WRITE VERIFICATION FAILED:\n - ' + errs.join('\n - '));

    const mikvehAfter = verify.filter((p) => p.type === 'mikveh').length;
    const result = {
      status: 'SUCCESS',
      writtenAt: '(local generated app data only; no external publish)',
      backups: { places: PLACES_BAK, cities: CITIES_BAK },
      filesModified: ['src/data/generated/places.osm.json', 'src/data/generated/cities.osm.json', 'importers/shared/database.ts (APP_TYPES += mikveh)', 'src/types/place.ts (Phase 12, prior)'],
      counts: { placesBefore: before.length, placesAfter: verify.length, added: addedIds.length, mikvehBefore: before.filter((p) => p.type === 'mikveh').length, mikvehAfter, existingLost: lostIds.length, existingModified: changed },
      newRecordsPreservedFields: preserved,
      citiesBefore: read<unknown[]>(CITIES_BAK).length, citiesAfter: cities.length,
      reconciliation: 'EXACT: before + 61 = after; 0 existing lost; 0 existing modified.',
      rollback: [`copy ${PLACES_BAK} → ${PLACES}`, `copy ${CITIES_BAK} → ${CITIES}`, "revert database.ts APP_TYPES (remove 'mikveh')", '(src/types/place.ts change is additive/optional — safe to keep or revert)'],
      dryRun: false, publishPerformed: false, additiveOnly: true,
    };
    write(REPORT, result);
    console.log('=== Phase 13 FIRST WRITE — SUCCESS (additive) ===');
    console.log(`places: ${before.length} → ${verify.length} (+${addedIds.length}) | mikveh: ${result.counts.mikvehBefore} → ${mikvehAfter}`);
    console.log(`existing lost: ${lostIds.length} | existing modified: ${changed} | new valid-location: 61`);
    console.log(`preserved fields on new records: ${JSON.stringify(preserved)}`);
    console.log(`backups: ${PLACES_BAK} , ${CITIES_BAK}`);
    console.log(`report: ${REPORT}`);
  } catch (e) {
    // restore on ANY failure
    copyFileSync(PLACES_BAK, PLACES);
    copyFileSync(CITIES_BAK, CITIES);
    console.error('WRITE FAILED — restored from backup. No changes persisted.');
    throw e;
  }
}

if (isMain(import.meta.url)) run();
