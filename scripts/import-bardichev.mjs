/**
 * Hummus Bardichev kosher branches importer
 * Source: hummusbardichev.co.il — 2026-07-19
 * 4 branches: כרמל סנטר, נווה שאנן, קניון חיפה, שוק תלפיות
 * Category: parve | kosherType: mehadrin (כשר למהדרין)
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
    name: 'חומוס ברדיצ\'ב כרמל סנטר',
    city: 'חיפה', address: 'ביכורים 2, כרמל סנטר, חיפה',
    phone: '04-657-4132',
    lat: 32.7924, lng: 34.9900,
    hours: "א'-ה' 09:30-17:00 | ו' 09:00-14:00 | ש' סגור",
  },
  {
    name: 'חומוס ברדיצ\'ב נווה שאנן',
    city: 'חיפה', address: 'טרומפלדור 53, נווה שאנן, חיפה',
    phone: '04-847-7390',
    lat: 32.7740, lng: 35.0100,
    hours: "א'-ה' 11:00-20:00 | ו' 10:00-14:30 | ש' סגור",
  },
  {
    name: 'חומוס ברדיצ\'ב קניון חיפה',
    city: 'חיפה', address: 'דרך משה פלימן 4, קניון חיפה, חיפה',
    phone: '055-243-8032',
    lat: 32.7956, lng: 34.9897,
    hours: "א'-ה' 10:00-20:00 | ו' 09:30-14:00 | ש' סגור",
  },
  {
    name: 'חומוס ברדיצ\'ב שוק תלפיות',
    city: 'חיפה', address: 'סירקין 27, שוק תלפיות, חיפה',
    phone: '04-867-5252',
    lat: 32.7970, lng: 35.0113,
    hours: "א'-ה' 09:30-16:00 | ו' 08:30-14:45 | ש' סגור",
  },
];

function makeId(name) {
  return 'bardichev-' + createHash('md5').update(name).digest('hex').slice(0, 8);
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
    website: 'https://hummusbardichev.co.il',
    openingHours: b.hours,
    category: 'parve',
    kosherType: 'mehadrin',
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

console.log('=== Bardichev Import ===');
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
