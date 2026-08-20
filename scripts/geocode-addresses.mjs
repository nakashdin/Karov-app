/**
 * Geocode all places with city-level precision using Nominatim structured queries.
 * Parses Israeli address format → street + housenumber + city → precise GPS coords.
 * Rate limit: 1 request/sec (Nominatim policy).
 */

import fs from 'fs';
import https from 'https';

const DATA_PATH = './src/data/generated/places.osm.json';
const FOOD_TYPES = ['restaurant','fast_food','cafe','coffee_cart','juice_bar','ice_cream_parlor','bakery'];

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// Only places with city/undefined precision that have a real street address (with a number)
const targets = data.filter(p =>
  (p.locationPrecision === 'city' || !p.locationPrecision) &&
  p.address &&
  /\d/.test(p.address) &&
  p.address.split(',').length >= 2
);

// Process food places first, then others
targets.sort((a, b) => {
  const af = FOOD_TYPES.includes(a.type) ? 0 : 1;
  const bf = FOOD_TYPES.includes(b.type) ? 0 : 1;
  return af - bf;
});

console.log(`Total to geocode: ${targets.length}`);
console.log(`  Food places: ${targets.filter(p => FOOD_TYPES.includes(p.type)).length}`);
console.log(`  Other: ${targets.filter(p => !FOOD_TYPES.includes(p.type)).length}`);
console.log(`Estimated time: ~${Math.round(targets.length * 1.1 / 60)} minutes\n`);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseAddress(address) {
  const parts = address.split(',').map(s => s.trim());
  const city = parts[parts.length - 1].replace(/\s*\d{5,7}\s*$/, '').trim(); // strip zip
  let streetPart = parts[0]
    .replace(/^(רחוב|שדרות|שד'|דרך|סמטת|כיכר|שכונת|מתחם)\s+/u, '')
    .trim();

  // Extract house number (at end): "הרצל 173" → num=173, street=הרצל
  const m = streetPart.match(/^(.*?)\s+(\d[\d\-\/]*)$/u);
  if (!m) return { city, street: streetPart, housenumber: null };
  return { city, street: m[1], housenumber: m[2] };
}

function geocode({ city, street, housenumber }) {
  return new Promise(resolve => {
    let url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=il&addressdetails=1';
    url += '&city=' + encodeURIComponent(city);
    url += '&street=' + encodeURIComponent((housenumber ? housenumber + ' ' : '') + street);

    const req = https.get(url, { headers: { 'User-Agent': 'karov-app-geocoder/2.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(8000, () => { req.destroy(); resolve([]); });
  });
}

// Precision rank: how specific the result is
function precisionLevel(r) {
  const t = r.type || r.class || '';
  if (['house','building','shop','amenity','tourism','mall','commercial'].includes(t)) return 'exact';
  if (['road','residential','unclassified','tertiary','secondary','primary'].includes(t)) return 'address';
  return null; // too vague — skip
}

let updated = 0, skipped = 0, failed = 0;
const results = [];

for (let i = 0; i < targets.length; i++) {
  const place = targets[i];
  const { city, street, housenumber } = parseAddress(place.address);

  if (!city || !street) { skipped++; continue; }

  const hits = await geocode({ city, street, housenumber });
  await sleep(1100);

  if (!hits.length) {
    // Retry without housenumber (catches "30-30 רחוב X" style addresses)
    if (housenumber) {
      const hits2 = await geocode({ city, street, housenumber: null });
      await sleep(1100);
      if (hits2.length) hits.push(...hits2);
    }
  }

  if (!hits.length) {
    process.stdout.write(`❌ ${place.name} | ${place.address}\n`);
    failed++;
    results.push({ id: place.id, name: place.name, address: place.address, status: 'not_found' });
    continue;
  }

  const precision = precisionLevel(hits[0]);
  if (!precision) {
    process.stdout.write(`⚠️  ${place.name} | ${place.address} (${hits[0].type})\n`);
    skipped++;
    results.push({ id: place.id, name: place.name, status: 'low_precision', type: hits[0].type });
    continue;
  }

  const newLat = parseFloat(hits[0].lat);
  const newLon = parseFloat(hits[0].lon);

  const idx = data.findIndex(p => p.id === place.id);
  if (idx !== -1) {
    data[idx].location = { latitude: newLat, longitude: newLon };
    data[idx].locationPrecision = precision;
    process.stdout.write(`✅ ${place.name} → ${newLat.toFixed(5)},${newLon.toFixed(5)} (${hits[0].type})\n`);
    updated++;
    results.push({ id: place.id, name: place.name, address: place.address, status: 'updated', newLat, newLon, type: hits[0].type });
  }

  // Save every 50 places so we don't lose progress
  if (updated % 50 === 0 && updated > 0) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    process.stdout.write(`\n💾 Saved ${updated} updates so far (${i+1}/${targets.length})\n\n`);
  }
}

// Final save
fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
fs.writeFileSync('./scripts/geocode-results.json', JSON.stringify(results, null, 2));

console.log(`\n${'='.repeat(40)}`);
console.log(`✅ Updated:  ${updated}`);
console.log(`⚠️  Skipped:  ${skipped} (low precision)`);
console.log(`❌ Failed:   ${failed} (not found)`);
console.log(`Results → scripts/geocode-results.json`);
