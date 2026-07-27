/**
 * ארקפה importer — 13 kosher branches
 * Source: provided by admin, July 2026
 * All branches: חלבי כשר, closed Shabbat (or open after Shabbat)
 * Note: ארקפה רמת אביב + קניון רמת אביב = same location (merged as קניון)
 *       ארקפה עזריאלי + קניון עזריאלי ת"א = same location (merged)
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const BRANCHES = [
  {
    id: 'manual-arcaffe-krinizy',
    name: 'ארקפה קריניצי',
    city: 'רמת גן',
    address: 'יוסף ספיר 9, רמת גן',
    phone: '03-6404624',
    hours: 'א-ה 07:00-21:00 | ו 07:00-לפני כניסת השבת | שבת סגור',
    lat: 32.06952, lng: 34.82483,
  },
  {
    id: 'manual-arcaffe-beit-asia',
    name: 'ארקפה בית אסיה',
    city: 'תל אביב–יפו',
    address: 'וייצמן 4, תל אביב',
    phone: '072-2775528',
    hours: 'א-ה 06:30-20:00 | ו 06:30-14:00 | שבת סגור',
    lat: 32.06744, lng: 34.78695,
  },
  {
    id: 'manual-arcaffe-assuta',
    name: 'ארקפה אסותא',
    city: 'תל אביב–יפו',
    address: 'הברזל 20, תל אביב',
    phone: '03-9204189',
    hours: 'א-ה 07:00-22:00 | ו 07:00-14:30 | שבת סגור',
    lat: 32.11500, lng: 34.83500,
  },
  {
    id: 'manual-arcaffe-rogvin',
    name: 'ארקפה רוגובין',
    city: 'רמת גן',
    address: 'דרך מנחם בגין 11, מתחם הבורסה, רמת גן',
    phone: '03-7522667',
    hours: 'א-ה 07:00-19:30 | ו סגור | שבת סגור',
    lat: 32.08200, lng: 34.81200,
  },
  {
    id: 'manual-arcaffe-ramat-aviv-mall',
    name: 'ארקפה קניון רמת אביב',
    city: 'תל אביב–יפו',
    address: 'איינשטיין 40, תל אביב',
    phone: '058-6000261',
    hours: 'א-ה 09:00-21:30 | ו 07:00-16:00 | שבת סגור',
    lat: 32.11500, lng: 34.80400,
  },
  {
    id: 'manual-arcaffe-zahav-mall',
    name: 'ארקפה קניון הזהב',
    city: 'ראשון לציון',
    address: 'דוד סחרוב 21, ראשון לציון',
    phone: '052-2200611',
    hours: 'א-ה 08:00-22:00 | ו 08:00-14:30 | מוצאי שבת עד 23:00',
    lat: 31.96831, lng: 34.79981,
  },
  {
    id: 'manual-arcaffe-beit-harel',
    name: 'ארקפה בית הראל',
    city: 'רמת גן',
    address: 'דרך אבא הלל 3, מתחם הבורסה, רמת גן',
    phone: '055-9737868',
    hours: 'א-ה 07:00-19:00 | ו 07:00-16:00 | שבת סגור',
    lat: 32.07900, lng: 34.81500,
  },
  {
    id: 'manual-arcaffe-caesarea',
    name: 'ארקפה קיסריה',
    city: 'קיסריה',
    address: 'רחוב שמש 1, שכונה 13, קיסריה',
    phone: '072-2419303',
    hours: 'א-ה 07:00-21:00 | ו 07:00-15:00 | שבת סגור',
    lat: 32.50198, lng: 34.90411,
  },
  {
    id: 'manual-arcaffe-azrieli-tlv',
    name: 'ארקפה עזריאלי תל אביב',
    city: 'תל אביב–יפו',
    address: 'דרך מנחם בגין 132, תל אביב',
    phone: '052-3892401',
    hours: 'א-ה 07:00-21:00 | ו 07:00-שעתיים לפני כניסת השבת | שבת סגור',
    lat: 32.07100, lng: 34.79200,
  },
  {
    id: 'manual-arcaffe-or-yehuda',
    name: 'ארקפה אור יהודה',
    city: 'אור יהודה',
    address: 'שדרות אריאל שרון 3, אור יהודה',
    phone: '03-9011086',
    hours: 'א-ה 07:00-19:00 | ו 07:00-14:00 | שבת סגור',
    lat: 32.03076, lng: 34.86280,
  },
  {
    id: 'manual-arcaffe-baser-bneibrак',
    name: 'ארקפה בסר בני ברק',
    city: 'בני ברק',
    address: 'כנרת 5, בני ברק',
    phone: '050-6704777',
    hours: 'א-ה 07:00-19:00 | ו סגור | שבת סגור',
    lat: 32.08618, lng: 34.83144,
  },
  {
    id: 'manual-arcaffe-ashdod',
    name: 'ארקפה אשדוד',
    city: 'אשדוד',
    address: 'דרך הרכבת 1, אשדוד',
    phone: '050-2109941',
    hours: 'א-ה 07:00-22:00 | ו 07:00-14:00 | מוצ"ש 40 דקות לאחר צאת השבת עד 23:00',
    lat: 31.79387, lng: 34.65243,
  },
  {
    id: 'manual-arcaffe-kfarsaba-g',
    name: 'ארקפה כפר סבא G',
    city: 'כפר סבא',
    address: 'ויצמן 207, כפר סבא',
    phone: '09-7734826',
    hours: 'א-ה 07:30-22:00 | ו 08:00-15:00 | מוצ"ש עד 23:00',
    lat: 32.17753, lng: 34.90800,
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
    website: 'https://arcaffe.co.il',
    openingHours: b.hours,
    category: 'dairy',
    kosherType: 'rabanut_mehadrin',
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

console.log('=== ארקפה Import ===');
const places = BRANCHES.map(buildPlace);
console.log(`Building ${places.length} place records...`);

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
