/**
 * Fix: set type='fast_food' for all pizza + McDonald's records
 *      Add: פלאפל חתוכה שוהם
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

function makeId(prefix, name) {
  return prefix + '-' + createHash('md5').update(name).digest('hex').slice(0, 8);
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

const NEW_PLACES = [
  {
    id: makeId('falafel-chatuka', 'פלאפל חתוכה שוהם'),
    name: 'פלאפל חתוכה שוהם',
    type: 'fast_food',
    cityId: 'שוהם',
    address: 'שדרות עמק איילון 30, מרכז מסחרי שוהם',
    phone: '03-979-4761',
    location: { latitude: 31.9986, longitude: 34.9437 },
    openingHours: "א'-ה' 10:00-21:00 | ו' 10:00-15:00 | ש' סגור",
    category: 'parve',
    kosherType: 'rabanut',
    tags: ['falafel', 'שוורמה'],
    source: 'manual',
    lastVerifiedAt: '2026-07-23',
  },
];

function isFastFood(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  return (
    n.includes('פיצה') ||
    n.includes('pizza') ||
    n.includes('מקדונלד') ||
    n.includes("mcdonalds") ||
    n.includes("mcdonald")
  );
}

for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  const data = readJson(filePath);
  let typeUpdates = 0;

  for (const r of data) {
    if (isFastFood(r.name) && r.type !== 'fast_food') {
      r.type = 'fast_food';
      typeUpdates++;
    }
  }

  const { merged, added, skipped } = mergeInto(data, NEW_PLACES);
  writeJson(filePath, merged);
  console.log(`${path.basename(filePath)}: type→fast_food: ${typeUpdates}, +${added} new, ${skipped} skipped`);
}
console.log('Done!');
