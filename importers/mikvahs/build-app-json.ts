/**
 * STEPS 4-5 ONLY — map geocoded mikvahs to app-ready records.
 *
 * Reads mikvahs.geocoded.json, maps each via mapMikvahToPlace, validates, and
 * writes a SEPARATE app-ready file. It does NOT touch the app, PlaceType,
 * screens, the repository, or the live dataset. Nothing imports the result yet.
 *
 * Run:  node importers/mikvahs/build-app-json.ts
 * In :  importers/mikvahs/output/mikvahs.geocoded.json
 * Out:  importers/mikvahs/output/places.mikvahs.app.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppReadyMikvah, GeocodedMikvah } from '../shared/types.ts';
import { isInIsrael } from '../shared/utils.ts';
import { mapMikvahToPlace } from '../shared/mapMikvahToPlace.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = join(HERE, 'output', 'mikvahs.geocoded.json');
const OUTPUT_FILE = join(HERE, 'output', 'places.mikvahs.app.json');

const finiteCoord = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Validate a mapped record. Returns a reason string or null when valid. */
function invalidReason(p: AppReadyMikvah): string | null {
  if (!p.id || !p.id.trim()) return 'missing id';
  if (!p.name || !p.name.trim()) return 'missing name';
  if (!p.cityId || !p.cityId.trim()) return 'empty cityId';
  if (!p.location || !finiteCoord(p.location.latitude) || !finiteCoord(p.location.longitude)) {
    return 'invalid location';
  }
  if (!isInIsrael(p.location)) return 'location outside Israel';
  if (!p.phone) return 'missing phone';
  if (!p.openingHours) return 'missing openingHours';
  return null;
}

function main(): void {
  const input = JSON.parse(readFileSync(INPUT_FILE, 'utf8')) as GeocodedMikvah[];

  const mapped: AppReadyMikvah[] = [];
  const rejected: { id: string; reason: string }[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const m of input) {
    const place = mapMikvahToPlace(m);
    const reason = invalidReason(place);
    if (reason) {
      rejected.push({ id: place.id, reason });
    } else if (seen.has(place.id)) {
      duplicates++;
    } else {
      seen.add(place.id);
      mapped.push(place);
    }
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(mapped, null, 2), 'utf8');

  const addressLevel = mapped.filter((p) => p.locationPrecision === 'address').length;
  const cityLevel = mapped.filter((p) => p.locationPrecision === 'city').length;

  console.log('\n========== build app-ready mikvahs (steps 4-5) ==========');
  console.log(`קלט (input)            : ${input.length}`);
  console.log(`הומרו (app-ready)      : ${mapped.length}`);
  console.log(`  מדויק לפי כתובת      : ${addressLevel}`);
  console.log(`  משוער לפי עיר        : ${cityLevel}`);
  console.log(`נפסלו (rejected)       : ${rejected.length}`);
  console.log(`כפילויות id            : ${duplicates}`);
  if (rejected.length) console.log('rejection reasons      :', rejected.slice(0, 5));
  if (input[0]) {
    console.log('\n--- BEFORE (GeocodedMikvah) ---');
    console.log(JSON.stringify(input[0]));
    console.log('\n--- AFTER (AppReadyMikvah) ---');
    console.log(JSON.stringify(mapMikvahToPlace(input[0])));
  }
  console.log(`\nנכתב → ${OUTPUT_FILE}`);
}

main();
