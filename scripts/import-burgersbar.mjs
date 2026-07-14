/**
 * Burgers Bar kosher branches importer
 * Source: burgersbar.co.il/branches/ — all branches (kosher chain)
 * Scraped 2026-07-14
 * Total: 28 branches (9 ירושלים + 12 מרכז + 7 דרום, 0 צפון)
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const BRANCHES = [
  // ── ירושלים ─────────────────────────────────────────────────────────────
  {
    name: 'בורגרס בר הר חומה',
    city: 'ירושלים', address: 'אליהו קורן 27, ירושלים',
    lat: 31.7218, lng: 35.2337, kosher: 'mehadrin',
    hours: "א'-ד': 11:00-00:00 | ה': 11:00-00:00 | ו': 11:00-15:00 | מוצ\"ש: חצי שעה לאחר צאת השבת ועד 00:00",
  },
  {
    name: 'בורגרס בר מחנה יהודה',
    city: 'ירושלים', address: 'עץ חיים 68, ירושלים',
    lat: 31.7842, lng: 35.2082, kosher: 'mehadrin',
    hours: "א'-ד': 11:00-00:00 | ה': 11:00-03:00 | ו': 11:00-15:45 | מוצ\"ש: חצי שעה לאחר צאת השבת ועד 00:00",
  },
  {
    name: 'בורגרס בר יפו 36',
    city: 'ירושלים', address: 'יפו 36, ירושלים',
    lat: 31.7798, lng: 35.2229, kosher: 'badatz_beit_yosef',
    hours: "א'-ד': 11:00-23:30 | ה': 11:00-23:30 | ו': 11:00-15:00 | מוצ\"ש: שעה לאחר צאת השבת ועד 23:30",
  },
  {
    name: 'בורגרס בר הרובע היהודי',
    city: 'ירושלים', address: 'תפארת ישראל 12, ירושלים',
    lat: 31.7754, lng: 35.2294, kosher: 'mehadrin',
    hours: "א'-ד': 11:00-23:00 | ה': 11:00-23:00 | ו': 10:30-15:00 | מוצ\"ש: שעה וחצי לאחר צאת השבת ועד 00:00",
  },
  {
    name: 'בורגרס בר המושבה הגרמנית',
    city: 'ירושלים', address: 'עמק רפאים 31, ירושלים',
    lat: 31.7671, lng: 35.2203, kosher: 'badatz_beit_yosef',
    hours: "א'-ד': 11:00-00:00 | ה': 11:00-00:00 | ו': 11:00-15:00 | מוצ\"ש: חצי שעה לאחר צאת השבת ועד 00:00",
  },
  {
    name: 'בורגרס בר הגבעה הצרפתית',
    city: 'ירושלים', address: 'ההגנה 21, ירושלים',
    lat: 31.8073, lng: 35.2327, kosher: 'mehadrin',
    hours: "א'-ד': 11:30-23:30 | ה': 11:30-23:00 | ו': סגור | מוצ\"ש: שעה וחצי לאחר צאת השבת ועד 23:30",
  },
  {
    name: 'בורגרס בר גילה',
    city: 'ירושלים', address: 'הגננת 216, ירושלים',
    lat: 31.7388, lng: 35.1875, kosher: 'mehadrin',
    hours: "א'-ד': 11:00-23:00 | ה': 11:00-00:00 | ו': סגור | מוצ\"ש: חצי שעה לאחר צאת השבת ועד 00:00",
  },
  {
    name: 'בורגרס בר גבעת שאול',
    city: 'ירושלים', address: 'בית הדפוס 12, ירושלים',
    lat: 31.7964, lng: 35.1888, kosher: 'mehadrin',
    hours: "א'-ד': 11:00-23:00 | ה': 11:00-23:00 | ו': סגור | מוצ\"ש: סגור",
  },
  {
    name: 'בורגרס בר בן יהודה',
    city: 'ירושלים', address: 'בן יהודה 2, ירושלים',
    lat: 31.7808, lng: 35.2224, kosher: 'mehadrin',
    hours: "א'-ד': 11:00-23:00 | ה': 11:00-00:00 | ו': 11:00-15:00 | מוצ\"ש: שעה לאחר צאת השבת ועד 23:30",
  },

  // ── מרכז ────────────────────────────────────────────────────────────────
  {
    name: 'בורגרס בר באר יעקב',
    city: 'באר יעקב', address: 'עמק 2, באר יעקב',
    lat: 31.9428, lng: 34.8378, kosher: 'mehadrin',
    hours: "א'-ד': 11:00-23:00 | ה': 11:00-00:00 | ו': 11:00-15:00 | מוצ\"ש: חצי שעה לאחר צאת השבת ועד 00:00",
  },
  {
    name: 'בורגרס בר חולון',
    city: 'חולון', address: 'גולדה מאיר 7, חולון',
    lat: 32.0236, lng: 34.7763, kosher: 'mehadrin',
    hours: "א'-ד': 11:00-22:30 | ה': 11:00-22:30 | ו': 11:00-15:00 | מוצ\"ש: שעה לאחר צאת השבת ועד 23:00",
  },
  {
    name: 'בורגרס בר הרצליה',
    city: 'הרצליה', address: 'ביילינסון 1, הרצליה',
    lat: 32.1655, lng: 34.8438, kosher: 'badatz_beit_yosef',
    hours: "א'-ד': 10:00-23:00 | ה': 10:00-23:30 | ו': 11:00-15:00 | מוצ\"ש: שעה לאחר צאת השבת ועד 23:30",
  },
  {
    name: 'בורגרס בר גבעתיים',
    city: 'גבעתיים', address: 'דרך יצחק רבין 53, גבעתיים',
    lat: 32.0693, lng: 34.8135, kosher: 'badatz_beit_yosef',
    hours: "א'-ד': 10:00-22:30 | ה': 10:00-22:30 | ו': 10:00-15:30 | מוצ\"ש: שעה לאחר צאת השבת ועד 23:00",
  },
  {
    name: 'בורגרס בר נתניה פיאנו',
    city: 'נתניה', address: 'שושנה דמארי 30, מתחם פיאנו, נתניה',
    lat: 32.3295, lng: 34.8581, kosher: 'mehadrin',
    hours: "א'-ד': 11:00-23:30 | ה': 11:00-23:30 | ו': 11:00-15:00 | מוצ\"ש: חצי שעה לאחר צאת השבת ועד 23:30",
  },
  {
    name: 'בורגרס בר עזריאלי רמלה',
    city: 'רמלה', address: 'שדרות דוד רזיאל 1, קניון עזריאלי, רמלה',
    lat: 31.9296, lng: 34.8699, kosher: 'mehadrin',
    hours: "א'-ד': 10:30-22:30 | ה': 10:30-23:00 | ו': 11:00-15:30 | מוצ\"ש: שעה לאחר צאת השבת ועד 23:00",
  },
  {
    name: 'בורגרס בר פתח תקווה',
    city: 'פתח תקווה', address: 'רוטשילד 89, פתח תקווה',
    lat: 32.0935, lng: 34.8807, kosher: 'mehadrin',
    hours: "א'-ד': 11:30-00:00 | ה': 11:30-00:00 | ו': סגור | מוצ\"ש: שעה לאחר צאת השבת ועד 00:00",
  },
  {
    name: 'בורגרס בר ראשון לציון קניון הזהב',
    city: 'ראשון לציון', address: 'קניון הזהב, ראשון לציון',
    lat: 31.9699, lng: 34.7889, kosher: 'badatz_beit_yosef',
    hours: "א'-ד': 11:00-22:30 | ה': 11:00-22:30 | ו': 11:00-15:00 | מוצ\"ש: חצי שעה לאחר צאת השבת ועד 23:30",
    locationPrecision: 'city',
  },
  {
    name: 'בורגרס בר רמת אביב',
    city: 'תל אביב', address: 'מרכז טאגור 30, תל אביב',
    lat: 32.1135, lng: 34.8022, kosher: 'mehadrin',
    hours: "א'-ד': 11:00-23:00 | ה': 11:00-23:30 | ו': 11:00-15:00 | מוצ\"ש: שעה לאחר צאת השבת ועד 23:30",
  },
  {
    name: 'בורגרס בר רעננה',
    city: 'רעננה', address: 'אחוזה 184, רעננה',
    lat: 32.1874, lng: 34.8717, kosher: 'mehadrin',
    hours: "א'-ד': 11:00-23:00 | ה': 11:00-00:00 | ו': 11:00-15:00 | מוצ\"ש: שעה לאחר צאת השבת ועד 00:00",
  },
  {
    name: 'בורגרס בר תל אביב עזריאלי',
    city: 'תל אביב', address: 'קניון עזריאלי, תל אביב',
    lat: 32.0742, lng: 34.7924, kosher: 'badatz_beit_yosef',
    hours: "א'-ד': 09:30-22:00 | ה': 09:30-22:00 | ו': 09:30-15:30 | מוצ\"ש: שעה לאחר צאת השבת ועד 23:00",
    locationPrecision: 'city',
  },
  {
    name: 'בורגרס בר גבעת שמואל',
    city: 'גבעת שמואל', address: 'האורנים 1, גבעת שמואל',
    lat: 32.0773, lng: 34.8524, kosher: 'mehadrin',
    hours: "א'-ד': 11:00-23:30 | ה': 11:00-00:00 | ו': 11:00-15:00 | מוצ\"ש: חצי שעה לאחר צאת השבת ועד 00:00",
  },

  // ── דרום ────────────────────────────────────────────────────────────────
  {
    name: 'בורגרס בר מצפה רמון',
    city: 'מצפה רמון', address: 'שדרות בן גוריון 2, מצפה רמון',
    lat: 30.6096, lng: 34.8020, kosher: 'badatz_beit_yosef',
    hours: "א'-ד': 10:30-23:00 | ה': 10:30-23:00 | ו': 10:00-15:00 | מוצ\"ש: חצי שעה לאחר צאת השבת ועד 23:00",
  },
  {
    name: 'בורגרס בר נתיבות',
    city: 'נתיבות', address: 'בעלי המלאכה 3, פריז סנטר, נתיבות',
    lat: 31.4173, lng: 34.5871, kosher: 'badatz_beit_yosef',
    hours: "א'-ד': 11:00-23:00 | ה': 11:00-23:00 | ו': סגור | מוצ\"ש: שעה לאחר צאת השבת ועד 00:00",
  },
  {
    name: 'בורגרס בר שדרות',
    city: 'שדרות', address: 'ההסתדרות 10, שדרות',
    lat: 31.5264, lng: 34.5962, kosher: 'badatz_beit_yosef',
    hours: "א'-ד': 11:30-23:00 | ה': 11:30-00:00 | ו': סגור | מוצ\"ש: שעה לאחר צאת השבת ועד 00:00",
  },
  {
    name: 'בורגרס בר באר שבע גראנד קניון',
    city: 'באר שבע', address: 'שדרות דוד טוביהו 125, גראנד קניון, באר שבע',
    lat: 31.2503, lng: 34.7854, kosher: 'mehadrin',
    hours: "א'-ד': 11:00-21:30 | ה': 11:00-21:30 | ו': 11:00-15:00 | מוצ\"ש: שעה לאחר צאת השבת ועד 22:30",
    locationPrecision: 'city',
  },
  {
    name: 'בורגרס בר אילת דן',
    city: 'אילת', address: 'החוף הצפוני, דן אילת',
    lat: 29.5606, lng: 34.9510, kosher: 'mehadrin',
    hours: "א'-ד': 10:30-00:00 | ה': 10:30-00:00 | ו': 10:30-17:00 | מוצ\"ש: חצי שעה לאחר צאת השבת ועד 00:00",
    locationPrecision: 'city',
  },
  {
    name: 'בורגרס בר אילת ביג',
    city: 'אילת', address: 'הסתת 20, מרכז ביג, אילת',
    lat: 29.5558, lng: 34.9470, kosher: 'badatz_beit_yosef',
    hours: "א'-ד': 11:00-22:00 | ה': 11:00-22:00 | ו': 11:00-15:00 | מוצ\"ש: חצי שעה לאחר צאת השבת ועד 23:00",
  },
  {
    name: 'בורגרס בר אילת פנינת אילת',
    city: 'אילת', address: 'דרבן 4, מרכז פנינה, אילת',
    lat: 29.5481, lng: 34.9466, kosher: 'mehadrin',
    hours: "א'-ד': 10:30-02:00 | ה': 10:30-02:00 | ו': 10:30-17:00 | מוצ\"ש: חצי שעה לאחר צאת השבת ועד 02:00",
  },
];

// ---------------------------------------------------------------------------
function makeId(name) {
  return 'burgersbar-' + createHash('md5').update(name).digest('hex').slice(0, 8);
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
    website: 'https://burgersbar.co.il',
    openingHours: b.hours,
    category: 'meat',
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
console.log('=== Burgers Bar Import ===');
const places = BRANCHES.map(buildPlace);
console.log(`Building ${places.length} records`);

// Delete OSM duplicates
const OSM_IDS = [
  'osm-node-1299991556', 'osm-node-2165350037',
  'osm-node-2577660818', 'osm-node-4352401257',
];

for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  let data = readJson(filePath);
  const before = data.length;
  data = data.filter(r => !OSM_IDS.includes(r.id));
  const deleted = before - data.length;
  const { merged, added, skipped } = mergeInto(data, places);
  writeJson(filePath, merged);
  console.log(`${path.basename(filePath)}: -${deleted} OSM, +${added} added, ${skipped} skipped`);
}

console.log('\nDone!');
