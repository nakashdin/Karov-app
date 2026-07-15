/**
 * Hummus Neri kosher branches importer
 * Sources: Wolt, easy.co.il, mdrh.org.il, hummusneri.co.il — 2026-07-15
 * 6 branches: ראש העין, בני ברק, שוהם, קריית אונו, הוד השרון, רמת גן
 * Category: parve | kosherType: kosher (רבנות מקומית)
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
    name: 'חומוס נרי ראש העין',
    city: 'ראש העין', address: 'הרב שלום שבזי 60, ראש העין',
    phone: '077-300-7200',
    lat: 32.0960, lng: 34.9567,
  },
  {
    name: 'חומוס נרי בני ברק',
    city: 'בני ברק', address: 'מצדה 9, בני ברק',
    lat: 32.0835, lng: 34.8248,
  },
  {
    name: 'חומוס נרי שוהם',
    city: 'שוהם', address: 'דקל 30, שוהם',
    lat: 31.9962, lng: 34.9396,
  },
  {
    name: 'חומוס נרי קריית אונו',
    city: 'קריית אונו', address: 'דובדבן 9, מרכז דובדבן, קריית אונו',
    lat: 32.0536, lng: 34.8721,
  },
  {
    name: 'חומוס נרי הוד השרון',
    city: 'הוד השרון', address: 'סוקולוב 2, הוד השרון',
    phone: '09-740-0400',
    lat: 32.1501, lng: 34.8899,
    hours: "א'-ה' 09:00-17:00 | ו' 08:00-15:00 | ש' סגור",
  },
  {
    name: 'חומוס נרי רמת גן',
    city: 'רמת גן', address: 'תובל 36, מתחם הבורסה, רמת גן',
    phone: '03-613-6636',
    lat: 32.0870, lng: 34.8340,
    website: 'https://hummusneri.co.il',
  },
];

function makeId(name) {
  return 'hummusneri-' + createHash('md5').update(name).digest('hex').slice(0, 8);
}

function buildPlace(b) {
  return {
    id: makeId(b.name),
    name: b.name,
    type: 'restaurant',
    cityId: b.city,
    address: b.address,
    ...(b.phone ? { phone: b.phone } : {}),
    location: { latitude: b.lat, longitude: b.lng },
    website: b.website ?? 'https://www.instagram.com/hummus_neri/',
    ...(b.hours ? { openingHours: b.hours } : {}),
    category: 'parve',
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

console.log('=== Hummus Neri Import ===');
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
