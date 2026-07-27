/**
 * קפה נמרוד importer — 1 kosher branch
 * Source: provided by admin, July 2026
 * Branch: חולון, מתחם עזריאלי, מהדרין חלבי
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const BRANCHES = [
  {
    id: 'manual-cafe-nimrod-holon',
    name: 'קפה נמרוד חולון',
    city: 'חולון',
    address: 'הרוקמים 26, מתחם עזריאלי, חולון',
    phone: '03-9437991',
    kosherType: 'mehadrin',
    hours: 'א-ה 08:00-22:30 | ו 08:00-14:00 | מוצ"ש שעה לאחר צאת השבת עד 23:00',
    lat: 32.01640, lng: 34.77595,
  },
];

function buildPlace(b) {
  return {
    id: b.id,
    name: b.name,
    type: 'cafe',
    cityId: b.city,
    address: b.address,
    location: { latitude: b.lat, longitude: b.lng },
    locationPrecision: 'city',
    phone: b.phone,
    instagram: 'https://www.instagram.com/cafenimrod/',
    openingHours: b.hours,
    category: 'dairy',
    kosherType: b.kosherType,
    source: 'manual',
    lastVerifiedAt: '2026-07-27',
  };
}

function readJson(filePath) {
  const raw = readFileSync(filePath);
  const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
  return JSON.parse(str);
}

function writeJson(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  writeFileSync(filePath, Buffer.concat([BOM, Buffer.from(json, 'utf8')]));
}

function mergeInto(existing, newRecords) {
  const existingIds = new Set(existing.map(r => r.id));
  const toAdd = newRecords.filter(r => !existingIds.has(r.id));
  return { merged: [...existing, ...toAdd], added: toAdd.length, skipped: newRecords.length - toAdd.length };
}

console.log('=== קפה נמרוד Import ===');
const places = BRANCHES.map(buildPlace);

const placesPath = path.join(DATA_DIR, 'places.osm.json');
const allPlaces = readJson(placesPath);
const p = mergeInto(allPlaces, places);
writeJson(placesPath, p.merged);
console.log(`places.osm.json: +${p.added} added, ${p.skipped} skipped`);

const restaurantsPath = path.join(DATA_DIR, 'restaurants.osm.json');
const restaurants = readJson(restaurantsPath);
const r = mergeInto(restaurants, places);
writeJson(restaurantsPath, r.merged);
console.log(`restaurants.osm.json: +${r.added} added, ${r.skipped} skipped`);

console.log('Done!');
