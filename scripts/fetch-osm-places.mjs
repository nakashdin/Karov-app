/**
 * ⚠️ DEPRECATED — superseded by the modular pipeline in `importers/`.
 *   Use:  npm run import:all   (synagogues + kosher restaurants → app dataset)
 * Kept only for reference; the importers produce the same output files.
 *
 * Fetch REAL places from OpenStreetMap (Overpass API) and build a local dataset.
 *
 * Free, no API key, legal (OSM data under ODbL — attribution kept in the app).
 * Covers ALL of Israel. Each place is assigned to its nearest OSM locality so
 * search-by-city works for any city. We DO NOT invent kosher certification.
 *
 * Run:  node scripts/fetch-osm-places.mjs
 * Out:  src/data/generated/places.osm.json , cities.osm.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEN = join(__dirname, '..', 'src', 'data', 'generated');
const PLACES_OUT = join(GEN, 'places.osm.json');
const CITIES_OUT = join(GEN, 'cities.osm.json');

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const PLACES_QUERY = `[out:json][timeout:180];
area["ISO3166-1"="IL"][admin_level=2]->.il;
(
  nwr["amenity"="place_of_worship"]["religion"="jewish"](area.il);
  nwr["diet:kosher"~"yes|only|designated"]["amenity"](area.il);
);
out center tags;`;

const LOCALITIES_QUERY = `[out:json][timeout:120];
area["ISO3166-1"="IL"][admin_level=2]->.il;
(
  node["place"~"city|town|village"]["name"](area.il);
);
out center tags;`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOverpass(query, label) {
  let lastErr;
  for (const url of ENDPOINTS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[${label}] ${url} (attempt ${attempt}) …`);
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'karov-kosher-app/1.0 (OSM data import; non-commercial)',
            Accept: 'application/json',
          },
          body: 'data=' + encodeURIComponent(query),
        });
        if (res.status === 429 || res.status === 504) {
          throw new Error(`HTTP ${res.status} (busy)`);
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        console.warn(`  failed: ${e.message}`);
        lastErr = e;
        await sleep(attempt * 5000);
      }
    }
  }
  throw lastErr;
}

const toRad = (d) => (d * Math.PI) / 180;
function distanceKm(aLat, aLng, bLat, bLng) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function localityName(tags) {
  return tags['name:he'] || tags.name;
}

/** Build sorted [{lat,lng,name}] of localities for nearest-city assignment. */
function parseLocalities(data) {
  const out = [];
  for (const el of data.elements || []) {
    const name = localityName(el.tags || {});
    if (name && typeof el.lat === 'number' && typeof el.lon === 'number') {
      out.push({ name, lat: el.lat, lng: el.lon });
    }
  }
  return out;
}

function nearestLocality(lat, lng, localities) {
  let best = null;
  let bestD = Infinity;
  for (const c of localities) {
    const d = distanceKm(lat, lng, c.lat, c.lng);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best ? best.name : '';
}

function classify(tags) {
  if (tags.religion === 'jewish' && tags.amenity === 'place_of_worship') {
    return 'synagogue';
  }
  const k = tags['diet:kosher'];
  if (k === 'yes' || k === 'only' || k === 'designated') return 'restaurant';
  return null;
}

function main_normalize(el, localities) {
  const tags = el.tags || {};
  const name = tags['name:he'] || tags.name;
  if (!name) return null;

  const type = classify(tags);
  if (!type) return null;

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  // Prefer the nearest OSM locality (consistent Hebrew names) over addr:city,
  // which is inconsistent (mixed Hebrew/English) in the data.
  const cityName =
    nearestLocality(lat, lng, localities) || tags['addr:city'] || '';

  // Address: street + number when OSM has them, else fall back to the city.
  const street = tags['addr:street'] || '';
  const num = tags['addr:housenumber'] || '';
  const streetLine = [street, num].filter(Boolean).join(' ').trim();
  const address = streetLine
    ? [streetLine, cityName].filter(Boolean).join(', ')
    : cityName;

  const place = {
    id: `osm-${el.type}-${el.id}`,
    name,
    type,
    cityId: cityName, // city name doubles as id (real OSM locality)
    address,
    location: { latitude: lat, longitude: lng },
    source: 'osm',
  };
  const phone = tags['contact:phone'] || tags.phone;
  if (phone) place.phone = phone;
  if (tags.opening_hours) place.openingHours = tags.opening_hours;
  if (type === 'restaurant' && tags.cuisine) {
    place.tags = tags.cuisine.split(';').map((s) => s.trim()).filter(Boolean);
  }
  return place;
}

async function main() {
  const localitiesData = await fetchOverpass(LOCALITIES_QUERY, 'localities');
  const localities = parseLocalities(localitiesData);
  console.log(`Localities: ${localities.length}`);

  const placesData = await fetchOverpass(PLACES_QUERY, 'places');
  const elements = placesData.elements || [];
  console.log(`Raw place elements: ${elements.length}`);

  const byId = new Map();
  for (const el of elements) {
    const p = main_normalize(el, localities);
    if (p && !byId.has(p.id)) byId.set(p.id, p);
  }
  const places = [...byId.values()];

  // Build cities list from localities that actually have places.
  const counts = {};
  for (const p of places) {
    if (p.cityId) counts[p.cityId] = (counts[p.cityId] || 0) + 1;
  }
  const cities = Object.keys(counts)
    .map((name) => ({ id: name, name, count: counts[name] }))
    .sort((a, b) => b.count - a.count)
    .map(({ id, name }) => ({ id, name }));

  const byType = {};
  for (const p of places) byType[p.type] = (byType[p.type] || 0) + 1;

  mkdirSync(GEN, { recursive: true });
  writeFileSync(PLACES_OUT, JSON.stringify(places, null, 2), 'utf8');
  writeFileSync(CITIES_OUT, JSON.stringify(cities, null, 2), 'utf8');

  console.log(`\nWrote ${places.length} places → ${PLACES_OUT}`);
  console.log(`Wrote ${cities.length} cities → ${CITIES_OUT}`);
  console.log('By type:', byType);
  console.log('Top cities:', cities.slice(0, 10).map((c) => c.name).join(', '));
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
