/**
 * Import Or Yehuda kosher meat restaurants — 2026-07-19
 * Places: אצל הטורקי, טורקיש גריל, אצל עובד בכפר
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const PLACES = [
  {
    id_prefix: 'etzelhaturky',
    name: 'אצל הטורקי אור יהודה',
    city: 'אור יהודה', address: 'הראשונים 2, אור יהודה',
    phone: '03-5331352', lat: 32.0337, lng: 34.8591,
    hours: "א'-ה' 11:00-00:00 | ו' 11:00-14:00 | ש' מוצ\"ש עד 00:00",
    kosherType: 'rabanut',
    website: 'https://etzelhaturky.com',
  },
  {
    id_prefix: 'turkishgrill',
    name: 'טורקיש גריל אור יהודה',
    city: 'אור יהודה', address: 'העבודה 2, אור יהודה',
    phone: '053-6354094', lat: 32.0319, lng: 34.8553,
    hours: "א'-ה' 11:00-00:00 | ו' 09:00-13:00 | ש' מוצ\"ש עד 00:00",
    kosherType: 'badatz_beit_yosef',
    website: 'https://www.turkishgrill.co.il',
  },
  {
    id_prefix: 'ovedbakfar',
    name: 'אצל עובד בכפר אור יהודה',
    city: 'אור יהודה', address: 'חטיבת אלכסנדרוני 2, אור יהודה',
    phone: '03-6346005', lat: 32.0290, lng: 34.8565,
    hours: "א'-ה' 11:00-00:00 | ו' 11:00-15:30 | ש' מוצ\"ש עד 01:00",
    kosherType: 'rabanut',
    website: 'https://ovedbakfar.co.il',
  },
];

function makeId(prefix, name) {
  return prefix + '-' + createHash('md5').update(name).digest('hex').slice(0, 8);
}

function buildPlace(b) {
  return {
    id: makeId(b.id_prefix, b.name),
    name: b.name,
    type: 'restaurant',
    cityId: b.city,
    address: b.address,
    phone: b.phone,
    location: { latitude: b.lat, longitude: b.lng },
    website: b.website,
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

console.log('=== Import Or Yehuda Meat ===');
const places = PLACES.map(buildPlace);
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
