/**
 * Import kosher shawarma — south additions — 2026-07-23
 * Sources: easy.co.il, zips.co.il, mishlohim.co.il
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const PLACES = [
  // ─── ערד ─────────────────────────────────────────────────────────
  {
    prefix: 'masada', name: 'שיפודי מצדה ערד',
    city: 'ערד', address: 'יהודה 34, ערד',
    phone: '08-618-1840', lat: 31.2617, lng: 35.2103,
    hours: "א'-ה' 08:00-21:00 | ו' 08:00-15:00 | ש' סגור",
    kosher: 'rabanut',
    website: 'https://www.instagram.com/mesada_shipud',
  },
];

function makeId(prefix, name) {
  return prefix + '-' + createHash('md5').update(name).digest('hex').slice(0, 8);
}

function buildPlace(b) {
  return {
    id: makeId(b.prefix, b.name),
    name: b.name,
    type: 'restaurant',
    cityId: b.city,
    address: b.address,
    phone: b.phone,
    location: { latitude: b.lat, longitude: b.lng },
    ...(b.website ? { website: b.website } : {}),
    openingHours: b.hours,
    category: 'meat',
    kosherType: b.kosher,
    tags: ['shawarma'],
    source: 'manual',
    lastVerifiedAt: '2026-07-23',
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

console.log('=== Import Shawarma South 2 ===');
const places = PLACES.map(buildPlace);
for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  const data = readJson(filePath);
  const { merged, added, skipped } = mergeInto(data, places);
  writeJson(filePath, merged);
  console.log(`${path.basename(filePath)}: +${added} added, ${skipped} skipped`);
}
console.log('Done!');
