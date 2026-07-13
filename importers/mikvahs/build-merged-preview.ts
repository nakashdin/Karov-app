/**
 * STEP 6 — PREVIEW ONLY. Merge the live dataset with the app-ready mikvahs into
 * a SEPARATE preview file. Does NOT overwrite places.osm.json, does NOT connect
 * to the app, and does NOT change PlaceType, screens, or the repository.
 * Nothing imports the result.
 *
 * Run:  node importers/mikvahs/build-merged-preview.ts
 * In :  src/data/generated/places.osm.json          (1590 synagogues + 346 restaurants)
 *       importers/mikvahs/output/places.mikvahs.app.json  (470 mikvahs)
 * Out:  importers/mikvahs/output/places.with-mikvahs.preview.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppReadyMikvah, GeoPoint } from '../shared/types.ts';
import type { Place } from '../../src/types/place.ts';

type AnyPlace = Place | AppReadyMikvah;

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const EXISTING_FILE = join(ROOT, 'src', 'data', 'generated', 'places.osm.json');
const MIKVAHS_FILE = join(HERE, 'output', 'places.mikvahs.app.json');
const OUTPUT_FILE = join(HERE, 'output', 'places.with-mikvahs.preview.json');

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const validLoc = (l: GeoPoint | undefined): boolean => !!l && finite(l.latitude) && finite(l.longitude);

function main(): void {
  const existing = JSON.parse(readFileSync(EXISTING_FILE, 'utf8')) as Place[];
  const mikvahs = JSON.parse(readFileSync(MIKVAHS_FILE, 'utf8')) as AppReadyMikvah[];

  const merged: AnyPlace[] = [...existing, ...mikvahs];
  writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2), 'utf8');

  // --- validation -----------------------------------------------------------
  const synagogues = merged.filter((p) => p.type === 'synagogue');
  const restaurants = merged.filter((p) => p.type === 'restaurant');
  const mik = merged.filter((p) => p.type === 'mikveh') as AppReadyMikvah[];

  const ids = merged.map((p) => p.id);
  const duplicates = ids.length - new Set(ids).size;
  const badLocation = merged.filter((p) => !validLoc(p.location)).length;
  const emptyCity = merged.filter((p) => !p.cityId || !p.cityId.trim()).length;
  const mikNoPhone = mik.filter((p) => !p.phone).length;
  const mikNoHours = mik.filter((p) => !p.openingHours).length;
  const addressLevel = mik.filter((p) => p.locationPrecision === 'address').length;
  const cityLevel = mik.filter((p) => p.locationPrecision === 'city').length;

  const check = (label: string, actual: number, expected: number) =>
    console.log(`${actual === expected ? '✅' : '❌'} ${label}: ${actual} (צפוי ${expected})`);

  console.log('\n========== preview merge validation (step 6) ==========');
  check('סה"כ רשומות', merged.length, 2406);
  check('בתי כנסת', synagogues.length, 1590);
  check('מסעדות', restaurants.length, 346);
  check('מקוואות', mik.length, 470);
  check('כפילויות id', duplicates, 0);
  check('location לא תקין', badLocation, 0);
  check('cityId ריק', emptyCity, 0);
  check('phone ריק במקוואות', mikNoPhone, 0);
  check('openingHours ריק במקוואות', mikNoHours, 0);
  console.log('------------------------------------------------------');
  console.log(`מקוואות מדויק לפי כתובת : ${addressLevel}`);
  console.log(`מקוואות משוער לפי עיר   : ${cityLevel}`);
  console.log(`נכתב (PREVIEW)         → ${OUTPUT_FILE}`);
}

main();
