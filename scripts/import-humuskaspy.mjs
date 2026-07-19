/**
 * Hummus Kaspi kosher branches importer
 * Source: kaspishuk.co.il/branches + rabanut.co.il — 2026-07-15
 * 3 kosher branches (excluding: נמל פתוח שבת/ללא כשרות, רמת השרון פתוח שבת)
 * Category: parve | kosherType: rabanut
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
    name: 'חומוס כספי בן יהודה תל אביב',
    city: 'תל אביב', address: 'ארלוזרוב 13, תל אביב',
    phone: '03-6050680', lat: 32.0882, lng: 34.7760,
    hours: "א'-ה' 09:30-22:00 | ו' 09:30 עד שעתיים לפני כניסת שבת | ש' סגור",
    kosherType: 'rabanut',
  },
  {
    name: 'חומוס כספי שוסטר תל אביב',
    city: 'תל אביב', address: 'אבא אחימאיר 29, מרכז שוסטר, תל אביב',
    phone: '03-6199981', lat: 32.0940, lng: 34.7805,
    hours: "א'-ה' 10:00-19:00 | ו' 09:00-15:30 | ש' סגור",
    kosherType: 'rabanut',
  },
  {
    name: 'חומוס כספי פתח תקווה',
    city: 'פתח תקווה', address: 'יעל רום 8, אם המושבות, פתח תקווה',
    phone: '03-9470111', lat: 32.0797, lng: 34.8857,
    hours: "א'-ה' 10:00-17:00 | ו' 09:00-15:00 | ש' סגור",
    kosherType: 'rabanut',
  },
];

function makeId(name) {
  return 'humuskaspy-' + createHash('md5').update(name).digest('hex').slice(0, 8);
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
    website: 'https://www.kaspishuk.co.il',
    openingHours: b.hours,
    category: 'parve',
    kosherType: b.kosherType,
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

console.log('=== Hummus Kaspi Import ===');
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
