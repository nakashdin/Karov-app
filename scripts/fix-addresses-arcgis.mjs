/**
 * Reverse-geocode ALL places using ArcGIS World Geocoder (free, no key needed).
 * Much better coverage in Israel than Nominatim.
 * Run: node scripts/fix-addresses-arcgis.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dir, '../src/data/generated/places.osm.json');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function reverseGeocodeArcGIS(lat, lng) {
  const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lng},${lat}&f=json&langCode=he&featureTypes=PointAddress,StreetAddress`;
  const res = await fetch(url, { headers: { 'User-Agent': 'KarovApp/1.0' } });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json.address) return null;

  const a = json.address;
  // ArcGIS returns: ShortLabel (e.g. "רחוב הרצל 12"), City
  const label = a.ShortLabel || a.Match_addr || '';
  const city  = a.City || a.Region || '';

  if (!label) return null;
  // If ShortLabel already includes the city, use it directly
  if (label.includes(city)) return label;
  if (label && city) return `${label}, ${city}`;
  return label || null;
}

async function main() {
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  const places = Array.isArray(data) ? data : data.places;

  // Update ALL places, not just city-only ones
  console.log(`Reverse-geocoding all ${places.length} places with ArcGIS...`);
  console.log('Estimated time:', Math.ceil(places.length * 0.3 / 60), 'minutes\n');

  let updated = 0, failed = 0, same = 0;

  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    const { latitude, longitude } = place.location;

    process.stdout.write(`[${i + 1}/${places.length}] ${place.name} → `);

    try {
      const newAddress = await reverseGeocodeArcGIS(latitude, longitude);
      if (newAddress && newAddress !== place.address && newAddress.length > 3) {
        process.stdout.write(`✓ ${newAddress} (was: ${place.address})\n`);
        place.address = newAddress;
        updated++;
      } else {
        process.stdout.write(`— ${place.address}\n`);
        same++;
      }
    } catch (e) {
      failed++;
      process.stdout.write(`✗ ${e.message}\n`);
    }

    // Save every 100 places
    if ((i + 1) % 100 === 0) {
      writeFileSync(DATA_PATH, JSON.stringify(Array.isArray(data) ? places : { ...data, places }, null, 2), 'utf8');
      console.log(`  💾 Saved checkpoint at ${i + 1}`);
    }

    await sleep(300); // ArcGIS is more generous with rate limits
  }

  writeFileSync(DATA_PATH, JSON.stringify(Array.isArray(data) ? places : { ...data, places }, null, 2), 'utf8');
  console.log(`\n✅ Done. Updated: ${updated}, Same: ${same}, Failed: ${failed}`);
}

main().catch(console.error);
