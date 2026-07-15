/**
 * Pasta Basta kosher branches importer
 * Source: pastabasta.co.il — scraped 2026-07-14
 * 18 kosher branches (excluding הרצליה + מוריה חיפה = no kosher label, excluding "בקרוב")
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
  // ── מרכז ────────────────────────────────────────────────────────────────
  {
    name: 'פסטה בסטה עזריאלי תל אביב',
    city: 'תל אביב', address: 'קניון עזריאלי, תל אביב',
    lat: 32.0742, lng: 34.7924, kosher: 'kosher', locationPrecision: 'city',
    hours: "א' 10:30-22:00 | ב'-ה' 11:30-22:30 | ו' 11:30 עד כניסת שבת | מוצ\"ש לאחר צאת שבת עד 23:00",
  },
  {
    name: 'פסטה בסטה TLV תל אביב',
    city: 'תל אביב', address: 'חשמונאים 96, תל אביב',
    lat: 32.0782, lng: 34.7782, kosher: 'kosher',
    hours: "א'-ה' 11:00-23:00 | ו' 11:00-15:00 | ש' 20:30-23:00",
  },
  {
    name: 'פסטה בסטה קניון איילון רמת גן',
    city: 'רמת גן', address: 'אבא הלל סילבר 301, קניון איילון, רמת גן',
    lat: 32.0849, lng: 34.8222, kosher: 'kosher',
    hours: "א'-ה' 11:00-22:00 | ו' 11:00-15:00 | ש' 18:30-22:00",
  },
  {
    name: 'פסטה בסטה קניון ביאליק גבעתיים',
    city: 'גבעתיים', address: 'ביאליק 76, רמת גן',
    lat: 32.0756, lng: 34.8156, kosher: 'kosher',
    hours: "א'-ה' 10:00-22:00 | ו' 10:00-15:00 | מוצ\"ש 21:00-00:00",
  },
  {
    name: 'פסטה בסטה גני תקווה',
    city: 'גני תקווה', address: 'הדרים 7, מתחם אורבן צים, גני תקווה',
    lat: 32.0583, lng: 34.8774, kosher: 'kosher',
    hours: "א'-ה' 10:00-22:00 | ו' 10:00-15:30 | מוצ\"ש חצי שעה אחרי צאת השבת עד 22:30",
  },
  {
    name: 'פסטה בסטה כפר סבא',
    city: 'כפר סבא', address: 'פפורט 3, כפר סבא',
    lat: 32.1780, lng: 34.9077, kosher: 'kosher',
    hours: "א'-ה' 11:00-21:00 | ו' 11:00-15:00 | ש' סגור",
  },
  {
    name: 'פסטה בסטה ראשון לציון',
    city: 'ראשון לציון', address: 'עלי יבלון 7, ראשון לציון',
    lat: 31.9689, lng: 34.8060, kosher: 'kosher',
    hours: "א'-ה' 11:00-23:00 | ו' 11:00-15:00 | מוצ\"ש עד 23:00",
  },
  {
    name: 'פסטה בסטה חולון',
    city: 'חולון', address: 'רוקמים 26, חולון',
    lat: 32.0075, lng: 34.7762, kosher: 'kosher',
    hours: "א'-ה' 11:00-21:00 | ו' 11:00-14:30",
  },

  // ── ירושלים והסביבה ─────────────────────────────────────────────────────
  {
    name: 'פסטה בסטה מחנה יהודה ירושלים',
    city: 'ירושלים', address: 'ממטה התות 8, שוק מחנה יהודה, ירושלים',
    lat: 31.7840, lng: 35.2095, kosher: 'kosher',
    hours: "א'-ה' 11:00-00:00 | ו' וערבי חג 10:00-15:00 | מוצ\"ש שעה וחצי אחרי צאת שבת עד 01:00",
  },
  {
    name: 'פסטה בסטה ירושלים מרכז העיר',
    city: 'ירושלים', address: 'יפו 36, ירושלים',
    lat: 31.7793, lng: 35.2215, kosher: 'kosher',
    hours: "א'-ד' 11:00-22:30 | ה' 11:00-00:00 | ו' 11:00-15:30 | ש' 21:15-23:30",
  },
  {
    name: 'פסטה בסטה מבשרת ציון',
    city: 'מבשרת ציון', address: 'קניון הראל, מבשרת ציון',
    lat: 31.8060, lng: 35.1393, kosher: 'kosher', locationPrecision: 'city',
    hours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00",
  },
  {
    name: 'פסטה בסטה הדסה עין כרם',
    city: 'ירושלים', address: 'גן קלמן 1, קניון ישפרו הדסה עין כרם, ירושלים',
    lat: 31.7530, lng: 35.1515, kosher: 'badatz_beit_yosef',
    hours: "א'-ה' 10:30-21:00 | ו' סגור | מוצ\"ש שעה מצאת השבת עד 23:00",
  },
  {
    name: 'פסטה בסטה מודיעין',
    city: 'מודיעין', address: 'דם המכבים 5, מרכז העיר, מודיעין',
    lat: 31.8984, lng: 35.0105, kosher: 'kosher',
    hours: "א'-ה' 10:30-23:00 | ו' 10:30-14:00 | מוצ\"ש 18:00-23:00",
  },
  {
    name: 'פסטה בסטה מעלה אדומים',
    city: 'מעלה אדומים', address: 'קניון עופר, קומה 2, מעלה אדומים',
    lat: 31.7813, lng: 35.2936, kosher: 'kosher', locationPrecision: 'city',
    hours: "א'-ה' 11:00-23:00 | ו' 11:00-15:00 | מוצ\"ש עד 23:00",
  },

  // ── דרום ────────────────────────────────────────────────────────────────
  {
    name: 'פסטה בסטה רחובות',
    city: 'רחובות', address: 'הרצל 219, רחובות',
    lat: 31.8943, lng: 34.8033, kosher: 'kosher',
    hours: "א'-ה' 11:00-23:00 | ו'/ש' לפי כניסת ויציאת שבת",
  },
  {
    name: 'פסטה בסטה באר שבע מרכז',
    city: 'באר שבע', address: 'מתחם ביג, באר שבע',
    lat: 31.2472, lng: 34.7997, kosher: 'kosher', locationPrecision: 'city',
    hours: "א'-ה' 11:00-23:00 | ו'/ש' לפי כניסת ויציאת שבת",
  },
  {
    name: 'פסטה בסטה באר שבע',
    city: 'באר שבע', address: 'ז\'ינגלבלום 19, באר שבע',
    lat: 31.2589, lng: 34.8020, kosher: 'badatz_beit_yosef',
    hours: "א'-ה' 11:00-23:00 | ו' 11:00-15:00 | מוצ\"ש חצי שעה מצאת שבת עד 00:00",
  },

  // ── צפון ────────────────────────────────────────────────────────────────
  {
    name: 'פסטה בסטה קריית מוצקין',
    city: 'קריית מוצקין', address: 'שושנה דמארי 4, מתחם גשם, קרית מוצקין',
    lat: 32.8355, lng: 35.0701, kosher: 'kosher',
    hours: "א'-ה' 11:00-22:00 | ו' 10:00-14:00 | מוצ\"ש 18:30-23:00",
  },
];

// ---------------------------------------------------------------------------
function makeId(name) {
  return 'pastabasta-' + createHash('md5').update(name).digest('hex').slice(0, 8);
}

function buildPlace(b) {
  return {
    id: makeId(b.name),
    name: b.name,
    type: 'restaurant',
    cityId: b.city,
    address: b.address,
    location: { latitude: b.lat, longitude: b.lng },
    ...(b.locationPrecision ? { locationPrecision: b.locationPrecision } : {}),
    website: 'https://pastabasta.co.il',
    openingHours: b.hours,
    category: 'dairy',
    kosherType: b.kosher,
    source: 'manual',
    lastVerifiedAt: '2026-07-14',
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

// ---------------------------------------------------------------------------
console.log('=== Pasta Basta Import ===');
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
