/**
 * Import all kosher Roladin branches (מאפיית רולדין — חלבי).
 * Excludes branches open full Shabbat (Arab cities) — kosher status unclear.
 * Run: node scripts/import-roladin.mjs
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
  'תל אביב–יפו':    { lat: 32.0853, lon: 34.7818 },
  'תל אביב':        { lat: 32.0853, lon: 34.7818 },
  'ירושלים':        { lat: 31.7683, lon: 35.2137 },
  'חיפה':           { lat: 32.7940, lon: 34.9896 },
  'באר שבע':        { lat: 31.2518, lon: 34.7913 },
  'ראשון לציון':    { lat: 31.9730, lon: 34.7898 },
  'פתח תקווה':      { lat: 32.0840, lon: 34.8878 },
  'אשדוד':          { lat: 31.8040, lon: 34.6553 },
  'אשקלון':         { lat: 31.6688, lon: 34.5742 },
  'נתניה':          { lat: 32.3215, lon: 34.8532 },
  'חולון':          { lat: 32.0114, lon: 34.7799 },
  'בני ברק':        { lat: 32.0840, lon: 34.8340 },
  'רמת גן':         { lat: 32.0682, lon: 34.8243 },
  'גבעתיים':        { lat: 32.0680, lon: 34.8126 },
  'בת ים':          { lat: 32.0235, lon: 34.7507 },
  'הרצליה':         { lat: 32.1663, lon: 34.8392 },
  'כפר סבא':        { lat: 32.1781, lon: 34.9075 },
  'מודיעין':        { lat: 31.8966, lon: 35.0102 },
  'עפולה':          { lat: 32.6076, lon: 35.2899 },
  'רחובות':         { lat: 31.8928, lon: 34.8113 },
  'ראש העין':       { lat: 32.0958, lon: 34.9558 },
  'ראש פינה':       { lat: 32.9714, lon: 35.5428 },
  'שוהם':           { lat: 31.9957, lon: 34.9373 },
  'קריית שמונה':    { lat: 33.2076, lon: 35.5709 },
  'קריית מוצקין':   { lat: 32.8367, lon: 35.0831 },
  'קריית גת':       { lat: 31.6100, lon: 34.7641 },
  'קריית אונו':     { lat: 32.0579, lon: 34.8559 },
  'קריית אתא':      { lat: 32.8056, lon: 35.1048 },
  'כרמיאל':         { lat: 32.9115, lon: 35.2974 },
  'נהריה':          { lat: 33.0045, lon: 35.0955 },
  'רמת השרון':      { lat: 32.1465, lon: 34.8406 },
  'רעננה':          { lat: 32.1839, lon: 34.8708 },
  'הוד השרון':      { lat: 32.1508, lon: 34.8896 },
  'גדרה':           { lat: 31.8120, lon: 34.7760 },
  'גן יבנה':        { lat: 31.7870, lon: 34.7045 },
  'גני תקווה':      { lat: 32.0605, lon: 34.8770 },
  'גבעת שמואל':     { lat: 32.0782, lon: 34.8458 },
  'חדרה':           { lat: 32.4340, lon: 34.9187 },
  'חריש':           { lat: 32.4580, lon: 35.0343 },
  'אילת':           { lat: 29.5581, lon: 34.9482 },
  'אשקלון':         { lat: 31.6688, lon: 34.5742 },
  'מעלה אדומים':    { lat: 31.7731, lon: 35.2955 },
  'מבשרת ציון':     { lat: 31.8060, lon: 35.1467 },
  'נס ציונה':       { lat: 31.9285, lon: 34.7982 },
  'יהוד':           { lat: 32.0310, lon: 34.8890 },
  'באר יעקב':       { lat: 31.9363, lon: 34.8386 },
  'כפר יונה':       { lat: 32.3175, lon: 34.9310 },
  'קדימה':          { lat: 32.2820, lon: 34.9163 },
  'אור עקיבא':      { lat: 32.5040, lon: 34.9156 },
  'יוקנעם':         { lat: 32.6575, lon: 35.1004 },
  'עין שמר':        { lat: 32.4550, lon: 35.0220 },
  'שילת':           { lat: 31.8930, lon: 35.0000 },
};

// סניפים פתוחים כל יום כולל שבת מלאה — ערים ערביות, כשרות שבת לא ברורה
const EXCLUDE_CITIES = new Set(['טייבה', 'כפר קאסם', 'נצרת']);

// נרמל שעות: מחליף "sunset" בשעה קבועה (~15:00 ו / ~21:00 מוצ"ש)
function normalizeHours(h) {
  if (!h) return h;
  return h
    .replace(/Fr (\d{2}:\d{2})-sunset[^;]*/g, 'Fr $1-15:00')
    .replace(/Sa sunset[^-]*-(\d{2}:\d{2})/g, 'Sa 21:00-$1')
    .replace(/Sa off/g, '')
    .replace(/;\s*$/, '')
    .trim();
}

let idCounter = 9200000;
function makeId() { return String(idCounter++); }

function buildEntry(r) {
  const coords = CITY_COORDS[r.city] || { lat: 31.5, lon: 34.9 };
  return {
    id: makeId(),
    name: 'רולדין',
    type: 'cafe',
    cityId: r.city,
    address: r.address || r.city,
    location: { latitude: coords.lat, longitude: coords.lon },
    locationPrecision: 'address',
    phone: r.phone || undefined,
    website: 'https://roladin.co.il',
    instagram: 'https://www.instagram.com/roladin_bakery',
    openingHours: normalizeHours(r.openingHours) || undefined,
    category: 'dairy',
    source: 'manual',
  };
}

const raw = JSON.parse(readFileSync(
  'C:/Users/User/AppData/Local/Temp/claude/C--Users-User-Desktop-claude-plane/3d5b0d60-6027-4360-b55d-fe1d978d5a05/scratchpad/roladin_branches.json'
).toString('utf8'));

const RPATH = 'src/data/generated/restaurants.osm.json';
const PPATH = 'src/data/generated/places.osm.json';
const rests  = readNoBom(RPATH);
const places = readNoBom(PPATH);

function isDup(e, existing) {
  return existing.some(x => x.name === e.name && x.cityId === e.cityId && x.address === e.address);
}

const filtered = raw.filter(r => !EXCLUDE_CITIES.has(r.city));
const toAdd = filtered.map(r => buildEntry(r)).filter(e => !isDup(e, rests));

writeWithBom(RPATH, [...rests, ...toAdd]);
writeWithBom(PPATH, [...places, ...toAdd]);

const excluded = raw.length - filtered.length;
console.log(`✅ נוספו ${toAdd.length} סניפי רולדין`);
console.log(`⚠️  הוחרגו ${excluded} סניפים (ערים ערביות — שבת מלאה): ${[...EXCLUDE_CITIES].join(', ')}`);
console.log(`סה"כ restaurants: ${rests.length + toAdd.length}`);
