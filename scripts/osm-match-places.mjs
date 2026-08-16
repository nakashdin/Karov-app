/**
 * Cross-check our places against OpenStreetMap.
 *
 * For every place we hold, ask Overpass what named POIs sit within a small
 * radius, and look for one whose name matches ours. A match gives us OSM's
 * own coordinates and — the part we actually need — its house number, which
 * is what navigation apps use to route to a front door rather than to the
 * middle of a village.
 *
 * Read-only: writes a report, never touches places.osm.json.
 *
 * Usage:
 *   node scripts/osm-match-places.mjs --filter tzohar
 *   node scripts/osm-match-places.mjs --filter tzohar --radius 200
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');
const PLACES = path.join(ROOT, 'src/data/generated/places.osm.json');
const OUT = path.join(__dir, 'osm-match-report.json');

const args = process.argv.slice(2);
const arg = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const FILTER = arg('--filter', 'tzohar');
const RADIUS = +arg('--radius', 150);
const CHUNK = +arg('--chunk', 25);
const ENDPOINT = 'https://overpass-api.de/api/interpreter';

const norm = s => String(s || '')
  .replace(/["'׳״()]/g, '')
  .replace(/[-–—]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

/** Do two business names share a meaningful word? */
function namesMatch(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const words = s => new Set(s.split(' ').filter(w => w.length > 2));
  const wa = words(na), wb = words(nb);
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared >= Math.min(2, Math.min(wa.size, wb.size));
}

const dist = (a, b, c, d) => {
  const R = 6371000, r = Math.PI / 180;
  return R * Math.hypot((d - b) * r * Math.cos((a + c) / 2 * r), (c - a) * r);
};

const places = JSON.parse(readFileSync(PLACES, 'utf8'));
const targets = places.filter(p =>
  p.location && (FILTER === 'all' || (FILTER === 'tzohar' && p.certifiedBy === 'צהר'))
);

console.log(`checking ${targets.length} places against OSM (radius ${RADIUS}m)\n`);

const results = [];
for (let i = 0; i < targets.length; i += CHUNK) {
  const batch = targets.slice(i, i + CHUNK);
  const query = `[out:json][timeout:60];(${batch
    .map(p => `nwr(around:${RADIUS},${p.location.latitude},${p.location.longitude})["name"];`)
    .join('')});out center tags;`;

  let elements = [];
  try {
    const res = await fetch(ENDPOINT, { method: 'POST', body: query });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    elements = (await res.json()).elements ?? [];
  } catch (e) {
    console.log(`  batch ${i / CHUNK + 1}: ${e.message} — retrying once`);
    await new Promise(r => setTimeout(r, 8000));
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', body: query });
      elements = (await res.json()).elements ?? [];
    } catch (e2) {
      console.log(`  batch ${i / CHUNK + 1}: failed (${e2.message})`);
    }
  }

  const pts = elements.map(e => ({
    name: e.tags?.name,
    lat: e.lat ?? e.center?.lat,
    lon: e.lon ?? e.center?.lon,
    street: e.tags?.['addr:street'],
    house: e.tags?.['addr:housenumber'],
    kind: e.tags?.amenity ?? e.tags?.shop ?? e.tags?.tourism ?? null,
  })).filter(x => x.lat && x.lon);

  for (const p of batch) {
    const near = pts
      .map(x => ({ ...x, d: Math.round(dist(p.location.latitude, p.location.longitude, x.lat, x.lon)) }))
      .filter(x => x.d <= RADIUS);
    const hit = near.find(x => namesMatch(p.name, x.name));
    results.push({
      id: p.id,
      name: p.name,
      city: p.cityId,
      address: p.address,
      hasHouseNumber: /\d/.test(p.address || ''),
      osm: hit ? { name: hit.name, dist: hit.d, street: hit.street ?? null, house: hit.house ?? null, lat: hit.lat, lon: hit.lon, kind: hit.kind } : null,
    });
  }
  console.log(`  batch ${i / CHUNK + 1}/${Math.ceil(targets.length / CHUNK)} — ${results.filter(r => r.osm).length} matched so far`);
  await new Promise(r => setTimeout(r, 3000)); // be polite to Overpass
}

writeFileSync(OUT, JSON.stringify(results, null, 2), 'utf8');

const matched = results.filter(r => r.osm);
const gainsHouse = matched.filter(r => !r.hasHouseNumber && r.osm.house);
console.log(`\n=== OSM cross-check ===`);
console.log(`places checked        : ${results.length}`);
console.log(`found in OSM by name  : ${matched.length}`);
console.log(`no house number here, OSM has one: ${gainsHouse.length}`);
console.log(`\nreport: ${path.relative(ROOT, OUT)}`);
if (gainsHouse.length) {
  console.log('\n— addresses OSM could complete —');
  gainsHouse.forEach(r => console.log(`  ${r.name} (${r.city}): "${r.address}" -> ${r.osm.street} ${r.osm.house}  [${r.osm.dist}m]`));
}
