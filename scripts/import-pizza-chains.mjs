/**
 * Import kosher pizza chains: פיצה שמש, דומינוס, פיצה סטורי, פיצה מילאנו, פיצה פצץ
 * Run: node scripts/import-pizza-chains.mjs
 * Only adds entries that don't already exist (match by name+city).
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

// City center coordinates (WGS84) for geocoding new entries
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
  'מודיעין-מכבים-רעות': { lat: 31.8966, lon: 35.0102 },
  'בית שמש':        { lat: 31.7458, lon: 34.9926 },
  'בית שמש רמה':    { lat: 31.7220, lon: 34.9900 },
  'עפולה':          { lat: 32.6076, lon: 35.2899 },
  'נס ציונה':       { lat: 31.9285, lon: 34.7982 },
  'יהוד':           { lat: 32.0310, lon: 34.8890 },
  'לוד':            { lat: 31.9516, lon: 34.8942 },
  'רמלה':           { lat: 31.9245, lon: 34.8706 },
  'קריית ביאליק':   { lat: 32.8365, lon: 35.0826 },
  'אלעד':           { lat: 32.0530, lon: 34.9518 },
  'מודיעין עילית':  { lat: 31.9280, lon: 35.0486 },
  'ביתר עילית':     { lat: 31.6944, lon: 35.1202 },
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
  'כפר חב"ד':       { lat: 32.0004, lon: 34.8897 },
  'צפריה':          { lat: 31.9470, lon: 34.8480 },
  'רעננה':          { lat: 32.1839, lon: 34.8708 },
  'קריית אתא':      { lat: 32.8056, lon: 35.1048 },
  'קריית מוצקין':   { lat: 32.8367, lon: 35.0831 },
  'קריית גת':       { lat: 31.6100, lon: 34.7641 },
  'קריית אונו':     { lat: 32.0579, lon: 34.8559 },
  'קריית מלאכי':    { lat: 31.8645, lon: 34.7441 },
  'פרדס חנה':       { lat: 32.4706, lon: 34.9711 },
  'תל מונד':        { lat: 32.2572, lon: 34.9267 },
  'ראש העין':       { lat: 32.0958, lon: 34.9558 },
  'אור עקיבא':      { lat: 32.5040, lon: 34.9156 },
  'שדרות':          { lat: 31.5230, lon: 34.5966 },
  'רחובות':         { lat: 31.8928, lon: 34.8113 },
  'קרני שומרון':    { lat: 32.1542, lon: 35.0517 },
  'צפת':            { lat: 32.9650, lon: 35.4980 },
  'בית קמה':        { lat: 31.4080, lon: 34.7210 },
  'מבשרת ציון':     { lat: 31.8060, lon: 35.1467 },
  'קצרין':          { lat: 32.9900, lon: 35.6900 },
  'אילת':           { lat: 29.5581, lon: 34.9482 },
};

let idCounter = 9000000;
function makeId() { return String(idCounter++); }

function buildEntry(r) {
  const coords = CITY_COORDS[r.city] || { lat: 31.5, lon: 34.9 };
  return {
    id: makeId(),
    name: r.name,
    type: 'restaurant',
    cityId: r.city,
    address: r.address || r.city,
    location: { latitude: coords.lat, longitude: coords.lon },
    locationPrecision: 'address',
    phone: r.phone || undefined,
    website: r.website || undefined,
    instagram: r.instagram || undefined,
    facebook: r.facebook || undefined,
    openingHours: r.openingHours || undefined,
    category: r.category,
    certifiedBy: r.certifiedBy || undefined,
    source: 'manual',
  };
}

// ── פרווה ──────────────────────────────────────────────────────────────────
// (אין כרגע)

// ── חלבי ───────────────────────────────────────────────────────────────────

const PIZZA_SHEMESH = [
  { name: 'פיצה שמש', city: 'אופקים',        address: 'הרצל 26, אופקים',                          phone: '08-9305775',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'הרב לנדא' },
  { name: 'פיצה שמש', city: 'הרצליה',        address: 'סוקולוב 31, הרצליה',                        phone: '09-3071444',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'אור יהודה',     address: 'ארבל 13, אור יהודה',                        phone: '03-5564644',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'אור יהודה',     address: 'בן פורת 79, אור יהודה',                     phone: '03-5330111',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'אזור',          address: 'שפינוזה 2, אזור',                            phone: '03-5492212',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'אילת',          address: 'התמרים 39, אילת',                            phone: '08-6337090',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'אלעד',          address: 'רבי יהודה הנשיא 94, אלעד',                  phone: '03-9664481',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'אפרת',          address: 'מרכז אפרת, אפרת',                            phone: '02-5393963',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'אשדוד',         address: 'דב גור 11, אשדוד',                          phone: '08-8688098',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'רבני הקריות' },
  { name: 'פיצה שמש', city: 'אשדוד',         address: 'רוגוזין 3, אשדוד',                          phone: '08-6900905',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'אשקלון',        address: 'ביאליק 32, אשקלון',                         phone: '08-9981848',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'אשקלון',        address: 'עמק רימון 3, אשקלון',                       phone: '08-6888809',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'אשקלון',        address: 'אמנים 36, אשקלון',                          phone: '08-9900021',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'באר יעקב',      address: 'יצחק שמיר 24, באר יעקב',                   phone: '08-8565139',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'באר שבע',       address: 'נחל פרת 20, באר שבע',                       phone: '08-8607771',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'באר שבע',       address: 'ראובן רובין 3, באר שבע',                    phone: '08-6331133',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'באר שבע',       address: "ז'בוטינסקי 24, באר שבע",                    phone: '08-6339010',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'באר שבע',       address: 'שדרות רגר 185, באר שבע',                    phone: '08-6254688',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'בית שמש',       address: 'רבין 15, בית שמש',                          phone: '02-5869444',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'בית שמש',       address: 'יחזקאל הנביא 22, בית שמש',                 phone: '02-5433633',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'בית שמש',       address: 'אמוראים 35, בית שמש',                       phone: '02-6406286',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'ביתר עילית',    address: 'הרב ברימס 4, ביתר עילית',                   phone: '02-3740074',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'בני ברק',       address: "ז'בוטינסקי 120, בני ברק",                   phone: '03-6576888',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'הרב לנדא' },
  { name: 'פיצה שמש', city: 'בני ברק',       address: 'יצחק מאיר הכהן 4, בני ברק',                phone: '03-6723621',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'בני ברק',       address: 'ירושלים 18, בני ברק',                       phone: '03-9543533',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'הרב לנדא' },
  { name: 'פיצה שמש', city: 'בני ברק',       address: 'קהנמן 104, בני ברק',                        phone: '03-6197070',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'הרב לנדא' },
  { name: 'פיצה שמש', city: 'בני ברק',       address: 'רבי עקיבא 122, בני ברק',                   phone: '03-6813838',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'בת ים',         address: 'אלי כהן 25, בת ים',                         phone: '03-6122182',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'בת ים',         address: 'סנדלר 4, בת ים',                            phone: '03-6594343',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'בת ים',         address: 'הרצל 75, בת ים',                            phone: '03-5531310',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'בת ים',         address: 'אוזיאל 25, בת ים',                          phone: '03-6138087',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'גבעתיים',       address: 'וייצמן 43, גבעתיים',                        phone: '03-6554505',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'גדרה',          address: 'הרצל 10, גדרה',                             phone: '08-6141414',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'גן יבנה',       address: "צה\"ל 28, גן יבנה",                         phone: '08-6186686',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'גני תקווה',     address: 'עין גנים 7, גני תקווה',                    phone: '03-6344000',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'דימונה',        address: 'העלייה 215, דימונה',                         phone: '08-3740077',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'חדרה',          address: 'הנשיא 59, חדרה',                            phone: '04-8406664',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'חולון',         address: 'גולדה מאיר 8, חולון',                       phone: '03-6418882',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'חולון',         address: 'דב הוז 63, חולון',                          phone: '03-6316360',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'חולון',         address: 'הר הצופים 42, חולון',                       phone: '03-6330655',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'חיפה',          address: 'גאולה 31, חיפה',                            phone: '04-6116565',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'חריש',          address: 'דרך ארץ 41, חריש',                          phone: '04-6033233',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'טבריה',         address: 'העצמאות 3, טבריה',                          phone: '04-6722300',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'יבנה',          address: 'אגוז 2, יבנה',                              phone: '08-6510000',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'יהוד',          address: 'וייצמן 44, יהוד',                           phone: '03-5664010',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'ירושלים',       address: 'פסגה 45, ירושלים',                          phone: '02-6783903',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'ירושלים',       address: 'יחזקאל 8, ירושלים',                         phone: '02-5002690',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'ירושלים',       address: 'מבשרת ציון, ירושלים',                       phone: '02-6514514',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'ירושלים',       address: 'משה דיין 164, ירושלים',                     phone: '02-5338585',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'ירושלים',       address: 'אגריפס 42, ירושלים',                        phone: '02-5430430',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'ירושלים',       address: 'גולדה מאיר 255, ירושלים',                   phone: '02-5302210',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'כפר חב"ד',     address: 'אדמו"ר הרש"ב 2, כפר חב"ד',                 phone: '03-5221212',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'כפר סבא',       address: 'טשרניחובסקי 24, כפר סבא',                  phone: '09-8828886',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'לוד',           address: 'בן גוריון 5, לוד',                          phone: '08-8600220',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'מודיעין',       address: 'חיים וייצמן 18, מודיעין',                   phone: '08-9918888',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'מודיעין עילית', address: 'אבני זר 46, מודיעין עילית',                  phone: '08-8629080',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'מצפה רמון',     address: 'נחל תרסים 1, מצפה רמון',                    phone: '08-8501111',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'נס ציונה',      address: 'נורדאו 6, נס ציונה',                        phone: '08-9248111',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'נתיבות',        address: 'יוסף סמילו 13, נתיבות',                     phone: '08-6884429',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'נתניה',         address: 'הרצל 51, נתניה',                            phone: '09-8333212',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'עפולה',         address: 'משה שרת 3, עפולה',                          phone: '04-6464777',  website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'ועד הרבנים החרדים' },
  { name: 'פיצה שמש', city: 'ערד',           address: 'א. בן יאיר 35, ערד',                        phone: '077-2062600', website: 'https://pizza-shemesh.co.il', category: 'dairy', certifiedBy: 'הרב לנדא' },
];

const DOMINOS = [
  { name: "דומינו'ס",  city: 'תל אביב–יפו',  address: 'יורדי הסירה 10, נמל תל אביב',       phone: '1-700-70-70-70', website: 'https://www.dominos.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: "דומינו'ס",  city: 'גבעתיים',       address: 'בורוכוב 54, גבעתיים',                phone: '1-700-70-70-70', website: 'https://www.dominos.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: "דומינו'ס",  city: 'פתח תקווה',     address: 'יהושע שטמפפר 73, פתח תקווה',        phone: '1-700-70-70-70', website: 'https://www.dominos.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: "דומינו'ס",  city: 'פתח תקווה',     address: 'העצמאות 65, פתח תקווה',              phone: '1-700-70-70-70', website: 'https://www.dominos.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: "דומינו'ס",  city: 'פתח תקווה',     address: 'ראשון לציון 1, פתח תקווה',           phone: '1-700-70-70-70', website: 'https://www.dominos.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: "דומינו'ס",  city: 'אשדוד',         address: 'הציונות 11, אשדוד',                  phone: '1-700-70-70-70', website: 'https://www.dominos.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: "דומינו'ס",  city: 'אשקלון',        address: 'שדרות ירושלים 119, אשקלון',          phone: '1-700-70-70-70', website: 'https://www.dominos.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: "דומינו'ס",  city: 'עפולה',         address: 'שדרות יצחק רבין 20, עפולה',          phone: '076-8048963',    website: 'https://www.dominos.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: "דומינו'ס",  city: 'קריית ביאליק',  address: 'שדרות ירושלים 1, קריית ביאליק',      phone: '1-700-70-70-70', website: 'https://www.dominos.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: "דומינו'ס",  city: 'חולון',         address: 'גן פרס נובל, חולון',                  phone: '076-8048974',    website: 'https://www.dominos.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
];

const PIZZA_STORY = [
  { name: 'פיצה סטורי', city: 'ירושלים',   address: 'יד חרוצים 21, תלפיות, ירושלים',      phone: '02-5000086', website: 'https://pizza-story.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה סטורי', city: 'פתח תקווה', address: 'יהושע שטמפפר 24, פתח תקווה',         phone: '03-5566516', website: 'https://pizza-story.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה סטורי', city: 'באר שבע',   address: 'השלום 31, באר שבע',                   phone: '08-6222110', website: 'https://pizza-story.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה סטורי', city: 'רמלה',      address: 'הרצל 45, רמלה',                       phone: '08-9935222', website: 'https://pizza-story.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה סטורי', city: 'צפריה',     address: 'הארז 1, צפריה',                       phone: '03-6914999', website: 'https://pizza-story.co.il', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
];

const PIZZA_MILANO = [
  { name: 'פיצה מילאנו', city: 'רעננה',       address: 'בן גוריון 3, רעננה',               phone: '09-7741919', instagram: 'https://www.instagram.com/pizza_milan_k_a/', category: 'dairy', certifiedBy: 'בד"ץ יורה דעה' },
  { name: 'פיצה מילאנו', city: 'אילת',        address: 'קניון אייס מול, אילת',              openingHours: 'Su-Th 10:30-22:00; Fr 10:00-15:30', category: 'dairy', certifiedBy: 'רבנות' },
  { name: 'פיצה מילאנו', city: 'רמלה',        address: 'הרצל 45, רמלה',                    facebook: 'https://www.facebook.com/pizzamilanoramla/', category: 'dairy', certifiedBy: 'בד"ץ יורה דעה' },
  { name: 'פיצה מילאנו', city: 'קריית אתא',   address: 'העצמאות 37, קריית אתא',            phone: '053-3888814', category: 'dairy', certifiedBy: 'בד"ץ העדה החרדית' },
];

// Agent 2 — additional פיצה שמש branches
const PIZZA_SHEMESH_2 = [
  { name: 'פיצה שמש', city: 'פרדס חנה',      address: 'הרצל, פרדס חנה',                    phone: '04-6464937',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'קריית אתא',     address: 'העצמאות 47, קריית אתא',             phone: '074-7132408', openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ העדה החרדית' },
  { name: 'פיצה שמש', city: 'תל מונד',       address: 'השקד 2, תל מונד',                   phone: '09-7676769',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'ראש העין',      address: 'שלמה המלך 2, ראש העין',             phone: '03-5040408',  openingHours: 'Su-Th 11:00-23:00; Fr 11:00-15:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'ראש העין',      address: 'שבזי 201, ראש העין',                phone: '03-5040408',  openingHours: 'Su-Th 11:00-23:00; Fr 11:00-15:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'אור עקיבא',     address: 'דוד המלך 40, אור עקיבא',            phone: '04-8767789',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'קריית מוצקין',  address: 'שי עגנון 16, קריית מוצקין',         phone: '04-9041235',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'שוהם',          address: 'דקל 30, שוהם',                      phone: '03-6546050',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'תל אביב–יפו',   address: 'ישראל גורי 34, תל אביב',            phone: '03-5444516',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'תל אביב–יפו',   address: 'נגבה 1, תל אביב',                   phone: '055-2221709', openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'תל אביב–יפו',   address: 'צרעה 3, תל אביב',                   phone: '077-5060826', openingHours: 'Su-Th 11:30-23:30', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'תל אביב–יפו',   address: 'בית אל 12, תל אביב',                phone: '03-7479970',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'הרב לנדא' },
  { name: 'פיצה שמש', city: 'שדרות',         address: 'הרצל 31, שדרות',                    phone: '08-6884050',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'רמת גן',        address: 'תרצה 15, רמת גן',                   phone: '03-6436333',  openingHours: 'Su-Th 11:00-22:30', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'רמלה',          address: 'יוסף טל, רמלה',                     phone: '08-6639243',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'רמלה',          address: 'מבצע יהונתן, רמלה',                 phone: '08-6139999',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza.shemesh.mivza.yonatan', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'רחובות',        address: 'עזרא, רחובות',                      phone: '08-6140400',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'הרב לנדא' },
  { name: 'פיצה שמש', city: 'רחובות',        address: 'ששת הימים 95, רחובות',              phone: '08-6170700',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ העדה החרדית' },
  { name: 'פיצה שמש', city: 'ראשון לציון',   address: 'יהודה הנשיא 1, ראשון לציון',       phone: '03-5562100',  openingHours: 'Su-Th 11:30-23:30', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'ראשון לציון',   address: 'הרצל 28, ראשון לציון',              phone: '03-5252502',  openingHours: 'Su-Th 11:30-23:30', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'ראשון לציון',   address: 'יהודה לייב פינסקר 20, ראשון לציון', phone: '03-5050930', openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'הרב לנדא' },
  { name: 'פיצה שמש', city: 'ראשון לציון',   address: 'השירה העברית 10, ראשון לציון',      phone: '074-7132404', openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'קרני שומרון',   address: 'הגפן 1, קרני שומרון',               phone: '050-8307323', openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'קרית שמונה',    address: 'תל חי 92, קרית שמונה',              phone: '04-8169988',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'קריית גת',      address: 'לכיש 33, קריית גת',                 phone: '08-6616532',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'קריית גת',      address: 'אסתר המלכה 13, קריית גת',           phone: '08-8692874',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'קריית אונו',    address: 'יעקב דורי 7, קריית אונו',           phone: '03-6767303',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'קריית מלאכי',   address: 'רש"י 11, קריית מלאכי',              phone: '08-6427788',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ העדה החרדית' },
  { name: 'פיצה שמש', city: 'קצרין',         address: 'שיון 1, קצרין',                     phone: '077-4512564', openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'צפת',           address: 'ירושלים 81, צפת',                   phone: '04-6063131',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ העדה החרדית' },
  { name: 'פיצה שמש', city: 'פתח תקווה',     address: "ז'בוטינסקי 2, פתח תקווה",          phone: '03-6052025',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'בית קמה',       address: 'צומת בית קמה',                      phone: '08-9331212',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'אילת',          address: 'שדרות ארגמן 60, אילת',              phone: '08-8503355',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizzashemesh_eilat', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
  { name: 'פיצה שמש', city: 'מבשרת ציון',    address: 'מבשרת ציון',                        phone: '02-6514514',  openingHours: 'Su-Th 11:00-23:00', website: 'https://pizza-shemesh.co.il', instagram: 'https://www.instagram.com/pizza_shemesh_israel', category: 'dairy', certifiedBy: 'בד"ץ בית יוסף' },
];

const PIZZA_PAZZAZ_NEW = [
  { name: 'פיצה פצץ', city: 'נתניה',      address: 'שד׳ טום לנטוס 26, נתניה',               phone: '09-8988099', openingHours: 'Su-Th 10:00-24:00', website: 'https://www.piza-pazzaz.co.il', category: 'dairy', certifiedBy: 'רבנות נתניה' },
  { name: 'פיצה פצץ', city: 'ראשון לציון', address: 'החלמונית 22, ראשון לציון',              phone: '03-9410925', openingHours: 'Su-Th 10:00-24:00; Fr 09:00-14:30', website: 'https://www.piza-pazzaz.co.il', category: 'dairy', certifiedBy: 'כשר למהדרין' },
];

// ── All new entries ────────────────────────────────────────────────────────
const ALL_NEW = [
  ...PIZZA_SHEMESH,
  ...PIZZA_SHEMESH_2,
  ...DOMINOS,
  ...PIZZA_STORY,
  ...PIZZA_MILANO,
  ...PIZZA_PAZZAZ_NEW,
];

// Load existing data
const RPATH = 'src/data/generated/restaurants.osm.json';
const PPATH = 'src/data/generated/places.osm.json';
const rests = readNoBom(RPATH);
const places = readNoBom(PPATH);

// Deduplicate: skip if name+city already exists
function isNew(entry, existing) {
  return !existing.some(e => e.name === entry.name && e.cityId === entry.city &&
    (e.address === entry.address || (!entry.address || entry.address === entry.city)));
}

// For same name+city but DIFFERENT address (multiple branches) — allow duplicates by address
function isDuplicateExact(entry, existing) {
  return existing.some(e => e.name === entry.name && e.cityId === entry.city && e.address === entry.address);
}

const toAdd = ALL_NEW
  .filter(r => !isDuplicateExact(r, rests))
  .map(r => buildEntry(r));

const newRests = [...rests, ...toAdd];
const newPlaces = [...places, ...toAdd];

writeWithBom(RPATH, newRests);
writeWithBom(PPATH, newPlaces);

// Summary
const byChain = {};
for (const r of toAdd) {
  byChain[r.name] = (byChain[r.name] || 0) + 1;
}
console.log(`\n✅ נוספו ${toAdd.length} סניפים חדשים:`);
for (const [name, count] of Object.entries(byChain)) {
  console.log(`  ${name}: ${count}`);
}
console.log(`\nסה"כ restaurants: ${newRests.length} | places: ${newPlaces.length}`);
