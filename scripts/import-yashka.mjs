/**
 * Import יאשקה שווארמה וגריל branches — 2026-07-19
 * Source: yashka.co.il (official branch pages)
 * All branches: rabanut | category: meat
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
    name: 'יאשקה דיזנגוף תל אביב',
    city: 'תל אביב', address: 'דיזנגוף 105, תל אביב',
    phone: '03-5057632', lat: 32.0797, lng: 34.7736,
    hours: "א'-ה' 11:30-00:00 | ו' 11:30-16:00 | ש' מוצ\"ש עד 01:00",
  },
  {
    name: 'יאשקה יהודה המכבי תל אביב',
    city: 'תל אביב', address: 'יהודה המכבי 62, תל אביב',
    phone: '03-7392212', lat: 32.0880, lng: 34.7770,
    hours: "א'-ה' 11:00-21:00 | ו' 11:00-15:30 | ש' סגור",
  },
  {
    name: 'יאשקה רמת אפעל',
    city: 'רמת גן', address: 'דרך שיבא 14, רמת אפעל',
    phone: '03-5057632', lat: 32.0613, lng: 34.8695,
    hours: "א'-ה' 11:00-23:00 | ו' 11:00-16:00 | ש' סגור",
  },
  {
    name: 'יאשקה רמת השרון',
    city: 'רמת השרון', address: 'טרומפלדור 5, רמת השרון',
    phone: '03-5057632', lat: 32.1456, lng: 34.8359,
    hours: "א'-ה' 11:00-20:30 | ו' 11:00-14:30 | ש' מוצ\"ש עד 23:00",
  },
  {
    name: 'יאשקה רעננה',
    city: 'רעננה', address: 'מרכז נווה זמר, רעננה',
    phone: '03-5057632', lat: 32.1790, lng: 34.8650,
    hours: "א'-ה' 11:00-22:00 | ו' 10:00-15:00 | ש' סגור",
  },
  {
    name: 'יאשקה כפר סבא',
    city: 'כפר סבא', address: 'גלגלי הפלדה 4, כפר סבא',
    phone: '03-5057632', lat: 32.1730, lng: 34.8870,
    hours: "א'-ה' 11:00-00:00 | ו' 10:30-15:30 | ש' מוצ\"ש עד 01:30",
  },
  {
    name: 'יאשקה פתח תקווה',
    city: 'פתח תקווה', address: 'גיסין 15, פתח תקווה',
    phone: '03-5057632', lat: 32.0817, lng: 34.8910,
    hours: "א'-ד' 11:00-23:00 | ה' 11:00-00:00 | ו' 11:00-15:00 | ש' סגור",
  },
  {
    name: 'יאשקה ראשון לציון',
    city: 'ראשון לציון', address: 'הסוכה 14, ראשון לציון',
    phone: '03-5057632', lat: 31.9716, lng: 34.8098,
    hours: "א'-ה' 11:00-23:00 | ו' סגור | ש' מוצ\"ש עד 23:30",
  },
  {
    name: 'יאשקה נתניה',
    city: 'נתניה', address: 'קניון אלון, קריית השרון, נתניה',
    phone: '03-5057632', lat: 32.2945, lng: 34.8585,
    hours: "א'-ה' 11:00-19:30 | ו' סגור | ש' סגור",
  },
];

function makeId(name) {
  return 'yashka-' + createHash('md5').update(name).digest('hex').slice(0, 8);
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
    website: 'https://www.yashka.co.il',
    openingHours: b.hours,
    category: 'meat',
    kosherType: 'rabanut',
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

console.log('=== Yashka Import ===');
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
