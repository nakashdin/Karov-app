/**
 * Resolve our places through Waze and adopt its coordinates.
 *
 * Waze is what drivers here actually use, and it resolves Israeli addresses
 * and businesses far better than the coordinates we hold — many of ours are a
 * city-centre placeholder. 520 places sit stacked on 163 shared points; 51
 * Tel Aviv branches share one coordinate despite having distinct street
 * addresses.
 *
 * Two queries are tried per place, in order:
 *
 *   1. the street address ("אביזוהר 8, ירושלים") — the only query that can
 *      separate branches of a chain, since they all share a name
 *   2. the business name ("קפה חממת הסחלבים, מעלה החמישה") — for venues with
 *      no house number, where Waze knows the place but not an address
 *
 * What Waze returns in `name` is the resolved ADDRESS, not the business name,
 * so results are validated by house number and geography rather than by name.
 *
 * Acceptance:
 *   - an address query whose house number and city match ours is trusted at
 *     any distance: it is the address, wherever our placeholder happened to be
 *   - a name query must land within --max-jump, and beyond --loose-jump it
 *     must carry a house number or name the venue itself
 *   - anything matching where Waze puts the bare city name is a town-centre
 *     fallback and is discarded
 *
 * Everything else goes to the report as needs-review, never applied blind.
 *
 * Usage:
 *   node scripts/waze-sync-coords.mjs --filter food --dry
 *   node scripts/waze-sync-coords.mjs --filter food --resume
 *   node scripts/waze-sync-coords.mjs --filter stacked      # only shared coords
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
const RESUME = args.includes('--resume');
const FILTER = arg('--filter', 'tzohar');
const MAX_JUMP = +arg('--max-jump', 2500);
const LOOSE_JUMP = +arg('--loose-jump', 300);
const MIN_MOVE = +arg('--min-move', 20);
const CITY_JUMP = +arg('--city-jump', 30000);   // ceiling even for address matches
const CITY_RADIUS = +arg('--city-radius', 12000); // max distance from the town centre
const DELAY = +arg('--delay', 700);
const SAVE_EVERY = +arg('--save-every', 50);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const dist = (a, b, c, d) => {
  const R = 6371000, r = Math.PI / 180;
  return R * Math.hypot((d - b) * r * Math.cos((a + c) / 2 * r), (c - a) * r);
};

const houseNumber = s => (String(s || '').match(/(?:^|[\s,])(\d{1,4})(?:[\s,/]|$)/) || [])[1] ?? null;

const words = s => new Set(
  String(s || '').replace(/[^֐-׿a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/).filter(w => w.length > 2).map(w => w.toLowerCase())
);

/** Two shared words — one is a coincidence, as a one-word name proved. */
function labelNamesTheVenue(placeName, label) {
  const wa = words(placeName), wb = words(label);
  if (wa.size < 2) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared >= 2;
}

/** The street part of our address, without the city and without noise. */
function streetPart(address) {
  if (!address) return null;
  const first = String(address).split(',')[0].trim();
  return /\d/.test(first) ? first : null;
}

