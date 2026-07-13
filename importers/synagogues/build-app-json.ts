/**
 * TEST STEP ONLY — produce an app-ready Place JSON for synagogues.
 *
 * Reads the importer output, maps every record to the app's `Place` via
 * mapSynagogueToPlace, validates, and writes a SEPARATE file. It does NOT touch
 * the app: not the screens, not placesRepository, not src/types, and not the
 * existing dataset (places.osm.json). Nothing imports the result yet.
 *
 * Run:  node importers/synagogues/build-app-json.ts
 * In :  importers/synagogues/output/synagogues.json
 * Out:  importers/synagogues/output/places.synagogues.app.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Place } from '../../src/types/place.ts';
import type { SynagoguePlace } from '../shared/types.ts';
import { mapSynagogueToPlace } from '../shared/mapToAppPlace.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const INPUT_FILE = join(HERE, 'output', 'synagogues.json');
const OUTPUT_FILE = join(HERE, 'output', 'places.synagogues.app.json');

/** Is the latitude/longitude a real, finite coordinate? */
const finiteCoord = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Validate a mapped record as a usable app `Place`. Returns a reason or null. */
function invalidReason(p: Place): string | null {
  if (!p.id || !p.id.trim()) return 'missing id';
  if (!p.name || !p.name.trim()) return 'missing name';
  if (!p.location || !finiteCoord(p.location.latitude) || !finiteCoord(p.location.longitude)) {
    return 'missing location';
  }
  if (p.source !== 'osm') return `source is not "osm" (${p.source})`;
  if (!p.lastVerifiedAt) return 'missing lastVerifiedAt';
  return null;
}

function main(): void {
  const source = JSON.parse(readFileSync(INPUT_FILE, 'utf8')) as SynagoguePlace[];

  const mapped: Place[] = [];
  const rejected: { id: string; reason: string }[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const s of source) {
    let place: Place;
    try {
      place = mapSynagogueToPlace(s);
    } catch (e) {
      rejected.push({ id: s.sourceId, reason: `map error: ${(e as Error).message}` });
      continue;
    }

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

  // --- summary --------------------------------------------------------------
  console.log('\n========== build app-ready synagogues ==========');
  console.log(`נקראו (read)        : ${source.length}`);
  console.log(`הומרו (mapped OK)   : ${mapped.length}`);
  console.log(`נפסלו (rejected)    : ${rejected.length}`);
  console.log(`כפילויות (dup id)   : ${duplicates}`);
  if (rejected.length) console.log('rejection reasons   :', rejected.slice(0, 5));
  if (source[0]) {
    console.log('\n--- BEFORE (SynagoguePlace) ---');
    console.log(JSON.stringify(source[0], null, 2));
    console.log('\n--- AFTER (Place) ---');
    console.log(JSON.stringify(mapSynagogueToPlace(source[0]), null, 2));
  }
  console.log(`\nנכתב → ${OUTPUT_FILE}`);
}

main();
