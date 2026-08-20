/**
 * Auto-geocode all places with locationPrecision='city' or undefined.
 * Uses Nominatim (OSM) with the stored address to get accurate coordinates.
 * Only updates when Nominatim returns a specific point (not just a road/area).
 */

import fs from 'fs';
import https from 'https';

const DATA_PATH = './src/data/generated/places.osm.json';
const SLEEP_MS = 1100; // Nominatim rate limit: 1 req/sec

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const needsGeocode = data.filter(p =>
  (p.locationPrecision === 'city' || !p.locationPrecision) &&
  p.address &&
  p.address.trim().length > 0 &&
  !p.address.match(/^\s*(ישראל|israel)\s*$/i)
);

console.log(`Found ${needsGeocode.length} places to geocode\n`);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function nominatim(query) {
  return new Promise((resolve) => {
    const url = 'https://nominatim.openstreetmap.org/search?q=' +
      encodeURIComponent(query) +
      '&format=json&limit=1&countrycodes=il&addressdetails=1';
    const req = https.get(url, { headers: { 'User-Agent': 'karov-app-geocoder/1.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
  });
}

// Precision rank — higher is better
const RANK = {
  house: 5, building: 5,
  shop: 5, amenity: 5, tourism: 5, leisure: 5,
  road: 3, street: 3,
  suburb: 2, neighbourhood: 2,
  city: 1, town: 1, village: 1,
};
function rankResult(r) {
  return RANK[r.type] ?? RANK[r.class] ?? 0;
}

let updated = 0;
let skipped = 0;
const log = [];

for (const place of needsGeocode) {
  // Build query: full address + Israel if not already there
  let query = place.address;
  if (!query.toLowerCase().includes('ישראל') && !query.toLowerCase().includes('israel')) {
    query += ', ישראל';
  }

  const results = await nominatim(query);
  await sleep(SLEEP_MS);

  if (!results.length) {
    // Try with just city name
    const city = place.cityId || place.address.split(',').pop()?.trim();
    if (city) {
      const r2 = await nominatim(place.address.split(',')[0] + ', ' + city + ', ישראל');
      await sleep(SLEEP_MS);
      if (r2.length) results.push(...r2);
    }
  }

  if (!results.length) {
    console.log(`⚠️  NOT FOUND: ${place.name} | ${place.address}`);
    skipped++;
    log.push({ id: place.id, name: place.name, address: place.address, status: 'not_found' });
    continue;
  }

  const best = results[0];
  const rank = rankResult(best);

  if (rank < 3) {
    // Only road-level or worse — not good enough to replace city
    console.log(`⛔ LOW PRECISION (${best.type}): ${place.name} | ${place.address}`);
    skipped++;
    log.push({ id: place.id, name: place.name, address: place.address, status: 'low_precision', type: best.type, lat: best.lat, lon: best.lon });
    continue;
  }

  const newLat = parseFloat(best.lat);
  const newLon = parseFloat(best.lon);

  // Find and update the place in data
  const idx = data.findIndex(p => p.id === place.id);
  if (idx !== -1) {
    data[idx].location = { latitude: newLat, longitude: newLon };
    data[idx].locationPrecision = rank >= 5 ? 'exact' : 'address';
    console.log(`✅ ${place.name} | ${place.address}\n   ${place.location.latitude},${place.location.longitude} → ${newLat},${newLon} (${best.type})`);
    updated++;
    log.push({ id: place.id, name: place.name, address: place.address, status: 'updated', oldLat: place.location.latitude, oldLon: place.location.longitude, newLat, newLon, type: best.type });
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
fs.writeFileSync('./scripts/geocode-results.json', JSON.stringify(log, null, 2));

console.log(`\n=== Done ===`);
console.log(`Updated: ${updated}`);
console.log(`Skipped: ${skipped}`);
console.log(`Results saved to scripts/geocode-results.json`);
