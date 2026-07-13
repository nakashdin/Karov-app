/**
 * TEST / PREVIEW ONLY — build a merged dataset without touching anything live.
 *
 * Takes the app's current dataset, swaps OUT the old synagogues, keeps ALL the
 * existing restaurants, adds IN the freshly-mapped synagogues, and writes a
 * SEPARATE preview file. It does NOT overwrite places.osm.json, does NOT connect
 * to the app, and does NOT change placesRepository or any screen. Nothing
 * imports the result.
 *
 * Run:  node importers/synagogues/build-merged-preview.ts
 * In :  src/data/generated/places.osm.json
 *       importers/synagogues/output/places.synagogues.app.json
 * Out:  importers/synagogues/output/places.osm.merged.preview.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Place } from '../../src/types/place.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const EXISTING_FILE = join(ROOT, 'src', 'data', 'generated', 'places.osm.json');
const NEW_SYNAGOGUES_FILE = join(HERE, 'output', 'places.synagogues.app.json');
const OUTPUT_FILE = join(HERE, 'output', 'places.osm.merged.preview.json');

const finiteCoord = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function main(): void {
  const existing = JSON.parse(readFileSync(EXISTING_FILE, 'utf8')) as Place[];
  const newSynagogues = JSON.parse(readFileSync(NEW_SYNAGOGUES_FILE, 'utf8')) as Place[];

  const oldSynagogues = existing.filter((p) => p.type === 'synagogue');
  const restaurants = existing.filter((p) => p.type === 'restaurant');
  const other = existing.filter((p) => p.type !== 'synagogue' && p.type !== 'restaurant');

  // Keep restaurants + any other types, replace synagogues with the new set.
  const merged: Place[] = [...restaurants, ...other, ...newSynagogues];

  writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2), 'utf8');

  // --- validation -----------------------------------------------------------
  const synagogues = merged.filter((p) => p.type === 'synagogue');
  const mergedRest = merged.filter((p) => p.type === 'restaurant');
  const ids = merged.map((p) => p.id);
  const duplicates = ids.length - new Set(ids).size;
  const badLocation = merged.filter((p) => !p.location || !finiteCoord(p.location.latitude) || !finiteCoord(p.location.longitude)).length;
  const emptyCity = merged.filter((p) => !p.cityId || !p.cityId.trim()).length;
  const badSource = merged.filter((p) => p.source !== 'osm').length;
  const emptySynAddress = synagogues.filter((p) => !p.address || !p.address.trim()).length;

  const check = (label: string, actual: number, expected: number) =>
    console.log(`${actual === expected ? '✅' : '❌'} ${label}: ${actual} (צפוי ${expected})`);

  console.log('\n========== merged preview validation ==========');
  check('סה"כ רשומות', merged.length, 1936);
  check('בתי כנסת', synagogues.length, 1590);
  check('מסעדות', mergedRest.length, 346);
  check('כפילויות id', duplicates, 0);
  check('location לא תקין', badLocation, 0);
  check('cityId ריק', emptyCity, 0);
  check('source != osm', badSource, 0);
  check('address ריק בבתי כנסת', emptySynAddress, 0);
  console.log('----------------------------------------------');
  console.log(`בתי כנסת שהוחלפו : ${oldSynagogues.length} → ${newSynagogues.length}`);
  console.log(`מסעדות שנשמרו     : ${restaurants.length}`);
  console.log(`נכתב (PREVIEW)    → ${OUTPUT_FILE}`);
}

main();
