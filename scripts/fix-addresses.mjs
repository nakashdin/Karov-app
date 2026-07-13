/**
 * Reverse-geocode places that have only a city name as address.
 * Uses Nominatim (OpenStreetMap) at 1 req/sec to stay within limits.
 * Run: node scripts/fix-addresses.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dir, '../src/data/generated/places.osm.json');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function needsReverseGeocode(place) {
  const a = place.address?.trim() ?? '';
  if (!a) return true;
  // Only city name: no digits and no spaces (single token)
  return !/\d/.test(a) && !a.includes(' ');
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=he&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'KarovApp/1.0 (nakashdin@gmail.com)' }
  });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.address) return null;

  const a = json.address;
  // Build: "רחוב מספר, עיר" or best available
  const road    = a.road || a.pedestrian || a.footway || a.cycleway || '';
  const number  = a.house_number || '';
  const city    = a.city || a.town || a.village || a.suburb || a.county || '';

  if (road && number && city) return `${road} ${number}, ${city}`;
  if (road && city)           return `${road}, ${city}`;
  if (city)                   return city;
  return json.display_name?.split(',').slice(0,2).join(',').trim() ?? null;
}

async function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  const places = Array.isArray(data) ? data : data.places;

  const toFix = places.filter(needsReverseGeocode);
  console.log(`Found ${toFix.length} places to reverse-geocode (out of ${places.length} total)`);
  console.log('Estimated time:', Math.ceil(toFix.length * 1.1 / 60), 'minutes\n');

  let updated = 0, failed = 0;

  for (let i = 0; i < toFix.length; i++) {
    const place = toFix[i];
    const { latitude, longitude } = place.location;

    process.stdout.write(`[${i + 1}/${toFix.length}] ${place.name} (${place.address}) → `);

    try {
      const newAddress = await reverseGeocode(latitude, longitude);
      if (newAddress && newAddress !== place.address) {
        place.address = newAddress;
        updated++;
        process.stdout.write(`✓ ${newAddress}\n`);
      } else {
        process.stdout.write(`— unchanged\n`);
      }
    } catch (e) {
      failed++;
      process.stdout.write(`✗ error: ${e.message}\n`);
    }

    // Save every 50 places
    if ((i + 1) % 50 === 0) {
      writeFileSync(DATA_PATH, JSON.stringify(Array.isArray(data) ? places : { ...data, places }, null, 2), 'utf8');
      console.log(`  💾 Saved checkpoint at ${i + 1}`);
    }

    await sleep(1100); // Nominatim rate limit: 1 req/sec
  }

  // Final save
  writeFileSync(DATA_PATH, JSON.stringify(Array.isArray(data) ? places : { ...data, places }, null, 2), 'utf8');
  console.log(`\n✅ Done. Updated: ${updated}, Failed: ${failed}`);
}

main().catch(console.error);
