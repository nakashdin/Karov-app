/**
 * Rebar kosher branches importer — REWRITTEN (Item 4 Unit 1, 2026-08-26).
 *
 * The old version of this file (git history: import-rebar.mjs pre-rewrite)
 * held a hand-typed array of 53 branches and stamped `kosherType: 'mehadrin'`
 * as an unconditional literal in buildPlace() — no fetch, no per-record
 * evidence, the same value on every single one. Its own header said the
 * list was "filtered by כשר label": a *kosher* label was transcribed as
 * *mehadrin*. See docs/KASHRUT_FACTS.md §5b/§22 for the full history.
 *
 * This version reads Rebar's own live store-locator feed (see
 * scripts/shared/rebar-feed.mjs for the fetch/parse/match core — shared
 * with the separate remediation step for the 53 existing records, so both
 * paths trust the same evidence through the same code, never a duplicate
 * copy of the parsing logic).
 *
 * SCOPE OF THIS SCRIPT: adds records for branches the feed marks
 * `kosher:true` that do NOT already match an existing rebar-* record
 * (by coordinate proximity — see rebar-feed.mjs). It does NOT touch any
 * existing record's fields; remediating the 53 already-present records
 * (many of which still carry the old fabricated kosherType:'mehadrin') is
 * a separate, gated step (Item 4 Unit 2), reviewed against this script's
 * own dry-run output first.
 *
 * Mapping — the evidence ceiling, and this importer is structurally
 * incapable of exceeding it (no kosherAuthority/certifiedBy field exists
 * anywhere in this file to accidentally set):
 *   kosher:true, no existing match  -> new record: kosherType:'kosher',
 *                                       kosherLevel:null, kosherAuthorityGroup:'unknown'
 *   kosher:true, matches existing   -> nothing written here (Unit 2's job)
 *   kosher:false                    -> nothing written, reported only
 *   kosher neither true nor false   -> nothing written, reported only (never guessed)
 *
 * Usage:
 *   node scripts/import-rebar.mjs             # dry-run + report (default)
 *   node scripts/import-rebar.mjs --apply      # writes, with backup
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordKashrutWrite } from './shared/kashrut-write.mjs';
import { fetchRebarStores, matchExistingRebar, MATCH_RADIUS_KM } from './shared/rebar-feed.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLACES_PATH = resolve(root, 'src/data/generated/places.osm.json');
const RESTAURANTS_PATH = resolve(root, 'src/data/generated/restaurants.osm.json');
const FEED_URL = 'https://rebar.co.il/our-stores/';
const TODAY = '2026-08-26';

const APPLY = process.argv.slice(2).includes('--apply');

const BASIS = {
  kind: 'human-review',
  note: 'rebar.co.il/our-stores/ store-locator feed: kosher:true for this branch. Feed has no level/authority ' +
    'field anywhere in its key union — verified against the full union across every entry, not a sample.',
};

function readNoBom(p) {
  const buf = readFileSync(p);
  const s = (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) ? buf.slice(3) : buf;
  return JSON.parse(s.toString('utf8'));
}
function writeNoBom(p, data) {
  const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}

function makeId(name) {
  const hash = createHash('md5').update(name).digest('hex').slice(0, 8);
  return `rebar-${hash}`;
}

function buildNewPlace(store) {
  const place = {
    id: makeId(store.name),
    name: `רי בר rebar ${store.name}`,
    type: 'juice_bar',
    category: 'dairy',
    cityId: store.city,
    address: store.address,
    location: { latitude: store.lat, longitude: store.lng },
    locationPrecision: 'exact',
    website: 'https://rebar.co.il',
    instagram: 'https://www.instagram.com/rebarisrael/',
    source: 'manual',
    sourceUrl: FEED_URL,
    lastVerifiedAt: TODAY,
  };
  recordKashrutWrite(place, 'kosherType', 'kosher', BASIS);
  recordKashrutWrite(place, 'kosherLevel', null, BASIS);
  recordKashrutWrite(place, 'kosherAuthorityGroup', 'unknown', BASIS);
  return place;
}

console.log(`=== Rebar import — ${APPLY ? 'APPLY' : 'DRY RUN'} ===\n`);

const places = readNoBom(PLACES_PATH);
const existingRebar = places.filter((p) => typeof p.id === 'string' && p.id.startsWith('rebar-'));
console.log(`Existing rebar-* records in places.osm.json: ${existingRebar.length}`);

let stores;
try {
  stores = await fetchRebarStores();
} catch (err) {
  console.error(`✗ fetch failed: ${err.message}`);
  process.exit(1);
}
console.log(`Feed entries parsed: ${stores.length}\n`);

const toAdd = [];
const matched = [];
const kosherFalse = [];
const ambiguousKosher = [];

for (const store of stores) {
  if (store.kosher === true) {
    const m = matchExistingRebar(store, existingRebar);
    if (m) matched.push({ store, existingId: m.matched.id, distanceKm: m.distanceKm });
    else toAdd.push(store);
  } else if (store.kosher === false) {
    kosherFalse.push(store);
  } else {
    ambiguousKosher.push(store);
  }
}

const matchedExistingIds = new Set(matched.map((m) => m.existingId));
const unmatchedExisting = existingRebar.filter((r) => !matchedExistingIds.has(r.id));

console.log('--- Summary ---');
console.log(`  kosher:true,  matched to an existing record (Unit 2's job, not written here): ${matched.length}`);
console.log(`  kosher:true,  NO existing match within ${MATCH_RADIUS_KM}km -> NEW record      : ${toAdd.length}`);
console.log(`  kosher:false (not written, not deleted, reported only)                        : ${kosherFalse.length}`);
console.log(`  kosher neither true nor false (not written, reported only, never guessed)      : ${ambiguousKosher.length}`);
console.log(`  existing rebar-* records with NO feed match at all (closed? renamed? investigate): ${unmatchedExisting.length}`);

if (toAdd.length) {
  console.log('\n--- NEW records (kosher:true, no existing match) ---');
  for (const s of toAdd) console.log(`  ${makeId(s.name)}: ${s.name} | ${s.address}, ${s.city} | (${s.lat}, ${s.lng})`);
}
if (ambiguousKosher.length) {
  console.log('\n--- AMBIGUOUS kosher field (neither true nor false) ---');
  for (const s of ambiguousKosher) console.log(`  ${s.name}: kosher=${JSON.stringify(s.kosher)}`);
}
if (unmatchedExisting.length) {
  console.log('\n--- Existing rebar-* records with NO feed match at all ---');
  for (const r of unmatchedExisting) console.log(`  ${r.id}: ${r.name} | ${r.address}`);
}
if (kosherFalse.length) {
  console.log('\n--- kosher:false in feed (for visibility only, never written) ---');
  for (const s of kosherFalse) console.log(`  ${s.name} | ${s.address}, ${s.city}`);
}

if (!APPLY) {
  console.log('\n(dry run — nothing written. Re-run with --apply to add the NEW records listed above.)\n');
  process.exit(0);
}

if (toAdd.length === 0) {
  console.log('\nNothing to add.\n');
  process.exit(0);
}

const newPlaces = toAdd.map(buildNewPlace);

const backupDir = join(root, 'data-backups', 'import-rebar');
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
copyFileSync(PLACES_PATH, join(backupDir, `places.osm.${stamp}.json`));
copyFileSync(RESTAURANTS_PATH, join(backupDir, `restaurants.osm.${stamp}.json`));

const placesOut = [...places, ...newPlaces];
writeNoBom(PLACES_PATH, placesOut);

const restaurants = readNoBom(RESTAURANTS_PATH);
const existingRestaurantIds = new Set(restaurants.map((r) => r.id));
const newForRestaurants = newPlaces.filter((p) => !existingRestaurantIds.has(p.id));
writeNoBom(RESTAURANTS_PATH, [...restaurants, ...newForRestaurants]);

console.log(`\n✓ added ${newPlaces.length} new record(s) to places.osm.json, ${newForRestaurants.length} to restaurants.osm.json.`);
console.log(`  backup: ${backupDir}\n`);
