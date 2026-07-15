/**
 * BBB (Burgus) kosher branches importer
 * Source: burgus.co.il — scraped 2026-07-15
 * 2 kosher branches: ראש פינה, קרית גת
 * Category: meat | kosherType: kosher (רבנות מקומית)
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const BRANCHES = [
  {
    name: 'BBB ראש פינה',
    city: 'ראש פינה', address: 'התפוח 3, סנטר הגליל, ראש פינה',
    lat: 32.9738, lng: 35.5512,
    hours: "א'-ה' 12:00-00:00 | ו' 11:30 עד שלוש שעות לפני כניסת שבת | ש' שעה מצאת שבת עד 23:00",
  },
  {
    name: 'BBB קריית גת',
    city: 'קריית גת', address: 'דרך הדרום 3, ביג סנטר, קריית גת',
    lat: 31.6098, lng: 34.7671,
    hours: "א'-ה' 12:00-22:00 | ו' סגור | מוצ\"ש חצי שעה מצאת שבת עד 22:00",
  },
];

function makeId(name) {
  return 'bbb-' + createHash('md5').update(name).digest('hex').slice(0, 8);
}

function buildPlace(b) {
  return {
    id: makeId(b.name),
    name: b.name,
    type: 'restaurant',
    cityId: b.city,
    address: b.address,
    location: { latitude: b.lat, longitude: b.lng },
    website: 'https://burgus.co.il',
    openingHours: b.hours,
    category: 'meat',
    kosherType: 'kosher',
    source: 'manual',
    lastVerifiedAt: '2026-07-15',
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

console.log('=== BBB Kosher Import ===');
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
