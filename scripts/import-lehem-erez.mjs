/**
 * לחם ארז importer — 4 kosher branches
 * Source: lehemerez.co.il/branches (verified July 2026)
 * Kosher: Herzliya Hanadiv, Raanana, Kiryat Bialik, Kikar Hamedina
 * Not kosher: Nes Ziona, Netanya (open Shabbat)
 * Unknown: Ramat Hasharon (no explicit kosher mention on site)
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const BRANCHES = [
  {
    id: 'manual-lehem-erez-herzliya',
    name: 'לחם ארז הרצליה',
    city: 'הרצליה',
    address: 'הנדיב 71, הרצליה',
    phone: '09-9555612',
    hours: 'א-ה 07:15-20:00 | ו 07:15-14:00 | שבת סגור',
    lat: 32.16704, lng: 34.84180,
  },
  {
    id: 'manual-lehem-erez-raanana',
    name: 'לחם ארז רעננה',
    city: 'רעננה',
    address: 'אחוזה 104, מתחם גולן, רעננה',
    phone: '09-7412626',
    hours: 'א-ה 07:00-20:30 | ו 07:00-14:30 | שבת סגור',
    lat: 32.18628, lng: 34.87126,
  },
  {
    id: 'manual-lehem-erez-kiryat-bialik',
    name: 'לחם ארז קריית ביאליק',
    city: 'קריית ביאליק',
    address: 'כרן היסוד 1, קריית ביאליק',
    phone: '04-8707081',
    hours: 'א-ה 07:00-22:00 | ו 08:00-14:00 | שבת סגור',
    lat: 32.83700, lng: 35.08500,
  },
  {
    id: 'manual-lehem-erez-kikar-hamedina',
    name: 'לחם ארז כיכר המדינה',
    city: 'תל אביב–יפו',
    address: 'כיכר המדינה, תל אביב',
    phone: '03-6991143',
    hours: 'א-ה 06:00-20:00 | ו 07:00-17:00 | שבת סגור',
    lat: 32.08850, lng: 34.78350,
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
    website: 'https://www.lehemerez.co.il',
    menu: 'https://www.lehemerez.co.il/menu/coffeemenu',
    openingHours: b.hours,
    category: 'dairy',
    kosherType: 'rabanut_mekomi',
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

console.log('=== לחם ארז Import ===');
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
