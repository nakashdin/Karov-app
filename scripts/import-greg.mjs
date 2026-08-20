/**
 * Greg Cafe kosher branches importer
 * Source: gregcafe.co.il/branches + individual branch pages (scraped via scrape-greg.mjs)
 * Filter: kosher=true only (mehadrin / kosher) — 39 branches
 * Excluded: non-kosher (13), Arab cities (4), temporarily closed (1)
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

// ---------------------------------------------------------------------------
// Kosher branches — scraped 2026-07-14 from gregcafe.co.il
// ---------------------------------------------------------------------------
const GREG_BRANCHES = [
  {
    gregId: 7634,
    name: 'קפה גרג מגדל העמק',
    city: 'מגדל העמק',
    address: 'BIG מגדל העמק, מגדל העמק',
    lat: 32.6927233, lng: 35.2279386,
    phone: '1700-70-4407', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 7583,
    name: 'קפה גרג גן העיר אשדוד',
    city: 'אשדוד',
    address: 'גן העיר, הגדוד העברי, אשדוד',
    lat: 31.7908807, lng: 34.6381046,
    phone: '08-8675002', kosher: 'badatz_beit_yosef',
    hours: 'א-ה 9:00-22:00 | ו 8:30-13:30 | מוצ"ש סגור',
  },
  {
    gregId: 7197,
    name: 'קפה גרג פארק תעשיות אפק',
    city: 'ראש העין',
    address: 'גב ים, פארק תעשייה אפק, ראש העין',
    lat: 32.1060921, lng: 34.9687576,
    phone: '03-5566667', kosher: 'kosher',
    hours: null,
  },
  {
    gregId: 7174,
    name: 'קפה גרג דנילוף טבריה',
    city: 'טבריה',
    address: 'יהודה הלוי 1, טבריה',
    lat: 32.7904643, lng: 35.5338050,
    phone: '04-8675566', kosher: 'mehadrin',
    hours: 'א-ה 08:30-22:30 | ו 08:30-14:00 | מוצ"ש חצי שעה לאחר צאת שבת עד 22:30',
  },
  {
    gregId: 5996,
    name: 'קפה גרג חדרה',
    city: 'חדרה',
    address: 'עופר לב חדרה, שדרות רוטשילד, חדרה',
    lat: 32.4378941, lng: 34.9219993,
    phone: '1700-70-4407', kosher: 'mehadrin',
    hours: 'א-ה 9:00-21:00 | ו 9:00-14:00 | מוצ"ש סגור',
  },
  {
    gregId: 5938,
    name: 'קפה גרג רננים רעננה',
    city: 'רעננה',
    address: 'קניון רננים, המלאכה, רעננה',
    lat: 32.1974472, lng: 34.8780966,
    phone: '09-8781472', kosher: 'mehadrin',
    hours: 'א-ה 9:00-21:15 | ו 08:00-14:00 | מוצ"ש חצי שעה לאחר צאת שבת עד 22:00',
  },
  {
    gregId: 671,
    name: 'קפה גרג גוש עציון',
    city: 'גוש עציון',
    address: 'צומת גוש עציון',
    lat: 31.645207, lng: 35.1309302,
    phone: '055-5573172', kosher: 'mehadrin',
    hours: 'א-ה 9:30-21:45 | ו 9:00-13:00',
  },
  {
    gregId: 670,
    name: 'קפה גרג קניון הדר ירושלים',
    city: 'ירושלים',
    address: 'קניון הדר, ירושלים',
    lat: 31.768319, lng: 35.21371,
    phone: '02-5367870', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 664,
    name: 'קפה גרג ב.ס.ר בני ברק',
    city: 'בני ברק',
    address: 'מצדה 5, בני ברק',
    lat: 32.093639, lng: 34.8247297,
    phone: '054-9377766', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 659,
    name: 'קפה גרג ים המלח',
    city: 'ים המלח',
    address: 'עין בוקק',
    lat: 31.1991222, lng: 35.3641236,
    phone: '08-6255588', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 657,
    name: 'קפה גרג פוריה טבריה',
    city: 'טבריה',
    address: 'המברג 1, טבריה',
    lat: 32.7853923, lng: 35.4984742,
    phone: '04-6735767', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 656,
    name: 'קפה גרג נשר',
    city: 'נשר',
    address: 'דרך בר יהודה 111, נשר',
    lat: 32.771792, lng: 35.0468566,
    phone: '04-6221199', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 654,
    name: 'קפה גרג בית שאן',
    city: 'בית שאן',
    address: 'שדרות מנחם בגין, בית שאן',
    lat: 32.4991152, lng: 35.5046608,
    phone: '04-6060260', kosher: 'mehadrin',
    hours: 'א-ה 08:00-22:30 | ו 08:00-13:00 | מוצ"ש חצי שעה לאחר צאת שבת עד 23:00',
  },
  {
    gregId: 650,
    name: 'קפה גרג בית שמש',
    city: 'בית שמש',
    address: 'שדרות יגאל אלון 1, בית שמש',
    lat: 31.7560341, lng: 34.9904465,
    phone: '02-5401964', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 649,
    name: 'קפה גרג TLV תל אביב',
    city: 'תל אביב',
    address: 'TLV Fashion Mall, קרליבך, תל אביב',
    lat: 32.0678229, lng: 34.7834787,
    phone: '03-677-1310', kosher: 'mehadrin',
    hours: 'א-ה 9:00-21:30 | ו 9:00-14:00',
  },
  {
    gregId: 648,
    name: 'קפה גרג דיזנגוף סנטר',
    city: 'תל אביב',
    address: 'דיזנגוף 55, תל אביב',
    lat: 32.0754236, lng: 34.7748328,
    phone: '1700-70-4407', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 646,
    name: 'קפה גרג הקניון הגדול פתח תקווה',
    city: 'פתח תקווה',
    address: 'עופר הקניון הגדול, ז\'בוטינסקי 72, פתח תקווה',
    lat: 32.0932981, lng: 34.8653481,
    phone: '03-6428888', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 645,
    name: 'קפה גרג סירקין פתח תקווה',
    city: 'פתח תקווה',
    address: 'אלעזר פרידמן 9, פתח תקווה',
    lat: 32.0794457, lng: 34.9025999,
    phone: '03-9075088', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 644,
    name: 'קפה גרג גבעת שמואל',
    city: 'גבעת שמואל',
    address: 'שדרות מנחם בגין 30, גבעת שמואל',
    lat: 32.0756581, lng: 34.8545348,
    phone: '03-5504969', kosher: 'mehadrin',
    hours: 'א-ה 8:00-23:00 | ו 7:45-13:30',
  },
  {
    gregId: 643,
    name: 'קפה גרג שרונים הוד השרון',
    city: 'הוד השרון',
    address: 'הרקון 2, הוד השרון',
    lat: 32.1333401, lng: 34.9014664,
    phone: '09-8800890', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 642,
    name: 'קפה גרג נתניה השרון',
    city: 'נתניה',
    address: 'הרצל 60, נתניה',
    lat: 32.3264108, lng: 34.8618993,
    phone: '053-3374774', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 639,
    name: 'קפה גרג פרדס חנה',
    city: 'פרדס חנה',
    address: 'תדהר 1, פרדס חנה כרכור',
    lat: 32.4871179, lng: 34.9705137,
    phone: '1700-70-4407', kosher: 'mehadrin',
    hours: 'א-ה 8:00-23:00 | ו 8:00-14:30',
  },
  {
    gregId: 638,
    name: 'קפה גרג אריאל',
    city: 'אריאל',
    address: 'הבנאי 5, אריאל',
    lat: 32.1007172, lng: 35.1701921,
    phone: '03-9303372', kosher: 'mehadrin',
    hours: 'א-ה 07:30-23:00 | ו 07:30-13:00',
  },
  {
    gregId: 633,
    name: 'קפה גרג ביג אילת',
    city: 'אילת',
    address: 'ביג אילת, הסתת 20, אילת',
    lat: 29.5664539, lng: 34.9596748,
    phone: '08-8507828', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 630,
    name: 'קפה גרג דימונה',
    city: 'דימונה',
    address: 'שדרות גולדה מאיר 1, דימונה',
    lat: 31.0742063, lng: 35.032363,
    phone: '08-6910090', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 629,
    name: 'קפה גרג אופקים',
    city: 'אופקים',
    address: 'יהדות דרום אפריקה 14, אופקים',
    lat: 31.3152934, lng: 34.6237812,
    phone: '08-9320066', kosher: 'mehadrin',
    hours: 'א-ה 8:30-22:30 | ו 8:30-14:00',
  },
  {
    gregId: 628,
    name: 'קפה גרג שדרות',
    city: 'שדרות',
    address: 'דרך מנחם בגין 1, שדרות',
    lat: 31.5256004, lng: 34.6031203,
    phone: '08-9292969', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 627,
    name: 'קפה גרג נתיבות',
    city: 'נתיבות',
    address: 'בעלי המלאכה 5, נתיבות',
    lat: 31.4183917, lng: 34.5990347,
    phone: '08-9933287', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 626,
    name: 'קפה גרג קסטינה',
    city: 'באר טוביה',
    address: 'ביג קסטינה, שיבולים, באר טוביה',
    lat: 31.728028, lng: 34.7550671,
    phone: '08-6118112', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 625,
    name: 'קפה גרג רמלה',
    city: 'רמלה',
    address: 'קניון עזריאלי רמלה, שדרות דוד רזיאל 1, רמלה',
    lat: 31.9257549, lng: 34.8639629,
    phone: '08-9150900', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 624,
    name: 'קפה גרג חריש',
    city: 'חריש',
    address: 'ארץ 1, חריש',
    lat: 32.4705038, lng: 35.0392878,
    phone: '04-8532264', kosher: 'mehadrin',
    hours: 'א-ה 8:30-22:00 | ו 8:30-13:00 | מוצ"ש שעה לאחר צאת שבת עד 23:00',
  },
  {
    gregId: 617,
    name: 'קפה גרג קרית אתא',
    city: 'קריית אתא',
    address: 'העצמאות 57, קרית אתא',
    lat: 32.8061731, lng: 35.1035172,
    phone: '04-8445522', kosher: 'mehadrin',
    hours: 'א-ה 08:00-24:00 | ו 08:00-14:00',
  },
  {
    gregId: 615,
    name: 'קפה גרג עתלית',
    city: 'עתלית',
    address: 'דרך הים 2, עתלית',
    lat: 32.7104359, lng: 34.9481538,
    phone: '04-9962399', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 614,
    name: 'קפה גרג יוקנעם',
    city: 'יוקנעם',
    address: 'התמר 2, יוקנעם עילית',
    lat: 32.6595831, lng: 35.1051293,
    phone: '050-8773566', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 613,
    name: 'קפה גרג לב המפרץ חיפה',
    city: 'חיפה',
    address: 'שדרות ההסתדרות 55, חיפה',
    lat: 32.7934932, lng: 35.0377411,
    phone: '04-8403333', kosher: 'kosher',
    hours: null,
  },
  {
    gregId: 608,
    name: 'קפה גרג עפולה',
    city: 'עפולה',
    address: 'השוק 13, עפולה',
    lat: 32.6061191, lng: 35.2929707,
    phone: '04-6490011', kosher: 'mehadrin',
    hours: 'א-ה 8:00-23:00 | ו 8:00-15:00 | מוצ"ש צאת שבת עד חצות',
  },
  {
    gregId: 607,
    name: 'קפה גרג קניון נהריה',
    city: 'נהריה',
    address: 'אירית 2, נהריה',
    lat: 32.9901794, lng: 35.0953318,
    phone: '04-9930090', kosher: 'mehadrin',
    hours: null,
  },
  {
    gregId: 606,
    name: 'קפה גרג מכללת בראודה כרמיאל',
    city: 'כרמיאל',
    address: 'סנונית 51, כרמיאל',
    lat: 32.914671, lng: 35.292417,
    phone: '1700-70-4407', kosher: 'kosher',
    hours: 'א-ה 7:30-20:00 | ו 7:30-12:30',
  },
  {
    gregId: 604,
    name: 'קפה גרג ראש פינה',
    city: 'ראש פינה',
    address: 'התפוח 5, ראש פינה',
    lat: 32.9697787, lng: 35.5503856,
    phone: '04-6801191', kosher: 'mehadrin',
    hours: null,
  },
];

// ---------------------------------------------------------------------------
// Build Place records
// ---------------------------------------------------------------------------
function makeCityId(city) {
  return city.replace(/\s+/g, ' ').trim();
}

function makeId(gregId) {
  const hash = createHash('md5').update(String(gregId)).digest('hex').slice(0, 8);
  return `greg-${hash}`;
}

function buildPlace(b) {
  return {
    id: makeId(b.gregId),
    name: b.name,
    type: 'cafe',
    cityId: makeCityId(b.city),
    address: b.address,
    location: { latitude: b.lat, longitude: b.lng },
    phone: b.phone,
    website: 'https://gregcafe.co.il',
    instagram: 'https://www.instagram.com/greg_cafe/',
    facebook: 'https://www.facebook.com/gregcafe/',
    ...(b.hours ? { openingHours: b.hours } : {}),
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
// Validate
// ---------------------------------------------------------------------------
console.log('=== Greg Cafe Import ===');
console.log(`Building ${GREG_BRANCHES.length} place records...`);

const places = GREG_BRANCHES.map(buildPlace);

// Quick validation
const mehadrin = places.filter(p => p.kosherType === 'mehadrin').length;
const kosher = places.filter(p => p.kosherType === 'kosher').length;
const badatz = places.filter(p => p.kosherType === 'badatz_beit_yosef').length;
const withPhone = places.filter(p => p.phone).length;
const withHours = places.filter(p => p.openingHours).length;
console.log(`  מהדרין: ${mehadrin} | כשר: ${kosher} | בד"צ בית יוסף: ${badatz}`);
console.log(`  עם טלפון: ${withPhone}/${places.length} | עם שעות: ${withHours}/${places.length}`);

// Merge into restaurants.osm.json
const restaurantsPath = path.join(DATA_DIR, 'restaurants.osm.json');
const restaurants = readJson(restaurantsPath);
const r = mergeInto(restaurants, places);
writeJson(restaurantsPath, r.merged);
console.log(`\nrestaurants.osm.json: +${r.added} added, ${r.skipped} skipped`);

// Merge into places.osm.json
const placesPath = path.join(DATA_DIR, 'places.osm.json');
const allPlaces = readJson(placesPath);
const p = mergeInto(allPlaces, places);
writeJson(placesPath, p.merged);
console.log(`places.osm.json:      +${p.added} added, ${p.skipped} skipped`);

console.log('\nDone!');
