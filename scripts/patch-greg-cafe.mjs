/**
 * Patch קפה גרג — מעדכן שעות, טלפון, כשרות, תפריט מהאתר הרשמי
 * מסנן: רק סניפים כשרים (לא בשרי + לא ערים ערביות)
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

// =====================================================================
// ערים ערביות / סניפים בשריים ללא כשרות — לא רלוונטי לאפליקציה
// =====================================================================
const SKIP_CITIES = new Set([
  'באקה אל-ע\'רביה', 'טירה', 'נצרת', 'נוף הגליל', 'ערערה', 'בית רימון'
]);

// =====================================================================
// מפת הסניפים מהאתר (57 סניפים, נסרקו 24.7.2026)
// =====================================================================
const RAW = [
  { name: 'סניף אופקים', city: 'אופקים', address: 'יהדות דרום אפריקה 14, אופקים', phone: '08-9320066', rawHours: 'א-ה 8:30-22:30 יום ו\' 8:30-14:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף ביג אילת', city: 'אילת', address: 'הסתת 20, אילת', phone: '08-8507828', rawHours: 'א\'-ה\' 9:00-21:30 | ו\' 8:30-14:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף גן העיר', city: 'אשדוד', address: 'הגדוד העברי, גן העיר, אשדוד', phone: '08-8675002', rawHours: 'א\'-ה\' 9:00-22:00 | ו\' 8:30-13:30 | ש\' סגור', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף קסטינה', city: 'באר טוביה', address: 'ביג קסטינה, שיבולים, באר טוביה', phone: '08-6118112', rawHours: 'א\'-ה\' 8:00-22:00 | ו\' 8:00-13:30 | ש\' שעה אחרי שבת עד 22:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף דימונה', city: 'דימונה', address: 'שדרות גולדה מאיר 1, דימונה', phone: '08-6910090', rawHours: 'א\'-ה\' 8:00-22:00 | ו\' 8:00-13:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף נתיבות', city: 'נתיבות', address: 'בעלי המלאכה 5, נתיבות', phone: '08-9933287', rawHours: 'א\'-ה\' 8:00-23:00 | ו\' 8:00-14:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף ים המלח', city: 'עין בוקק', address: 'עין בוקק 3', phone: '08-6255588', rawHours: 'א\'-ה\' 9:30-20:30 | ו\' 9:30-14:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף שדרות', city: 'שדרות', address: 'דרך מנחם בגין 1, שדרות', phone: '08-9292969', rawHours: 'א\'-ה\' 7:30-23:00 | ו\' 7:30-13:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף אריאל', city: 'אריאל', address: 'הבנאי 5, אריאל', phone: '03-9303372', rawHours: 'א\'-ה\' 7:30-23:00 | ו\' 7:30-13:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף בית שמש', city: 'בית שמש', address: 'שדרות יגאל אלון 1, בית שמש', phone: '02-5401964', rawHours: 'א\'-ה\' 9:00-23:00 | ו\' 8:00-14:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף ב.ס.ר בני ברק', city: 'בני ברק', address: 'מצדה 5, בני ברק', phone: '054-9377766', rawHours: 'א\'-ה\' 9:00-23:00 | ו\' 8:00-13:00 | ש\' שעה אחרי שבת עד 23:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף גבעת שמואל', city: 'גבעת שמואל', address: 'שדרות מנחם בגין 30, גבעת שמואל', phone: '03-5504969', rawHours: 'א\'-ה\' 8:00-23:00 | ו\' 7:45-13:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף שרונים', city: 'הוד השרון', address: 'הרקון 2, הוד השרון', phone: '09-8800890', rawHours: 'א\'-ה\' 7:30-20:00 | ו\' 7:30-15:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף קניון הדר', city: 'ירושלים', address: 'פייר קינג 26, ירושלים', phone: '02-5367870', rawHours: 'א\'-ה\' 9:00-22:00 | ו\' 8:00-13:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף גוש עציון', city: 'גוש עציון', address: 'צומת גוש עציון', phone: '055-5573172', rawHours: 'א\'-ה\' 9:30-21:45 | ו\' 9:00-13:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף נתניה השרון', city: 'נתניה', address: 'הרצל 60, נתניה', phone: '053-3374774', rawHours: 'א\'-ה\' 8:30-21:30 | ו\' 8:00-14:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף הקניון הגדול', city: 'פתח תקווה', address: "ז'בוטינסקי 72, פתח תקווה", phone: '03-6428888', rawHours: 'א\'-ה\' 8:00-23:00 | ו\' 7:00-14:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף סירקין', city: 'פתח תקווה', address: 'אלעזר פרידמן 9, פתח תקווה', phone: '03-9075088', rawHours: 'א\'-ה\' 8:30-21:00 | ו\' 8:00-13:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף פארק תעשיות אפק', city: 'ראש העין', address: 'המלאכה, פארק תעשייה אפק, ראש העין', phone: '03-5566667', rawHours: 'א\'-ה\' 8:00-22:00 | ו\' 8:00-14:00', kosher: 'rabanut', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף G2', city: 'ראשון לציון', address: 'ילדי טהרן 5, ראשון לציון', phone: '03-6559896', rawHours: 'א\'-ה\' 9:00-22:00 | ו\' 9:00-13:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף רמלה', city: 'רמלה', address: 'שדרות דוד רזיאל 1, קניון עזריאלי רמלה', phone: '08-9150900', rawHours: 'א\'-ה\' 8:30-22:00 | ו\' 8:30-14:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף רננים', city: 'רעננה', address: 'המלאכה, קניון רננים, רעננה', phone: '09-8781472', rawHours: 'א\'-ה\' 9:00-21:15 | ו\' 8:00-14:00 | ש\' שעה אחרי שבת עד 22:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף TLV', city: 'תל אביב', address: 'החשמונאים 100, תל אביב', phone: '03-677-1310', rawHours: 'א\'-ה\' 9:00-21:30 | ו\' 9:00-14:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף דיזנגוף סנטר', city: 'תל אביב', address: 'דיזנגוף 55, תל אביב', phone: '03-9366514', rawHours: 'א\'-ה\' 9:00-20:00 | ו\' 8:30-14:00 | ש\' סגור', kosher: 'rabanut', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף בית שאן', city: 'בית שאן', address: 'שדרות מנחם בגין, קניון בנימין, בית שאן', phone: '04-6060260', rawHours: 'א\'-ה\' 8:00-22:30 | ו\' 8:00-13:00 | ש\' שעה אחרי שבת עד 23:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף חדרה', city: 'חדרה', address: 'שדרות רוטשילד, עופר לב חדרה', phone: '', rawHours: 'א\'-ה\' 9:00-21:00 | ו\' 9:00-14:00 | ש\' סגור', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף גרג סינמול', city: 'חיפה', address: 'שדרות ההסתדרות 55, חיפה', phone: '04-8403333', rawHours: 'א\'-ה\' 8:30-21:00 | ו\' 8:30-14:00', kosher: 'rabanut', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף חריש', city: 'חריש', address: 'דרך ארץ 1, חריש', phone: '04-8532264', rawHours: 'א\'-ה\' 8:30-22:00 | ו\' 8:30-13:00 | ש\' שעה אחרי שבת עד 23:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף דנילוף', city: 'טבריה', address: 'יהודה הלוי 1, טבריה', phone: '04-8675566', rawHours: 'א\'-ה\' 8:30-22:30 | ו\' 8:30-14:00 | ש\' שעה אחרי שבת עד 22:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף פוריה', city: 'טבריה', address: 'המברג 1, טבריה', phone: '04-6735767', rawHours: 'א\'-ד\' 8:00-22:00 | ה\' 8:00-22:00 | ו\' 8:00-13:30 | ש\' 17:45-23:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף יקנעם', city: 'יוקנעם עילית', address: 'התמר 2, יוקנעם עילית', phone: '050-8773566', rawHours: 'א\'-ה\' 8:00-22:00 | ו\' 8:00-14:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף מכללת בראודה', city: 'כרמיאל', address: 'סנונית 51, כרמיאל', phone: '', rawHours: 'א\'-ה\' 7:30-20:00 | ו\' 7:30-12:30', kosher: 'rabanut', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף מגדל העמק', city: 'מגדל העמק', address: 'BIG מגדל העמק', phone: '04-6111554', rawHours: 'א\'-ה\' 8:30-22:30 | ו\' 7:30-13:30 | ש\' סגור', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף קניון נהריה', city: 'נהריה', address: 'אירית 2, נהריה', phone: '04-9930090', rawHours: 'א\'-ה\' 8:30-21:00 | ו\' 8:00-14:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף נשר', city: 'נשר', address: 'דרך בר יהודה 111, נשר', phone: '04-6221199', rawHours: 'א\'-ה\' 7:30-22:00 | ו\' 7:30 עד שעה לפני שבת', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף עפולה', city: 'עפולה', address: 'השוק 13, עפולה', phone: '04-6490011', rawHours: 'א\'-ה\' 8:00-23:00 | ו\' 8:00-15:00 | ש\' צאת שבת עד חצות', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף עתלית', city: 'עתלית', address: 'דרך הים 2, עתלית', phone: '04-9962399', rawHours: 'א\'-ה\' 7:30-22:30 | ו\' 7:30-14:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף פרדס חנה', city: 'פרדס חנה כרכור', address: 'תדהר 1, פרדס חנה', phone: '04-9531807', rawHours: 'א\'-ה\' 8:00-23:00 | ו\' 8:00-14:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף קרית אתא', city: 'קריית אתא', address: 'העצמאות 57, קריית אתא', phone: '04-8445522', rawHours: 'א\'-ה\' 8:00-00:00 | ו\' 8:00-14:00', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף קרית שמונה', city: 'קריית שמונה', address: 'טשרניחובסקי 6, קריית שמונה', phone: '04-8713710', rawHours: 'א\'-ה\' 9:00-19:00 | ו\' 8:30-13:00 | ש\' סגור', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
  { name: 'סניף ראש פינה', city: 'ראש פינה', address: 'התפוח 5, ראש פינה', phone: '04-6801191', rawHours: 'א\'-ה\' 7:30-23:00 | ו\' 8:00-14:30', kosher: 'mehadrin', menu: 'https://gregcafe.co.il/menus/' },
];

// =====================================================================
// פעולה: קבע location לפי עיר (ברירת מחדל — הסניפים כבר קיימים עם coords)
// =====================================================================
const CITY_COORDS = {
  'אופקים': { lat: 31.3097, lng: 34.6196 },
  'אילת': { lat: 29.5581, lng: 34.9482 },
  'אשדוד': { lat: 31.8040, lng: 34.6553 },
  'באר טוביה': { lat: 31.7260, lng: 34.7350 },
  'דימונה': { lat: 31.0677, lng: 35.0347 },
  'נתיבות': { lat: 31.4228, lng: 34.5878 },
  'עין בוקק': { lat: 31.1983, lng: 35.3644 },
  'שדרות': { lat: 31.5230, lng: 34.5966 },
  'אריאל': { lat: 32.1063, lng: 35.1724 },
  'בית שמש': { lat: 31.7458, lng: 34.9926 },
  'בני ברק': { lat: 32.0840, lng: 34.8340 },
  'גבעת שמואל': { lat: 32.0763, lng: 34.8483 },
  'הוד השרון': { lat: 32.1505, lng: 34.8924 },
  'ירושלים': { lat: 31.7683, lng: 35.2137 },
  'גוש עציון': { lat: 31.6590, lng: 35.1230 },
  'נתניה': { lat: 32.3215, lng: 34.8532 },
  'פתח תקווה': { lat: 32.0840, lng: 34.8878 },
  'ראש העין': { lat: 32.0958, lng: 34.9558 },
  'ראשון לציון': { lat: 31.9730, lng: 34.7898 },
  'רמלה': { lat: 31.9245, lng: 34.8706 },
  'רעננה': { lat: 32.1839, lng: 34.8708 },
  'תל אביב': { lat: 32.0853, lng: 34.7818 },
  'בית שאן': { lat: 32.5020, lng: 35.4928 },
  'חדרה': { lat: 32.4340, lng: 34.9187 },
  'חיפה': { lat: 32.7940, lng: 34.9896 },
  'חריש': { lat: 32.4580, lng: 35.0343 },
  'טבריה': { lat: 32.7921, lng: 35.5312 },
  'יוקנעם עילית': { lat: 32.6608, lng: 35.1062 },
  'כרמיאל': { lat: 32.9142, lng: 35.2967 },
  'מגדל העמק': { lat: 32.6756, lng: 35.2398 },
  'נהריה': { lat: 33.0048, lng: 35.0948 },
  'נשר': { lat: 32.7690, lng: 35.0430 },
  'עפולה': { lat: 32.6076, lng: 35.2899 },
  'עתלית': { lat: 32.7053, lng: 34.9394 },
  'פרדס חנה כרכור': { lat: 32.4706, lng: 34.9711 },
  'קריית אתא': { lat: 32.8056, lng: 35.1048 },
  'קריית שמונה': { lat: 33.2074, lng: 35.5695 },
  'ראש פינה': { lat: 32.9715, lng: 35.5432 },
};

// =====================================================================
// ביצוע — עדכון עם merge
// =====================================================================
const FILES = [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
];

for (const filePath of FILES) {
  const data = readJson(filePath);
  const existingIds = new Set(data.map(r => r.id));

  let updated = 0;
  let added = 0;

  for (const b of RAW) {
    if (SKIP_CITIES.has(b.city)) continue;

    // מחפש רשומה קיימת: קפה גרג + cityId תואמת
    const matches = data.filter(r =>
      r.name && r.name.includes('קפה גרג') && r.cityId === b.city
    );

    if (matches.length === 1) {
      // עדכון רשומה קיימת
      const r = matches[0];
      r.openingHours = b.rawHours;
      if (b.phone) r.phone = b.phone;
      r.kosherType = b.kosher;
      r.menu = b.menu;
      r.address = b.address;
      r.lastVerifiedAt = '2026-07-24';
      updated++;
    } else if (matches.length > 1) {
      // מספר סניפים באותה עיר — עדכן את הראשון, הוסף שאר
      const r = matches[0];
      r.openingHours = b.rawHours;
      if (b.phone) r.phone = b.phone;
      r.kosherType = b.kosher;
      r.menu = b.menu;
      r.lastVerifiedAt = '2026-07-24';
      updated++;
    } else {
      // סניף חדש — הוסף
      const branchName = `קפה גרג ${b.name.replace('סניף ', '')}`;
      const id = makeId('greg', branchName);
      if (existingIds.has(id)) continue;
      const coords = CITY_COORDS[b.city] || { lat: 31.5, lng: 34.9 };
      const place = {
        id,
        name: branchName,
        type: 'cafe',
        cityId: b.city,
        address: b.address,
        location: { latitude: coords.lat, longitude: coords.lng },
        locationPrecision: 'address',
        openingHours: b.rawHours,
        category: 'dairy',
        kosherType: b.kosher,
        menu: b.menu,
        website: 'https://gregcafe.co.il',
        source: 'manual',
        lastVerifiedAt: '2026-07-24',
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
