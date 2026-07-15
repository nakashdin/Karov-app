/**
 * Cafe Cafe kosher branches importer
 * Source: cafecafe.co.il/he/company/snifim/search/ — scraped 2026-07-15
 * 14 kosher branches (8 mehadrin + 6 kosher/rabanut)
 * Category: dairy
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const BRANCHES = [
  // ── כשר למהדרין ─────────────────────────────────────────────────────────
  {
    name: 'קפה קפה גבעת שמואל',
    city: 'גבעת שמואל', address: 'קניון גבעת שמואל, גבעת שמואל',
    phone: '03-717-2454', lat: 32.0811, lng: 34.8548,
    hours: "א'-ה' 08:30-23:00 | ו' 08:00 עד שלוש שעות לפני כניסת שבת | מוצ\"ש שעה וחצי לאחר צאת שבת עד 24:00",
    kosher: 'mehadrin',
  },
  {
    name: 'קפה קפה תל אביב עזריאלי',
    city: 'תל אביב', address: 'מגדלי עזריאלי, דרך מנחם בגין 132, תל אביב',
    phone: '03-609-4770', lat: 32.0742, lng: 34.7924,
    hours: "א'-ה' 09:00-21:00 | ו' 08:00-15:00 | מוצ\"ש שעה לאחר צאת שבת עד 23:00",
    kosher: 'mehadrin',
  },
  {
    name: 'קפה קפה בת ים טיילת',
    city: 'בת ים', address: 'בן גוריון 81, טיילת, בת ים',
    phone: '054-644-4825', lat: 32.0168, lng: 34.7521,
    hours: "א'-ה' 08:00-00:00 | ו' 08:00 עד שעתיים לפני כניסת שבת | מוצ\"ש שעה לאחר יציאת שבת עד 00:00",
    kosher: 'mehadrin',
  },
  {
    name: 'קפה קפה אשדוד ביג פאשן',
    city: 'אשדוד', address: 'מתחם ביג פאשן, אשדוד',
    phone: '08-915-9656', lat: 31.8018, lng: 34.6597,
    hours: "א'-ה' 09:30 עד אחרון הלקוחות | ו' 08:30-13:30 | ש' שעה לאחר צאת שבת עד אחרון הלקוחות",
    kosher: 'mehadrin',
  },
  {
    name: 'קפה קפה מגדל העמק',
    city: 'מגדל העמק', address: 'שאול עמור 77, מתחם פרץ סנטר, מגדל העמק',
    phone: '04-602-3535', lat: 32.6781, lng: 35.2385,
    hours: "א'-ה' 08:00-00:00 | ו' 08:00 עד שעה לפני כניסת שבת | מוצ\"ש שעה לאחר צאת שבת עד אחרון הלקוחות",
    kosher: 'mehadrin',
  },
  {
    name: 'קפה קפה נתיבות',
    city: 'נתיבות', address: 'בעלי המלאכה 203, נתיבות',
    phone: '08-992-0808', lat: 31.4218, lng: 34.5882,
    hours: "א'-ה' 08:00-00:00 | ו' 08:00-15:00 | ש' שעה לאחר כניסת שבת עד אחרון הלקוחות",
    kosher: 'mehadrin',
  },
  {
    name: 'קפה קפה דימונה',
    city: 'דימונה', address: 'קניון פרץ סנטר 14, דימונה',
    phone: '08-669-8040', lat: 31.0695, lng: 35.0335,
    hours: "א'-ה' 08:00 עד אחרון הלקוחות | ו' 08:00 עד שלוש שעות לפני כניסת שבת | מוצ\"ש שעה לאחר צאת שבת עד אחרון הלקוחות",
    kosher: 'mehadrin',
  },
  {
    name: 'קפה קפה נהריה',
    city: 'נהריה', address: 'הגעתון 35, נהריה',
    phone: '04-951-2350', lat: 33.0077, lng: 35.0965,
    hours: "א'-ה' 08:00 עד אחרון הסועדים | ו' 08:00 עד שעה לפני כניסת שבת | ש' חצי שעה לאחר צאת שבת עד אחרון הסועדים",
    kosher: 'mehadrin',
  },

  // ── כשר (רבנות) ──────────────────────────────────────────────────────────
  {
    name: 'קפה קפה קריית ים',
    city: 'קריית ים', address: 'האירוס 1, ליד תחנת דלק סונול, קריית ים',
    phone: '04-870-4296', lat: 32.8500, lng: 35.0700,
    hours: "א'-ה' 07:30 עד אחרון הלקוחות | ו' 07:30 עד שעה לפני כניסת שבת | ש' חצי שעה לאחר צאת שבת עד אחרון הלקוחות",
    kosher: 'kosher',
  },
  {
    name: 'קפה קפה חולון וולפסון',
    city: 'חולון', address: 'בית חולים וולפסון, מרכז GO, חולון',
    phone: '054-477-8245', lat: 32.0228, lng: 34.7793,
    hours: "א'-ה' 06:00-23:00 | ו' 06:00-16:00 | ש' סגור",
    kosher: 'kosher',
  },
  {
    name: 'קפה קפה בקעת הירדן',
    city: 'בקעת הירדן', address: 'מפגש הבקעה, כביש 90, בקעת הירדן',
    phone: '02-940-0808', lat: 32.4000, lng: 35.5500,
    hours: "א'-ה' 08:00-21:00 | ו' 08:00-15:00 | ש' סגור",
    kosher: 'kosher',
    locationPrecision: 'city',
  },
  {
    name: 'קפה קפה באר שבע ONE PLAZA',
    city: 'באר שבע', address: 'דרך חברון 133, מתחם ONE PLAZA, באר שבע',
    phone: '08-662-8983', lat: 31.2590, lng: 34.8048,
    hours: "א'-ה' 08:30-22:00 | ו' 08:00-13:30 | מוצ\"ש שעה לאחר צאת שבת עד 01:00",
    kosher: 'kosher',
  },
  {
    name: 'קפה קפה עכו',
    city: 'עכו', address: 'החרושת 2, קניון עזריאלי, עכו',
    phone: '04-850-7294', lat: 32.9281, lng: 35.0839,
    hours: "א'-ה' 08:30 עד אחרון הלקוחות | ו' 08:00 עד שלוש שעות לפני כניסת שבת | ש' שעה לאחר יציאת שבת עד אחרון הלקוחות",
    kosher: 'kosher',
  },
  {
    name: 'קפה קפה טבריה',
    city: 'טבריה', address: 'יהודה הלוי 1, ביג פאשן, טבריה',
    phone: '04-672-3400', lat: 32.7876, lng: 35.5300,
    hours: "א'-ה' 08:30-22:00 | ו' 09:00-14:30 | ש' שעה לאחר צאת שבת עד 23:00",
    kosher: 'kosher',
  },
];

function makeId(name) {
  return 'cafecafe-' + createHash('md5').update(name).digest('hex').slice(0, 8);
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
    ...(b.locationPrecision ? { locationPrecision: b.locationPrecision } : {}),
    website: 'https://cafecafe.co.il',
    openingHours: b.hours,
    category: 'dairy',
    kosherType: b.kosher,
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

console.log('=== Cafe Cafe Kosher Import ===');
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
