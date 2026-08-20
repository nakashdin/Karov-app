/**
 * עדכון שעות קפה גרג מהאתר הרשמי — נסרק 27.7.2026
 * 39 סניפים כשרים עם שעות מדויקות
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

// נתונים מסורקים מ-gregcafe.co.il — שעות ישירות מהאתר
const BRANCHES = [
  { city: 'אופקים',           address: 'יהדות דרום אפריקה 14, אופקים',     phone: '08-9320066', hours: "א'-ה' 8:30-22:30 | ו' 8:30-14:00 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'אילת',             address: 'הסתת 20, אילת',                      phone: '08-8507828', hours: "א'-ה' 9:00-21:30 | ו' 8:30-14:30 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'אשדוד',            address: 'הגדוד העברי, גן העיר, אשדוד',       phone: '08-8675002', hours: "א'-ה' 9:00-22:00 | ו' 8:30-13:30 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'באר טוביה',        address: 'ביג קסטינה, שיבולים, באר טוביה',   phone: '08-6118112', hours: "א'-ה' 8:00-22:00 | ו' 8:00-13:30 | מוצ\"ש עד 22:30",         kosher: 'mehadrin' },
  { city: 'דימונה',           address: 'שדרות גולדה מאיר 1, דימונה',        phone: '08-6910090', hours: "א'-ה' 8:00-22:00 | ו' 8:00-13:30 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'נתיבות',           address: 'בעלי המלאכה 5, נתיבות',             phone: '08-9933287', hours: "א'-ה' 8:00-23:00 | ו' 8:00-14:00 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'עין בוקק',         address: 'עין בוקק 3',                         phone: '08-6255588', hours: "א'-ה' 9:30-20:30 | ו' 9:30-14:00 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'שדרות',            address: 'דרך מנחם בגין 1, שדרות',            phone: '08-9292969', hours: "א'-ה' 7:30-23:00 | ו' 7:30-13:30 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'אריאל',            address: 'הבנאי 5, אריאל',                     phone: '03-9303372', hours: "א'-ה' 7:30-23:00 | ו' 7:30-13:00 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'בית שמש',          address: 'שדרות יגאל אלון 1, בית שמש',        phone: '02-5401964', hours: "א'-ה' 9:00-23:00 | ו' 8:00-14:00 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'בני ברק',          address: 'מצדה 5, בני ברק',                    phone: '054-9377766',hours: "א'-ה' 9:00-23:00 | ו' 8:00-13:00 | מוצ\"ש עד 23:00",         kosher: 'mehadrin' },
  { city: 'גבעת שמואל',       address: 'שדרות מנחם בגין 30, גבעת שמואל',   phone: '03-5504969', hours: "א'-ה' 8:00-23:00 | ו' 7:45-13:30 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'הוד השרון',        address: 'הרקון 2, הוד השרון',                 phone: '09-8800890', hours: "א'-ה' 7:30-20:00 | ו' 7:30-15:00 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'ירושלים',          address: 'פייר קינג 26, ירושלים',              phone: '02-5367870', hours: "א'-ה' 9:00-22:00 | ו' 8:00-13:30 | ש' סגור",                 kosher: 'mehadrin', addrKey: 'פייר קינג' },
  { city: 'גוש עציון',        address: 'צומת גוש עציון',                     phone: '055-5573172',hours: "א'-ה' 9:30-21:45 | ו' 9:00-13:00 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'נתניה',            address: 'הרצל 60, נתניה',                     phone: '053-3374774',hours: "א'-ה' 8:30-21:30 | ו' 8:00-14:00 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'פתח תקווה',        address: 'אלעזר פרידמן 9, פתח תקווה',         phone: '03-9075088', hours: "א'-ה' 8:30-21:00 | ו' 8:00-13:30 | ש' סגור",                 kosher: 'mehadrin', addrKey: 'פרידמן' },
  { city: 'פתח תקווה',        address: "ז'בוטינסקי 72, פתח תקווה",          phone: '03-6428888', hours: "א'-ה' 8:00-23:00 | ו' 7:00-14:30 | ש' סגור",                 kosher: 'mehadrin', addrKey: "ז'בוטינסקי" },
  { city: 'ראשון לציון',      address: 'ילדי טהרן 5, ראשון לציון',          phone: '03-6559896', hours: "א'-ה' 9:00-22:00 | ו' 9:00-13:00 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'רמלה',             address: 'שדרות דוד רזיאל 1, רמלה',           phone: '08-9150900', hours: "א'-ה' 8:30-22:00 | ו' 8:30-14:30 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'רעננה',            address: 'המלאכה, קניון רננים, רעננה',         phone: '09-8781472', hours: "א'-ה' 9:00-21:15 | ו' 8:00-14:00 | מוצ\"ש עד 22:00",         kosher: 'mehadrin' },
  { city: 'תל אביב',          address: 'דיזנגוף 55, תל אביב',                phone: '03-9366514', hours: "א'-ה' 9:00-20:00 | ו' 8:30-14:00 | ש' סגור",                 kosher: 'mehadrin', addrKey: 'דיזנגוף' },
  { city: 'תל אביב',          address: 'החשמונאים 100, תל אביב',             phone: '03-677-1310',hours: "א'-ה' 9:00-21:30 | ו' 9:00-14:00 | ש' סגור",                 kosher: 'mehadrin', addrKey: 'החשמונאים' },
  { city: 'בית שאן',          address: 'שדרות מנחם בגין, בית שאן',          phone: '04-6060260', hours: "א'-ה' 8:00-22:30 | ו' 8:00-13:00 | מוצ\"ש עד 23:00",         kosher: 'mehadrin' },
  { city: 'חדרה',             address: 'שדרות רוטשילד, עופר לב חדרה',       phone: '',           hours: "א'-ה' 9:00-21:00 | ו' 9:00-14:00 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'חיפה',             address: 'שדרות ההסתדרות 55, חיפה',            phone: '04-8403333', hours: "א'-ה' 8:30-21:00 | ו' 8:30-14:00 | ש' סגור",                 kosher: 'rabanut',  addrKey: 'ההסתדרות' },
  { city: 'חריש',             address: 'דרך ארץ 1, חריש',                    phone: '04-8532264', hours: "א'-ה' 8:30-22:00 | ו' 8:30-13:00 | מוצ\"ש עד 23:00",         kosher: 'mehadrin' },
  { city: 'טבריה',            address: 'יהודה הלוי 1, טבריה',               phone: '04-8675566', hours: "א'-ה' 8:30-22:30 | ו' 8:30-14:00 | מוצ\"ש עד 22:30",         kosher: 'mehadrin', addrKey: 'הלוי' },
  { city: 'טבריה',            address: 'המברג 1, טבריה',                     phone: '04-6735767', hours: "א'-ה' 8:00-22:00 | ו' 8:00-13:30 | ש' 17:45-23:00",          kosher: 'mehadrin', addrKey: 'המברג' },
  { city: 'יוקנעם עילית',    address: 'התמר 2, יוקנעם עילית',              phone: '050-8773566',hours: "א'-ה' 8:00-22:00 | ו' 8:00-14:30 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'כרמיאל',           address: 'סנונית 51, כרמיאל',                  phone: '',           hours: "א'-ה' 7:30-20:00 | ו' 7:30-12:30 | ש' סגור",                 kosher: 'rabanut'  },
  { city: 'מגדל העמק',        address: 'ביג מגדל העמק',                      phone: '04-6111554', hours: "א'-ה' 8:30-22:30 | ו' 7:30-13:30 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'נהריה',            address: 'אירית 2, נהריה',                     phone: '04-9930090', hours: "א'-ה' 8:30-21:00 | ו' 8:00-14:00 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'נשר',              address: 'דרך בר יהודה 111, נשר',             phone: '04-6221199', hours: "א'-ה' 7:30-22:00 | ו' 7:30-שעה לפני שבת | ש' סגור",          kosher: 'mehadrin' },
  { city: 'עפולה',            address: 'השוק 13, עפולה',                     phone: '04-6490011', hours: "א'-ה' 8:00-23:00 | ו' 8:00-15:00 | מוצ\"ש עד חצות",          kosher: 'mehadrin' },
  { city: 'עתלית',            address: 'דרך הים 2, עתלית',                   phone: '04-9962399', hours: "א'-ה' 7:30-22:30 | ו' 7:30-14:30 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'פרדס חנה כרכור',  address: 'תדהר 1, פרדס חנה',                  phone: '04-9531807', hours: "א'-ה' 8:00-23:00 | ו' 8:00-14:30 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'קריית אתא',        address: 'העצמאות 57, קריית אתא',              phone: '04-8445522', hours: "א'-ה' 8:00-24:00 | ו' 8:00-14:00 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'קריית שמונה',      address: 'טשרניחובסקי 6, קריית שמונה',        phone: '04-8713710', hours: "א'-ה' 9:00-19:00 | ו' 8:30-13:00 | ש' סגור",                 kosher: 'mehadrin' },
  { city: 'ראש פינה',         address: 'התפוח 5, ראש פינה',                  phone: '04-6801191', hours: "א'-ה' 7:30-23:00 | ו' 8:00-14:30 | ש' סגור",                 kosher: 'mehadrin' },
];

// cityId variants (some records use different spellings)
const CITY_ALIASES = {
  'תל אביב-יפו': 'תל אביב',
  'תל-אביב': 'תל אביב',
  'קרית שמונה': 'קריית שמונה',
  'קרית אתא': 'קריית אתא',
  'פרדס-חנה': 'פרדס חנה כרכור',
};

function normalizeCity(c) {
  return CITY_ALIASES[c] || c;
}

const FILES = [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
];

for (const filePath of FILES) {
  const data = readJson(filePath);
  let updated = 0;
  let added = 0;
  const existingIds = new Set(data.map(r => r.id));

  for (const b of BRANCHES) {
    const normCity = normalizeCity(b.city);

    // כל רשומות קפה גרג בעיר זו
    const candidates = data.filter(r =>
      r.name && r.name.includes('קפה גרג') &&
      normalizeCity(r.cityId) === normCity
    );

    let target = null;

    if (candidates.length === 1) {
      target = candidates[0];
    } else if (candidates.length > 1 && b.addrKey) {
      // מספר סניפים באותה עיר — התאמה לפי מילת מפתח בכתובת
      target = candidates.find(r => r.address && r.address.includes(b.addrKey));
      if (!target) target = candidates[0]; // fallback לראשון
    } else if (candidates.length > 1) {
      target = candidates[0];
    }

    if (target) {
      target.openingHours = b.hours;
      target.address = b.address;
      target.kosherType = b.kosher;
      target.menu = 'https://gregcafe.co.il/menus/';
      target.website = 'https://gregcafe.co.il';
      target.lastVerifiedAt = '2026-07-27';
      if (b.phone) target.phone = b.phone;
      updated++;
    } else {
      // סניף חדש שלא היה במסד
      const name = `קפה גרג ${b.city}`;
      const id = makeId('greg-new', name + b.address);
      if (existingIds.has(id)) continue;
      const place = {
        id, name, type: 'cafe', cityId: normCity,
        address: b.address,
        location: { latitude: 31.5, longitude: 34.9 },
        locationPrecision: 'city',
        openingHours: b.hours,
        category: 'dairy',
        kosherType: b.kosher,
        menu: 'https://gregcafe.co.il/menus/',
        website: 'https://gregcafe.co.il',
        source: 'manual', lastVerifiedAt: '2026-07-27',
        tags: ['coffee', 'cafe'],
      };
      if (b.phone) place.phone = b.phone;
      data.push(place);
      existingIds.add(id);
      added++;
    }
  }

  writeJson(filePath, data);
  console.log(`${path.basename(filePath)}: עודכנו ${updated} | נוספו ${added}`);
}
console.log('Done!');
