/**
 * For places that have a street+number but no city (no comma in address),
 * fetch the city from Nominatim and append it.
 * Run: node scripts/fix-addresses-city.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dir, '../src/data/generated/places.osm.json');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function needsCity(place) {
  const a = place.address?.trim() ?? '';
  // Has a digit (street number) but no comma (no city appended yet)
  return /\d/.test(a) && !a.includes(',');
}

async function getCity(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=he&zoom=10`;
  const res = await fetch(url, { headers: { 'User-Agent': 'KarovApp/1.0 (nakashdin@gmail.com)' } });
  if (!res.ok) return null;
  const json = await res.json();
  const a = json.address ?? {};
  return a.city || a.town || a.village || a.suburb || a.county || null;
}

async function main() {
  const raw = readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);
  const places = Array.isArray(data) ? data : data.places;

  const toFix = places.filter(needsCity);
  console.log(`Places with street but no city: ${toFix.length} / ${places.length}`);
  console.log(`Estimated time: ~${Math.ceil(toFix.length * 1.1 / 60)} minutes\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < toFix.length; i++) {
    const place = toFix[i];
    const { latitude, longitude } = place.location;
    process.stdout.write(`[${i + 1}/${toFix.length}] "${place.address}" → `);

    try {
      const city = await getCity(latitude, longitude);
      if (city) {
        place.address = `${place.address.trim()}, ${city}`;
        process.stdout.write(`✓ ${place.address}\n`);
        updated++;
      } else {
        process.stdout.write(`— no city found\n`);
        failed++;
      }
    } catch (e) {
      process.stdout.write(`✗ ${e.message}\n`);
      failed++;
    }

    if ((i + 1) % 100 === 0) {
      writeFileSync(DATA_PATH, JSON.stringify(Array.isArray(data) ? places : { ...data, places }, null, 2), 'utf8');
      console.log(`  💾 Checkpoint ${i + 1}`);
    }

    await sleep(1100);
  }

  writeFileSync(DATA_PATH, JSON.stringify(Array.isArray(data) ? places : { ...data, places }, null, 2), 'utf8');
  console.log(`\n✅ Done. Updated: ${updated}, Failed: ${failed}`);
}

main().catch(console.error);
