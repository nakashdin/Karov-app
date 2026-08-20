/**
 * Import שווארמה שמעוני — branches missing from dataset — 2026-07-19
 * Sources: mdrl.org.il, dat-rehovot.co.il, easy.co.il, near-place.com
 * תל אביב כבר בדאטה — רק הסניפים החסרים
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const BRANCHES = [
  // כשרות: מועצה דתית רחובות (dat-rehovot.co.il ✓)
  {
    name: 'שווארמה שמעוני רחובות',
    city: 'רחובות', address: 'אופנהיימר 10, רחובות',
    phone: '08-8644624', lat: 31.9067, lng: 34.8137,
    hours: "א'-ה' 10:00-01:00 | ו' 10:00-15:30 | ש' מוצ\"ש עד 01:00",
    kosherType: 'rabanut',
  },
  // כשרות: רבנות מקומית נס ציונה (easy.co.il ✓)
  {
    name: 'שווארמה שמעוני נס ציונה',
    city: 'נס ציונה', address: 'החרש 1, אזור תעשייה א\', נס ציונה',
    phone: '08-8661435', lat: 31.9289, lng: 34.7875,
    hours: "א'-ה' 10:00-00:30 | ו' 10:00-16:30 | ש' מוצ\"ש עד 00:30",
    kosherType: 'rabanut',
  },
  // כשרות: מועצה דתית ראשון לציון (mdrl.org.il ✓)
  {
    name: 'שווארמה שמעוני ראשון לציון',
    city: 'ראשון לציון', address: 'לח"י 2, ראשון לציון',
    phone: '052-4877799', lat: 31.9644, lng: 34.8050,
    hours: "א'-ה' 10:00-01:00 | ו' 10:00-15:30 | ש' מוצ\"ש עד 01:00",
    kosherType: 'rabanut',
  },
  // כשרות: כשר רבנות מקומית (easy.co.il ✓)
  {
    name: 'שווארמה שמעוני גדרה',
    city: 'גדרה', address: 'הרצל 17, גדרה',
    phone: '08-8594604', lat: 31.8152, lng: 34.7705,
    hours: "א'-ה' 10:00-00:00 | ו' 10:00-15:30 | ש' מוצ\"ש עד 00:00",
    kosherType: 'rabanut',
  },
  // כשרות: כשר (rest.co.il — לא פורט סוג; Shabbat-observant ✓)
  {
    name: 'שווארמה שמעוני גן יבנה',
    city: 'גן יבנה', address: 'מתחם דור אלון, גן יבנה',
    phone: '053-9384991', lat: 31.7871, lng: 34.7132,
    hours: "א'-ה' 10:00-01:00 | ו' 10:00-15:00 | ש' מוצ\"ש עד 01:00",
    kosherType: 'rabanut',
  },
];

function makeId(name) {
  return 'shimoni-' + createHash('md5').update(name).digest('hex').slice(0, 8);
}

function buildPlace(b) {
  return {
    id: makeId(b.name),
    name: b.name,
    type: 'restaurant',
    cityId: b.city,
    address: b.address,
    phone: b.phone,
    location: { latitude: b.lat, longitude: b.lng },
    website: 'https://www.instagram.com/shawarma.shimoni',
    openingHours: b.hours,
    category: 'meat',
    kosherType: b.kosherType,
    source: 'manual',
    lastVerifiedAt: '2026-07-19',
  };
}

function readJson(p) {
  const raw = readFileSync(p);
  const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
  return JSON.parse(str);
}
function writeJson(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}
function mergeInto(existing, newRecords) {
  const existingIds = new Set(existing.map(r => r.id));
  const toAdd = newRecords.filter(r => !existingIds.has(r.id));
  return { merged: [...existing, ...toAdd], added: toAdd.length, skipped: newRecords.length - toAdd.length };
}

console.log('=== Shimoni Import ===');
const places = BRANCHES.map(buildPlace);
console.log(`Building ${places.length} records`);

for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  const data = readJson(filePath);
  const { merged, added, skipped } = mergeInto(data, places);
  writeJson(filePath, merged);
  console.log(`${path.basename(filePath)}: +${added} added, ${skipped} skipped`);
}
console.log('\nDone!');
