/**
 * Landwer Cafe kosher branches importer
 * Source: landwercafe.co.il/מסעדות — all branches with kosher label
 * Filter: only branches labeled כשר / כשר למהדרין AND not open on Shabbat
 * Total: 20 branches (12 mehadrin + 8 kosher)
 * Excluded: ~35 non-kosher + Airport City (kosher label but open Shabbat from 08:00)
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

// ---------------------------------------------------------------------------
// Kosher branches — scraped 2026-07-14 from landwercafe.co.il/מסעדות
// ---------------------------------------------------------------------------
const LANDWER_BRANCHES = [
  // ── צפון ────────────────────────────────────────────────────────────────
  {
    name: 'לנדוור קפה חדרה',
    city: 'חדרה',
    address: 'שכטרמן 10, חדרה',
    lat: 32.4417243, lng: 34.8950613,
    phone: '04-8886535', kosher: 'mehadrin',
    hours: 'א-ה 08:30-22:00 | ו 08:00-14:00 | מוצ"ש 30 דקות לאחר צאת שבת',
  },
  {
    name: 'לנדוור קפה קריון',
    city: 'קריית ביאליק',
    address: 'דרך עכו 192, עופר הקריון',
    lat: 32.8441591, lng: 35.091106,
    phone: '04-6306496', kosher: 'kosher',
    hours: 'א-ה 09:00-22:00 | ו 08:30-14:30 | מוצ"ש 30 דקות לאחר צאת שבת עד 23:00',
  },
  {
    name: 'לנדוור קפה עפולה כשר',
    city: 'עפולה',
    address: 'המלאכה 21, עפולה',
    lat: 32.6022792, lng: 35.2941642,
    phone: '04-9022040', kosher: 'mehadrin',
    hours: 'א-ה 09:00-22:30 | ו 08:00-15:00 | מוצ"ש 18:30-23:30',
  },
  {
    name: 'לנדוור קפה בנימינה',
    city: 'בנימינה',
    address: 'השריג 2, בנימינה',
    lat: 32.5176642, lng: 34.9403543,
    phone: '04-6772585', kosher: 'kosher',
    hours: 'א-ה 08:30-22:00 | ו 08:30-13:30 | מוצ"ש 19:00-23:00',
  },
  // ── שרון ────────────────────────────────────────────────────────────────
  {
    name: 'לנדוור קפה כפר סבא רוטשילד',
    city: 'כפר סבא',
    address: 'רוטשילד 59, כפר סבא',
    lat: 32.1761468, lng: 34.9085115,
    phone: '09-9554665', kosher: 'kosher',
    hours: 'א-ה 08:30-22:30 | ו 08:30-14:00 | ש סגור',
  },
  {
    name: 'לנדוור קפה נתניה קריית השרון',
    city: 'נתניה',
    address: 'טום לנטוס 26, מרכז אלון, נתניה',
    lat: 32.3068902, lng: 34.8690551,
    phone: '09-9744361', kosher: 'kosher',
    hours: 'א-ה 08:00-22:30 | ו 08:00-15:00 | ש סגור',
  },
  // ── תל אביב ─────────────────────────────────────────────────────────────
  {
    name: 'לנדוור קפה עזריאלי תל אביב',
    city: 'תל אביב',
    address: 'מגדלי עזריאלי, דרך מנחם בגין 132, תל אביב',
    lat: 32.0740769, lng: 34.7922028,
    phone: '050-8572530', kosher: 'kosher',
    hours: 'א-ה 08:30-22:00 | ו 08:00-13:30 | מוצ"ש שעה לאחר צאת שבת עד 23:00',
  },
  {
    name: 'לנדוור קפה קניון איילון',
    city: 'רמת גן',
    address: 'אבא הלל סילבר 301, קניון איילון, רמת גן',
    lat: 32.1004415, lng: 34.8266107,
    phone: '03-9651555', kosher: 'kosher',
    hours: 'א-ה 09:00-22:00 | ו 08:30-14:30 | מוצ"ש שעה לאחר צאת שבת',
  },
  // ── מרכז ────────────────────────────────────────────────────────────────
  {
    name: 'לנדוור קפה גבעת שמואל',
    city: 'גבעת שמואל',
    address: 'מנחם בגין 38, גבעת שמואל',
    lat: 32.077327, lng: 34.8543621,
    phone: '03-7163338', kosher: 'mehadrin',
    hours: 'א-ה 08:30-23:00 | ו 08:00-14:00 | מוצ"ש שעה לאחר צאת שבת עד 23:30',
  },
  {
    name: 'לנדוור קפה קניון גדול פתח תקווה',
    city: 'פתח תקווה',
    address: 'ז\'בוטינסקי 72, הקניון הגדול, פתח תקווה',
    lat: 32.0932981, lng: 34.8653481,
    phone: '03-9222692', kosher: 'mehadrin',
    hours: 'א-ה 09:00-22:30 | ו 09:00-15:00 | מוצ"ש שעה לאחר צאת שבת עד 23:30',
  },
  {
    name: 'לנדוור קפה עזריאלי ראשונים ראשון לציון',
    city: 'ראשון לציון',
    address: 'שדרות נים 2, קניון ראשונים, ראשון לציון',
    lat: 31.9501768, lng: 34.8029427,
    phone: '03-9677656', kosher: 'mehadrin',
    hours: 'א-ה 08:30-23:00 | ו 08:30-14:30 | מוצ"ש שעה לאחר צאת שבת עד 23:00',
  },
  {
    name: 'לנדוור קפה אור יהודה',
    city: 'אור יהודה',
    address: 'יהדות קנדה 1, אור יהודה',
    lat: 32.0205632, lng: 34.8598209,
    phone: '03-5663373', kosher: 'mehadrin',
    hours: 'א-ה 09:00-16:00 | ו 08:00-13:00 | מוצ"ש לאחר צאת שבת עד 23:00',
  },
  // ── ירושלים והשפלה ───────────────────────────────────────────────────────
  {
    name: 'לנדוור קפה מבשרת ציון',
    city: 'מבשרת ציון',
    address: 'קניון הראל, מבשרת ציון',
    lat: 31.7998291, lng: 35.1489846,
    phone: '02-6769898', kosher: 'mehadrin',
    hours: 'א-ה 08:00-22:00 | ו 07:30-14:30',
  },
  {
    name: 'לנדוור קפה אריאל',
    city: 'אריאל',
    address: 'מוריה 2, אריאל סנטר, אריאל',
    lat: 32.1022953, lng: 35.2069928,
    phone: '03-6174185', kosher: 'mehadrin',
    hours: 'א-ה 08:30-22:30 | ו 08:30-13:00 | מוצ"ש שעה לאחר צאת שבת עד 23:15',
  },
  {
    name: 'לנדוור קפה קניון רחובות',
    city: 'רחובות',
    address: 'בילו 2, קניון רחובות, רחובות',
    lat: 31.8933068, lng: 34.8068242,
    phone: '08-6165677', kosher: 'mehadrin',
    hours: 'א-ה 09:00-22:00 | ו 09:00-13:30 | מוצ"ש 30 דקות לאחר צאת שבת עד 23:00',
  },
  {
    name: 'לנדוור קפה פארק המדע רחובות',
    city: 'רחובות',
    address: 'פקריס 2, פארק המדע, רחובות',
    lat: 31.9107608, lng: 34.805817,
    phone: '08-9331807', kosher: 'mehadrin',
    hours: 'א-ה 09:00-22:00 | ו 08:30-16:00 | מוצ"ש 20:00-00:00',
  },
  // ── דרום ────────────────────────────────────────────────────────────────
  {
    name: 'לנדוור קפה ביג אשדוד',
    city: 'אשדוד',
    address: 'אריאל שרון 1, ביג, אשדוד',
    lat: 31.7766348, lng: 34.6637991,
    phone: '08-6378070', kosher: 'kosher',
    hours: 'א-ד 08:00-22:30 | ה 08:00-23:00 | ו 07:45-13:45 | מוצ"ש 30 דקות לאחר צאת שבת',
  },
  {
    name: 'לנדוור קפה אשקלון ברנע',
    city: 'אשקלון',
    address: 'שדרות ירושלים 119, אשקלון',
    lat: 31.6707, lng: 34.5713,
    locationPrecision: 'city',
    phone: '08-6483349', kosher: 'mehadrin',
    hours: 'א-ה 08:30-23:00 | ו 08:00-13:30 | מוצ"ש שעה לאחר צאת שבת עד 23:00',
  },
  {
    name: 'לנדוור קפה שדרות',
    city: 'שדרות',
    address: 'אריאל שרון 19, שדרות',
    lat: 31.5280202, lng: 34.6048996,
    phone: '08-633-0006', kosher: 'mehadrin',
    hours: 'א-ה 08:30-20:00 | ו 08:30-14:00 | ש סגור',
  },
  {
    name: 'לנדוור קפה נתיבות',
    city: 'נתיבות',
    address: 'בעלי המלאכה 27, G סנטר, נתיבות',
    lat: 31.4195764, lng: 34.5985336,
    phone: '08-6586088', kosher: 'mehadrin',
    hours: 'א-ה 08:00-23:00 | ו 08:00-13:00 | מוצ"ש שעה לאחר צאת שבת',
  },
];

// ---------------------------------------------------------------------------
// Build Place records
// ---------------------------------------------------------------------------
function makeId(name) {
  const hash = createHash('md5').update(name).digest('hex').slice(0, 8);
  return `landwer-${hash}`;
}

function buildPlace(b) {
  return {
    id: makeId(b.name),
    name: b.name,
    type: 'cafe',
    cityId: b.city,
    address: b.address,
    location: { latitude: b.lat, longitude: b.lng },
    ...(b.locationPrecision ? { locationPrecision: b.locationPrecision } : {}),
    phone: b.phone,
    website: 'https://www.landwercafe.co.il',
    instagram: 'https://www.instagram.com/landwercafe/',
    facebook: 'https://www.facebook.com/landwercafe/',
    openingHours: b.hours,
    category: 'dairy',
    kosherType: b.kosher,
    source: 'manual',
    lastVerifiedAt: '2026-07-14',
  };
}

// ---------------------------------------------------------------------------
// Read, merge, write
// ---------------------------------------------------------------------------
function readJson(filePath) {
  const raw = readFileSync(filePath);
  const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
  return JSON.parse(str);
}

function writeJson(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  writeFileSync(filePath, Buffer.concat([BOM, Buffer.from(json, 'utf8')]));
}

function mergeInto(existing, newRecords) {
  const existingIds = new Set(existing.map(r => r.id));
  const toAdd = newRecords.filter(r => !existingIds.has(r.id));
  return { merged: [...existing, ...toAdd], added: toAdd.length, skipped: newRecords.length - toAdd.length };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
console.log('=== Landwer Cafe Import ===');
const places = LANDWER_BRANCHES.map(buildPlace);

const mehadrin = places.filter(p => p.kosherType === 'mehadrin').length;
const kosher = places.filter(p => p.kosherType === 'kosher').length;
console.log(`Building ${places.length} records: מהדרין ${mehadrin} | כשר ${kosher}`);

const restaurantsPath = path.join(DATA_DIR, 'restaurants.osm.json');
const restaurants = readJson(restaurantsPath);
const r = mergeInto(restaurants, places);
writeJson(restaurantsPath, r.merged);
console.log(`restaurants.osm.json: +${r.added} added, ${r.skipped} skipped`);

const placesPath = path.join(DATA_DIR, 'places.osm.json');
const allPlaces = readJson(placesPath);
const p = mergeInto(allPlaces, places);
writeJson(placesPath, p.merged);
console.log(`places.osm.json:      +${p.added} added, ${p.skipped} skipped`);

console.log('\nDone!');
