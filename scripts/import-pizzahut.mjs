/**
 * Import all 85 kosher Pizza Hut Israel branches.
 * Run: node scripts/import-pizzahut.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');

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
  'בית שמש':        { lat: 31.7458, lon: 34.9926 },
  'עפולה':          { lat: 32.6076, lon: 35.2899 },
  'נס ציונה':       { lat: 31.9285, lon: 34.7982 },
  'יהוד':           { lat: 32.0310, lon: 34.8890 },
  'לוד':            { lat: 31.9516, lon: 34.8942 },
  'רמלה':           { lat: 31.9245, lon: 34.8706 },
  'קריית ביאליק':   { lat: 32.8365, lon: 35.0826 },
  'קריית מוצקין':   { lat: 32.8367, lon: 35.0831 },
  'אלעד':           { lat: 32.0530, lon: 34.9518 },
  'מודיעין עילית':  { lat: 31.9280, lon: 35.0486 },
  'ביתר עילית':     { lat: 31.6944, lon: 35.1202 },
  'ביתר עלית':      { lat: 31.6944, lon: 35.1202 },
  'אופקים':         { lat: 31.3097, lon: 34.6196 },
  'נתיבות':         { lat: 31.4228, lon: 34.5878 },
  'דימונה':         { lat: 31.0677, lon: 35.0347 },
  'ערד':            { lat: 31.2598, lon: 35.2141 },
  'טבריה':          { lat: 32.7921, lon: 35.5312 },
  'חדרה':           { lat: 32.4340, lon: 34.9187 },
  'גן יבנה':        { lat: 31.7870, lon: 34.7045 },
  'יבנה':           { lat: 31.8752, lon: 34.7394 },
  'באר יעקב':       { lat: 31.9363, lon: 34.8386 },
  'חריש':           { lat: 32.4580, lon: 35.0343 },
  'גני תקווה':      { lat: 32.0605, lon: 34.8770 },
  'גדרה':           { lat: 31.8120, lon: 34.7760 },
  'אור יהודה':      { lat: 32.0321, lon: 34.8712 },
  'אזור':           { lat: 32.0207, lon: 34.8028 },
  'מצפה רמון':      { lat: 30.6097, lon: 34.8026 },
  'אפרת':           { lat: 31.6594, lon: 35.1534 },
  'רעננה':          { lat: 32.1839, lon: 34.8708 },
  'קריית אתא':      { lat: 32.8056, lon: 35.1048 },
  'קריית גת':       { lat: 31.6100, lon: 34.7641 },
  'קריית אונו':     { lat: 32.0579, lon: 34.8559 },
  'קריית מלאכי':    { lat: 31.8645, lon: 34.7441 },
  'קריית שמונה':    { lat: 33.2076, lon: 35.5709 },
  'קרית שמונה':     { lat: 33.2076, lon: 35.5709 },
  'רחובות':         { lat: 31.8928, lon: 34.8113 },
  'ראש העין':       { lat: 32.0958, lon: 34.9558 },
  'ראש פינה':       { lat: 32.9714, lon: 35.5428 },
  'שוהם':           { lat: 31.9957, lon: 34.9373 },
  'שדרות':          { lat: 31.5230, lon: 34.5966 },
  'רמת השרון':      { lat: 32.1465, lon: 34.8406 },
  'אילת':           { lat: 29.5581, lon: 34.9482 },
  'כרמיאל':         { lat: 32.9115, lon: 35.2974 },
  'נהריה':          { lat: 33.0045, lon: 35.0955 },
  'עכו':            { lat: 32.9256, lon: 35.0724 },
  'טירת הכרמל':     { lat: 32.7606, lon: 35.0073 },
  'מעלות':          { lat: 33.0137, lon: 35.2687 },
  'מעלה אדומים':    { lat: 31.7731, lon: 35.2955 },
  'כפר יונה':       { lat: 32.3175, lon: 34.9310 },
  'יקנעם':          { lat: 32.6575, lon: 35.1004 },
  'זכרון יעקב':     { lat: 32.5680, lon: 34.9556 },
  'הוד השרון':      { lat: 32.1508, lon: 34.8896 },
  'בית שאן':        { lat: 32.5010, lon: 35.5000 },
  'קריית עקרון':    { lat: 31.8596, lon: 34.8230 },
  'בני דרור':       { lat: 32.2735, lon: 34.9152 },
  'גבעת שמואל':     { lat: 32.0782, lon: 34.8458 },
  'רמת ישי':        { lat: 32.7056, lon: 35.1689 },
  'פרדס חנה כרכור': { lat: 32.4706, lon: 34.9711 },
  'פארק אדיסון':    { lat: 31.9044, lon: 34.7990 },
  'מבשרת ציון':     { lat: 31.8060, lon: 35.1467 },
};

let idCounter = 9100000;
function makeId() { return String(idCounter++); }

function buildEntry(r) {
  const coords = CITY_COORDS[r.city] || { lat: 31.5, lon: 34.9 };
  const entry = {
    id: makeId(),
    name: 'פיצה האט',
    type: 'restaurant',
    cityId: r.city,
    address: r.address || r.city,
    location: { latitude: coords.lat, longitude: coords.lon },
    locationPrecision: 'address',
    phone: r.phone,
    website: r.website,
    openingHours: r.openingHours,
    category: 'dairy',
    certifiedBy: r.certifiedBy,
    source: 'manual',
  };
  return entry;
}

// ── חלבי ───────────────────────────────────────────────────────────────────
const BRANCHES = readFileSync(
  'C:/Users/User/AppData/Local/Temp/claude/C--Users-User-Desktop-claude-plane/3d5b0d60-6027-4360-b55d-fe1d978d5a05/scratchpad/pizzahut_branches.json'
);
const data = JSON.parse(BRANCHES.toString('utf8'));

const RPATH = path.join(ROOT, 'src/data/generated/restaurants.osm.json');
const PPATH = path.join(ROOT, 'src/data/generated/places.osm.json');
const rests  = readNoBom(RPATH);
const places = readNoBom(PPATH);

function isDuplicateExact(entry, existing) {
  return existing.some(e => e.name === entry.name && e.cityId === entry.cityId && e.address === entry.address);
}

const toAdd = data.map(r => buildEntry(r)).filter(e => !isDuplicateExact(e, rests));

writeWithBom(RPATH, [...rests, ...toAdd]);
writeWithBom(PPATH, [...places, ...toAdd]);

console.log(`✅ נוספו ${toAdd.length} סניפי פיצה האט חדשים`);
console.log(`סה"כ restaurants: ${rests.length + toAdd.length}`);
