/**
 * Resolve our places through Waze and adopt its coordinates.
 *
 * Waze is the navigation app most drivers here use, and it resolves Israeli
 * businesses by name better than the coordinates we hold — ours come from
 * kashrut registries, which frequently give the village centre rather than
 * the venue. Searching Waze for "<business name>, <city>" returns the venue's
 * real street address and point, so adopting it makes Waze, Google Maps and
 * Apple Maps all route to the same, correct place.
 *
 * Note what Waze returns: the `name` field holds the resolved ADDRESS
 * ("Maskit St 32, Herzliya"), not the business name. So a result is validated
 * by geography and by house number, not by name similarity.
 *
 * A result is accepted only when it is within --max-jump of where we already
 * think the place is. When our address carries a house number, the number must
 * also agree; anything else is written to the report as `needs-review` and is
 * never applied automatically.
 *
 * Usage:
 *   node scripts/waze-sync-coords.mjs --filter tzohar --dry
 *   node scripts/waze-sync-coords.mjs --filter tzohar
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');
const PLACES = path.join(ROOT, 'src/data/generated/places.osm.json');
const REPORT = path.join(__dir, 'waze-sync-report.json');

const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const DRY = args.includes('--dry');
const FILTER = arg('--filter', 'tzohar');
const MAX_JUMP = +arg('--max-jump', 2500);  // metres — refuse anything further
const MIN_MOVE = +arg('--min-move', 20);    // metres — ignore trivial nudges
const DELAY = +arg('--delay', 1000);
const LOOSE_JUMP = +arg('--loose-jump', 300); // beyond this, demand a house number

const sleep = ms => new Promise(r => setTimeout(r, ms));
const dist = (a, b, c, d) => {
  const R = 6371000, r = Math.PI / 180;
  return R * Math.hypot((d - b) * r * Math.cos((a + c) / 2 * r), (c - a) * r);
};

/** House number as written in an address string, if there is one. */
const houseNumber = s => (String(s || '').match(/(?:^|[\s,])(\d{1,4})(?:[\s,]|$)/) || [])[1] ?? null;

