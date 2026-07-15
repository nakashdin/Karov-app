/**
 * Lechem Basar kosher branches importer
 * Sources (per branch official sites) — scraped 2026-07-15
 * 5 branches: נמל ת"א, פ"ת, הרצליה, ראשון לציון, ירושלים
 * Category: meat | kosherType: mehadrin (הרב מחפוד)
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
    name: 'לחם בשר נמל תל אביב',
    city: 'תל אביב', address: 'יורדי הסירה 1, נמל תל אביב',
    phone: '03-525-2558',
    lat: 32.0980, lng: 34.7831,
    hours: "א'-ד' 12:00-23:00 | ה' 12:00-00:00 | ו' 11:00-16:00 | ש' שעה מצאת שבת עד 01:00",
    website: 'https://lechembasartlv.co.il',
  },
  {
    name: 'לחם בשר פתח תקווה',
    city: 'פתח תקווה', address: 'תוצרת הארץ 3, פתח תקווה',
    phone: '077-230-7114',
    lat: 32.0908, lng: 34.8828,
    hours: "א'-ד' 12:00-23:00 | ה' 12:00-23:30",
    website: 'https://www.lechembasarpt.co.il',
  },
  {
    name: 'לחם בשר הרצליה',
    city: 'הרצליה', address: 'השונית 2, מרינה, הרצליה פיתוח',
    phone: '077-230-7592',
    lat: 32.1595, lng: 34.8065,
    hours: "א'-ה' 12:00-24:00 | ו' 12:00 עד שעתיים לפני כניסת שבת | ש' שעה מצאת שבת עד 24:00",
    website: 'https://www.lechembasarhrz.co.il',
  },
  {
    name: 'לחם בשר ראשון לציון',
    city: 'ראשון לציון', address: 'משה בקר 13, הרובע, ראשון לציון',
    phone: '03-9555511',
    lat: 31.9630, lng: 34.8035,
    hours: "א'-ד' 12:00-23:30 | ה' 12:00-01:00 | ו' סגור | מוצ\"ש חצי שעה מצאת שבת עד 00:30",
    website: 'https://lechembasar-rishon.co.il',
  },
  {
    name: 'לחם בשר ירושלים',
    city: 'ירושלים', address: 'דוד רמז 4, התחנה הראשונה, ירושלים',
    phone: '02-624-4808',
    lat: 31.7778, lng: 35.2210,
    hours: null,
    website: 'https://lehembasar-jerusalem.co.il',
  },
];

function makeId(name) {
  return 'lechembasar-' + createHash('md5').update(name).digest('hex').slice(0, 8);
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
    website: b.website,
    ...(b.hours ? { openingHours: b.hours } : {}),
    category: 'meat',
    kosherType: 'mehadrin',
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

console.log('=== Lechem Basar Import ===');
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