async function wazeSearch(query, lat, lon) {
  const url = `https://www.waze.com/SearchServer/mozi?q=${encodeURIComponent(query)}`
            + `&lang=heb&origin=livemap&lon=${lon}&lat=${lat}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

const cityPoints = new Map();
async function cityPoint(city, lat, lon) {
  if (!city) return null;
  if (cityPoints.has(city)) return cityPoints.get(city);
  let pt = null;
  try {
    const r = (await wazeSearch(city, lat, lon)).find(x => x.location);
    if (r) pt = { lat: r.location.lat, lon: r.location.lon };
  } catch { /* guard simply unavailable for this city */ }
  cityPoints.set(city, pt);
  await sleep(DELAY);
  return pt;
}

const FOOD_TYPES = new Set([
  'restaurant', 'cafe', 'bakery', 'fast_food',
  'juice_bar', 'coffee_cart', 'winery', 'ice_cream_parlor',
]);

const places = JSON.parse(readFileSync(PLACES, 'utf8'));

/** Places sharing an exact coordinate with a place at a different address. */
function stackedIds() {
  const byPt = new Map();
  for (const p of places) {
    if (!p.location || !Number.isFinite(p.location.latitude)) continue;
    const k = `${p.location.latitude.toFixed(6)},${p.location.longitude.toFixed(6)}`;
    if (!byPt.has(k)) byPt.set(k, []);
    byPt.get(k).push(p);
  }
  const ids = new Set();
  for (const group of byPt.values()) {
    if (group.length < 2) continue;
    if (new Set(group.map(p => String(p.address || '').trim())).size < 2) continue;
    group.forEach(p => ids.add(p.id));
  }
  return ids;
}
const STACKED = FILTER === 'stacked' ? stackedIds() : null;

const targets = places.filter(p => {
  if (!p.location || !Number.isFinite(p.location.latitude)) return false;
  if (RESUME && p.locationSource === 'waze') return false;
  switch (FILTER) {
    case 'all':     return true;
    case 'food':    return FOOD_TYPES.has(p.type);
    case 'tzohar':  return p.certifiedBy === 'צהר';
    case 'stacked': return STACKED.has(p.id);
    default:        return p.type === FILTER;
  }
});

console.log(`resolving ${targets.length} places through Waze${DRY ? ' (dry run)' : ''}\n`);

const rows = [];
const tally = { moved: 0, accurate: 0, review: 0, none: 0, failed: 0, fallback: 0 };
const flush = () => {
  if (DRY) return;
  writeFileSync(PLACES, JSON.stringify(places), 'utf8');
  writeFileSync(REPORT, JSON.stringify(rows, null, 2), 'utf8');
};

for (const p of targets) {
  const { latitude: lat, longitude: lon } = p.location;
  const row = { id: p.id, name: p.name, city: p.cityId, address: p.address, from: { lat, lon } };
  const street = streetPart(p.address);
  const ours = houseNumber(p.address);

  // Query the address first — it is the only thing that separates branches.
  const attempts = [];
  if (street) attempts.push({ via: 'address', q: [street, p.cityId].filter(Boolean).join(', ') });
  attempts.push({ via: 'name', q: [p.name, p.cityId].filter(Boolean).join(', ') });

  const cp = await cityPoint(p.cityId, lat, lon);
  let chosen = null;

  for (const attempt of attempts) {
    let results = [];
    try {
      results = await wazeSearch(attempt.q, lat, lon);
    } catch (e) {
      row.error = e.message;
      await sleep(DELAY);
      continue;
    }
    await sleep(DELAY);

    for (const r of results) {
      if (!r.location) continue;
      const cand = {
        via: attempt.via, query: attempt.q,
        lat: r.location.lat, lon: r.location.lon,
        label: r.businessName || r.name || '',
        d: Math.round(dist(lat, lon, r.location.lat, r.location.lon)),
      };
      if (cand.d > CITY_JUMP) continue;
      // Town-centre fallback: Waze put it where it puts the bare city name.
      if (cp && dist(cand.lat, cand.lon, cp.lat, cp.lon) < 60) continue;

      const theirs = houseNumber(cand.label);
      if (attempt.via === 'address') {
        // House number must agree, or it is a different address entirely.
        if (!ours || !theirs || ours !== theirs) continue;
        // The label must carry a street name, not just the number we asked for.
        if (!words(cand.label).size) continue;
        // Israeli street names repeat across towns — "Jerusalem St 18" exists
        // in Bnei Brak and in Kfar Saba. Our stored point cannot arbitrate
        // (it is the thing we distrust), so measure from the city instead.
        if (cp && dist(cand.lat, cand.lon, cp.lat, cp.lon) > CITY_RADIUS) continue;
        chosen = cand; break;
      }
      // Name hit: keep the old, stricter geography rules.
      if (cand.d > MAX_JUMP) continue;
      if (ours && theirs && ours !== theirs) continue;
      if (cand.d > LOOSE_JUMP && !theirs && !labelNamesTheVenue(p.name, cand.label)) continue;
      chosen = cand; break;
    }
    if (chosen) break;
  }

  if (!chosen) {
    row.action = cp ? 'no-match' : 'no-match';
    tally.none++;
  } else {
    row.waze = chosen;
    if (chosen.d < MIN_MOVE) {
      row.action = 'already-accurate'; tally.accurate++;
    } else {
      row.action = 'move'; tally.moved++;
      if (!DRY) {
        p.location = { latitude: chosen.lat, longitude: chosen.lon };
        p.locationPrecision = 'exact';
        p.locationSource = 'waze';
      }
      console.log(`  → ${String(chosen.d).padStart(5)}m [${chosen.via}] ${p.name} (${p.cityId})  ⇢  ${chosen.label}`);
    }
  }

  rows.push(row);
  if (rows.length % SAVE_EVERY === 0) flush();
}

flush();
if (DRY) writeFileSync(REPORT, JSON.stringify(rows, null, 2), 'utf8');

console.log(`\n=== Waze coordinate sync ===`);
console.log(`checked          : ${targets.length}`);
console.log(`moved (>=${MIN_MOVE}m)   : ${tally.moved}`);
console.log(`already accurate : ${tally.accurate}`);
console.log(`unresolved       : ${tally.none}`);
console.log(DRY ? '\n(dry run — nothing written)' : `\nwritten to ${path.relative(ROOT, PLACES)}`);
console.log(`report: ${path.relative(ROOT, REPORT)}`);