const words = s => new Set(
  String(s || '').replace(/[^֐-׿a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/).filter(w => w.length > 2).map(w => w.toLowerCase())
);

/**
 * Waze usually answers with an address, but for a venue it knows by name it
 * answers with the name itself ("חממת הסחלבים, Ma'ale HaHamisha"). That is the
 * strongest confirmation available, so it overrides the distance heuristics.
 */
function labelNamesTheVenue(placeName, label) {
  const wa = words(placeName), wb = words(label);
  if (!wa.size) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared >= Math.min(2, wa.size);
}

async function wazeSearch(query, lat, lon) {
  const url = `https://www.waze.com/SearchServer/mozi?q=${encodeURIComponent(query)}`
            + `&lang=heb&origin=livemap&lon=${lon}&lat=${lat}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

/**
 * Where Waze lands when it is given only the city name.
 *
 * When Waze cannot find a business it quietly falls back to the town centre,
 * and adopting that point would be worse than the coordinates we already hold.
 * Resolving each city once lets us recognise and discard those fallbacks.
 */
const cityPoints = new Map();
async function cityPoint(city, lat, lon) {
  if (!city) return null;
  if (cityPoints.has(city)) return cityPoints.get(city);
  let pt = null;
  try {
    const r = (await wazeSearch(city, lat, lon)).find(x => x.location);
    if (r) pt = { lat: r.location.lat, lon: r.location.lon };
  } catch { /* leave null — we simply lose the guard for this city */ }
  cityPoints.set(city, pt);
  await sleep(DELAY);
  return pt;
}

const places = JSON.parse(readFileSync(PLACES, 'utf8'));
const targets = places.filter(p =>
  p.location && (FILTER === 'all' || (FILTER === 'tzohar' && p.certifiedBy === 'צהר'))
);

console.log(`resolving ${targets.length} places through Waze${DRY ? ' (dry run)' : ''}\n`);

const rows = [];
const tally = { moved: 0, accurate: 0, review: 0, none: 0, failed: 0, fallback: 0 };

for (const p of targets) {
  const { latitude: lat, longitude: lon } = p.location;
  const query = [p.name, p.cityId].filter(Boolean).join(', ');
  const row = { id: p.id, name: p.name, city: p.cityId, address: p.address, from: { lat, lon } };

  let results = [];
  try {
    results = await wazeSearch(query, lat, lon);
  } catch (e) {
    row.action = 'failed'; row.error = e.message; tally.failed++;
    rows.push(row); await sleep(DELAY); continue;
  }

  const hit = results
    .filter(r => r.location)
    .map(r => ({
      lat: r.location.lat, lon: r.location.lon,
      label: r.businessName || r.name || '',
      d: Math.round(dist(lat, lon, r.location.lat, r.location.lon)),
    }))
    .filter(r => r.d <= MAX_JUMP)
    .sort((a, b) => a.d - b.d)[0];

  if (!hit) {
    row.action = 'no-match'; tally.none++;
    rows.push(row); await sleep(DELAY); continue;
  }

  row.waze = hit;

  // Discard the town-centre fallback: if Waze puts the business where it puts
  // the bare city name, it did not actually find the business.
  const cp = await cityPoint(p.cityId, lat, lon);
  if (cp && dist(hit.lat, hit.lon, cp.lat, cp.lon) < 60) {
    row.action = 'city-fallback';
    row.reason = 'Waze returned the town centre, not the venue';
    tally.fallback++;
    rows.push(row); await sleep(DELAY); continue;
  }

  const ours = houseNumber(p.address);
  const theirs = houseNumber(hit.label);
  // A house-number disagreement means Waze resolved a different address.
  if (ours && theirs && ours !== theirs) {
    row.action = 'needs-review';
    row.reason = `house number ${ours} (ours) vs ${theirs} (waze)`;
    tally.review++;
    console.log(`  ? ${p.name} (${p.cityId}) — ${row.reason}`);
  } else if (hit.d > LOOSE_JUMP && !theirs && !labelNamesTheVenue(p.name, hit.label)) {
    // A long move onto a label with no street number ("Tel Yitzhak", "פטרול")
    // is the shape of a bad resolution. Report it rather than trust it.
    row.action = 'needs-review';
    row.reason = `${hit.d}m move onto an unspecific result ("${hit.label}")`;
    tally.review++;
    console.log(`  ? ${p.name} (${p.cityId}) — ${row.reason}`);
  } else if (hit.d < MIN_MOVE) {
    row.action = 'already-accurate'; tally.accurate++;
  } else {
    row.action = 'move'; tally.moved++;
    if (!DRY) {
      p.location = { latitude: hit.lat, longitude: hit.lon };
      p.locationPrecision = 'exact';
      p.locationSource = 'waze';
      // Waze knows the street and number where our registry address did not.
      if (!ours && theirs) row.suggestedAddress = hit.label;
    }
    console.log(`  → ${String(hit.d).padStart(5)}m  ${p.name} (${p.cityId})  ⇢  ${hit.label}`);
  }

  rows.push(row);
  await sleep(DELAY);
}

if (!DRY) writeFileSync(PLACES, JSON.stringify(places), 'utf8');
writeFileSync(REPORT, JSON.stringify(rows, null, 2), 'utf8');

console.log(`\n=== Waze coordinate sync ===`);
console.log(`checked          : ${targets.length}`);
console.log(`moved (>=${MIN_MOVE}m)   : ${tally.moved}`);
console.log(`already accurate : ${tally.accurate}`);
console.log(`needs review     : ${tally.review}`);
console.log(`town-centre fallback: ${tally.fallback}`);
console.log(`Waze has no match: ${tally.none}`);
console.log(`request failed   : ${tally.failed}`);
console.log(DRY ? '\n(dry run — nothing written)' : `\nwritten to ${path.relative(ROOT, PLACES)}`);
console.log(`report: ${path.relative(ROOT, REPORT)}`);
