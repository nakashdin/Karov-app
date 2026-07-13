/**
 * ייבוא סניפי ארומה אספרסו בר — נתונים רשמיים מאתר aroma.co.il
 * מוחק את כל הסניפים הישנים (מקורות לא רשמיים) ומוסיף מחדש.
 * הרצה: node scripts/import-aroma-v2.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
function readNoBom(p) {
  const buf = readFileSync(p);
  const s = (buf[0]===0xEF&&buf[1]===0xBB&&buf[2]===0xBF) ? buf.slice(3) : buf;
  return JSON.parse(s.toString('utf8'));
}
function writeWithBom(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}

const CITY_COORDS = {
  'ירושלים':         { lat: 31.7683, lon: 35.2137 },
  'בית שמש':         { lat: 31.7458, lon: 34.9926 },
  'מודיעין':         { lat: 31.8966, lon: 35.0102 },
  'מעלה אדומים':     { lat: 31.7731, lon: 35.2955 },
  'תל אביב':         { lat: 32.0853, lon: 34.7818 },
  'חיפה':            { lat: 32.7940, lon: 34.9896 },
  'באר שבע':         { lat: 31.2518, lon: 34.7913 },
  'ראשון לציון':     { lat: 31.9730, lon: 34.7898 },
  'פתח תקווה':       { lat: 32.0840, lon: 34.8878 },
  'אשדוד':           { lat: 31.8040, lon: 34.6553 },
  'אשקלון':          { lat: 31.6688, lon: 34.5742 },
  'נתניה':           { lat: 32.3215, lon: 34.8532 },
  'חולון':           { lat: 32.0114, lon: 34.7799 },
  'בני ברק':         { lat: 32.0840, lon: 34.8340 },
  'רמת גן':          { lat: 32.0682, lon: 34.8243 },
  'גבעתיים':         { lat: 32.0680, lon: 34.8126 },
  'בת ים':           { lat: 32.0235, lon: 34.7507 },
  'הרצליה':          { lat: 32.1663, lon: 34.8392 },
  'כפר סבא':         { lat: 32.1781, lon: 34.9075 },
  'רעננה':           { lat: 32.1839, lon: 34.8708 },
  'רחובות':          { lat: 31.8928, lon: 34.8113 },
  'ראש העין':        { lat: 32.0958, lon: 34.9558 },
  'שוהם':            { lat: 31.9957, lon: 34.9373 },
  'נהריה':           { lat: 33.0045, lon: 35.0955 },
  'רמת השרון':       { lat: 32.1465, lon: 34.8406 },
  'הוד השרון':       { lat: 32.1508, lon: 34.8896 },
  'חדרה':            { lat: 32.4340, lon: 34.9187 },
  'אילת':            { lat: 29.5581, lon: 34.9482 },
  'נס ציונה':        { lat: 31.9285, lon: 34.7982 },
  'יהוד':            { lat: 32.0310, lon: 34.8890 },
  'באר יעקב':        { lat: 31.9363, lon: 34.8386 },
  'פרדס חנה כרכור':  { lat: 32.4706, lon: 34.9711 },
  'גבעת שמואל':      { lat: 32.0782, lon: 34.8458 },
  'אור יהודה':       { lat: 32.0321, lon: 34.8712 },
  'בני דרור':        { lat: 32.2735, lon: 34.9152 },
  'טבריה':           { lat: 32.7921, lon: 35.5312 },
  'בית שאן':         { lat: 32.5010, lon: 35.5000 },
  'יקנעם עילית':     { lat: 32.6575, lon: 35.1004 },
  'מעלות-תרשיחא':    { lat: 33.0137, lon: 35.2687 },
  'קריית אתא':       { lat: 32.8056, lon: 35.1048 },
  'קריית ים':        { lat: 32.8497, lon: 35.0693 },
  'מגדל העמק':       { lat: 32.6795, lon: 35.2392 },
  'עפולה':           { lat: 32.6076, lon: 35.2899 },
  'טירת כרמל':       { lat: 32.7606, lon: 35.0073 },
  'אור עקיבא':       { lat: 32.5040, lon: 34.9156 },
  'גדרה':            { lat: 31.8120, lon: 34.7760 },
  'גן יבנה':         { lat: 31.7870, lon: 34.7045 },
  'קריית גת':        { lat: 31.6100, lon: 34.7641 },
  'נתיבות':          { lat: 31.4228, lon: 34.5878 },
  'דימונה':          { lat: 31.0677, lon: 35.0347 },
  'ערד':             { lat: 31.2598, lon: 35.2141 },
  'רמלה':            { lat: 31.9245, lon: 34.8706 },
  'קריית אונו':      { lat: 32.0579, lon: 34.8559 },
  'לוד':             { lat: 31.9516, lon: 34.8942 },
  'כפר עזה':         { lat: 31.4910, lon: 34.5460 },
  'באר טוביה':       { lat: 31.7420, lon: 34.7500 },
};

let idCounter = 9400000;
function makeId() { return String(idCounter++); }

function buildEntry(r) {
  const coords = CITY_COORDS[r.city] || { lat: 31.5, lon: 34.9 };
  return {
    id: makeId(),
    name: 'ארומה אספרסו בר',
    type: 'cafe',
    cityId: r.city,
    address: r.address,
    location: { latitude: coords.lat, longitude: coords.lon },
    locationPrecision: 'address',
    phone: r.phone || undefined,
    website: r.url,
    openingHours: r.hours || undefined,
    category: 'dairy',
    certifiedBy: r.certified,
    source: 'manual',
  };
}

// ── סניפים רשמיים מאתר aroma.co.il ──────────────────────────────────────────
// הוסף כאן כל אזור שמוזן — ירושלים/מודיעין עד כה

const BRANCHES = [

  // ══ ירושלים ══════════════════════════════════════════════════════════════
  {
    name: 'ביג בית שמש',
    city: 'בית שמש',
    address: 'יגאל אלון 1, ביג בית שמש',
    phone: '02-9921674',
    certified: 'כשר למהדרין',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-14:00',
    url: 'https://www.aroma.co.il/store/%d7%91%d7%99%d7%92-%d7%91%d7%99%d7%aa-%d7%a9%d7%9e%d7%a9/',
  },
  {
    name: 'בית חולים הדסה עין כרם',
    city: 'ירושלים',
    address: 'ביה"ח הדסה עין כרם, ירושלים',
    phone: '051-2878566',
    certified: 'כשר למהדרין',
    hours: 'Su-Th 06:00-20:00; Fr 06:00-13:00',
    url: 'https://www.aroma.co.il/store/%d7%91%d7%99%d7%aa-%d7%97%d7%95%d7%9c%d7%99%d7%9d-%d7%94%d7%93%d7%a1%d7%94-%d7%a2%d7%99%d7%9f-%d7%9b%d7%a8%d7%9d/',
  },
  {
    name: 'בית חולים שערי צדק',
    city: 'ירושלים',
    address: 'שמואל בייט 12, ירושלים',
    phone: '02-6639000',
    certified: 'כשר למהדרין',
    hours: 'Su-Th 06:30-21:00; Fr 06:30-13:00',
    url: 'https://www.aroma.co.il/store/%d7%91%d7%99%d7%aa-%d7%97%d7%95%d7%9c%d7%99%d7%9d-%d7%a9%d7%a2%d7%a8%d7%99-%d7%a6%d7%93%d7%a7/',
  },
  {
    name: 'בית הדפוס ירושלים',
    city: 'ירושלים',
    address: 'בית הדפוס 12, גבעת שאול, ירושלים',
    phone: '02-5326681',
    certified: 'כשר למהדרין',
    hours: 'Su-Th 06:00-18:30; Fr 06:00-12:00',
    url: 'https://www.aroma.co.il/store/%d7%91%d7%99%d7%aa-%d7%94%d7%93%d7%a4%d7%95%d7%a1/',
  },
  {
    name: 'אוניברסיטה העברית גבעת רם',
    city: 'ירושלים',
    address: 'פרופסור רקח 1, ירושלים',
    phone: '050-7279094',
    certified: 'כשר',
    hours: 'Su-Th 08:00-16:00',
    url: 'https://www.aroma.co.il/store/%d7%90%d7%95%d7%a0%d7%99%d7%91%d7%a8%d7%a1%d7%99%d7%98%d7%aa-%d7%92%d7%91%d7%a2%d7%aa-%d7%a8%d7%9d/',
  },
  {
    name: 'יפו ירושלים',
    city: 'ירושלים',
    address: 'רחוב יפו 42, ירושלים',
    phone: '02-6241102',
    certified: 'כשר למהדרין',
    hours: 'Su-Th 07:00-19:30; Fr 07:00-14:30',
    url: 'https://www.aroma.co.il/store/%d7%99%d7%a4%d7%95/',
  },
  {
    name: 'עמק רפאים ירושלים',
    city: 'ירושלים',
    address: 'עמק רפאים 43, ירושלים',
    phone: '02-5617236',
    certified: 'כשר',
    hours: 'Su-Th 06:00-22:30; Fr 06:00-14:30; Sa 17:45-23:00',
    url: 'https://www.aroma.co.il/store/%d7%a2%d7%9e%d7%a7-%d7%a8%d7%a4%d7%90%d7%99%d7%9d-%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d/',
  },
  {
    name: 'קניון הדר ירושלים',
    city: 'ירושלים',
    address: 'גנרל פייר קניג 26, קניון הדר, ירושלים',
    phone: '02-6712228',
    certified: 'כשר',
    hours: 'Su-Th 07:45-21:00; Fr 07:45-14:00',
    url: 'https://www.aroma.co.il/store/%d7%a7%d7%a0%d7%99%d7%95%d7%9f-%d7%94%d7%93%d7%a8/',
  },
  {
    name: 'קניון מלחה ירושלים',
    city: 'ירושלים',
    address: 'קניון מלחה, ירושלים',
    phone: '02-6799154',
    certified: 'כשר',
    hours: 'Su-Th 08:15-20:00; Fr 08:15-13:30',
    url: 'https://www.aroma.co.il/store/%d7%a7%d7%a0%d7%99%d7%95%d7%9f-%d7%9e%d7%9c%d7%97%d7%94/',
  },
  {
    name: 'שדרות ממילא ירושלים',
    city: 'ירושלים',
    address: 'שדרות ממילא, ירושלים',
    phone: '02-6241367',
    certified: 'כשר',
    hours: 'Su-We 07:30-22:30; Th 07:30-23:00; Fr 07:30-15:30; Sa 20:30-23:30',
    url: 'https://www.aroma.co.il/store/%d7%a7%d7%a0%d7%99%d7%95%d7%9f-%d7%9e%d7%9e%d7%99%d7%9c%d7%90/',
  },
  {
    name: 'שוק מחנה יהודה ירושלים',
    city: 'ירושלים',
    address: 'שוק מחנה יהודה, ירושלים',
    phone: '02-6222833',
    certified: 'כשר למהדרין',
    hours: 'Su-Th 06:30-19:00; Fr 06:30-15:30',
    url: 'https://www.aroma.co.il/store/%d7%a9%d7%95%d7%a7-%d7%9e%d7%97%d7%a0%d7%94-%d7%99%d7%94%d7%95%d7%93%d7%94/',
  },
  {
    name: 'תלפיות התעשיה ירושלים',
    city: 'ירושלים',
    address: 'התעשיה 6, ירושלים',
    phone: '02-5353160',
    certified: 'כשר',
    hours: 'Su-Th 07:00-17:00; Fr 07:00-13:00',
    url: 'https://www.aroma.co.il/store/%d7%aa%d7%9c%d7%a4%d7%99%d7%95%d7%aa-%d7%94%d7%aa%d7%a2%d7%a9%d7%99%d7%94-%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d/',
  },

  // ══ מודיעין / מעלה אדומים ═════════════════════════════════════════════════
  {
    name: 'מוריה סנטר מודיעין',
    city: 'מודיעין',
    address: 'לאה אימנו 1, מודיעין',
    phone: '08-8687070',
    certified: 'כשר למהדרין',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-14:00',
    url: 'https://www.aroma.co.il/store/%d7%9e%d7%95%d7%a8%d7%99%d7%94-%d7%a1%d7%a0%d7%98%d7%a8-%d7%9e%d7%95%d7%93%d7%99%d7%a2%d7%99%d7%9f/',
  },
  {
    name: 'עזריאלי מודיעין',
    city: 'מודיעין',
    address: 'קניון עזריאלי, מודיעין',
    phone: '08-9265510',
    certified: 'כשר',
    hours: 'Su-Th 07:00-22:00; Fr 07:00-15:00; Sa 19:30-22:30',
    url: 'https://www.aroma.co.il/store/%d7%a7%d7%a0%d7%99%d7%95%d7%9f-%d7%a2%d7%96%d7%a8%d7%99%d7%90%d7%9c%d7%99-%d7%9e%d7%95%d7%93%d7%99%d7%a2%d7%99%d7%9f/',
  },
  {
    name: 'מעלה אדומים',
    city: 'מעלה אדומים',
    address: 'דרך קדם 5, מעלה אדומים',
    phone: '02-5352670',
    certified: 'כשר',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-14:00; Sa 21:00-22:30',
    url: 'https://www.aroma.co.il/store/%d7%9e%d7%a2%d7%9c%d7%94-%d7%90%d7%93%d7%95%d7%9e%d7%99%d7%9d/',
  },

  // ══ כאן ימשיכו אזורים נוספים (דרום, צפון, מרכז, ת"א) ════════════════════
];

const RPATH = 'src/data/generated/restaurants.osm.json';
const PPATH = 'src/data/generated/places.osm.json';
let rests  = readNoBom(RPATH);
let places = readNoBom(PPATH);

// מחיקת כל הסניפים הישנים של ארומה (מקורות לא רשמיים)
const beforeR = rests.length;
const beforeP = places.length;
rests  = rests.filter(e => e.name !== 'ארומה אספרסו בר');
places = places.filter(e => e.name !== 'ארומה אספרסו בר');
console.log(`🗑  נמחקו ${beforeR - rests.length} סניפי ארומה ישנים`);

function isDup(e, existing) {
  return existing.some(x => x.name === e.name && x.cityId === e.cityId && x.address === e.address);
}

const toAdd = BRANCHES.map(r => buildEntry(r)).filter(e => !isDup(e, rests));

writeWithBom(RPATH, [...rests, ...toAdd]);
writeWithBom(PPATH, [...places, ...toAdd]);

console.log(`✅ נוספו ${toAdd.length} סניפי ארומה אספרסו בר (ירושלים/מודיעין)`);
console.log(`סה"כ restaurants: ${rests.length + toAdd.length}`);
console.log(`\n⏳ ממתין לאזורים נוספים (דרום, צפון, מרכז, ת"א)...`);
