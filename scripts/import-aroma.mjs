/**
 * Import all kosher Aroma Espresso Bar branches (ארומה — חלבי).
 * Sources: d.co.il, b144, branches.co.il, web search.
 * Excludes: Arab-city branches (no kosher cert for Jewish community).
 * Run: node scripts/import-aroma.mjs
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
  'תל אביב':         { lat: 32.0853, lon: 34.7818 },
  'תל אביב–יפו':     { lat: 32.0853, lon: 34.7818 },
  'ירושלים':         { lat: 31.7683, lon: 35.2137 },
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
  'מודיעין':         { lat: 31.8966, lon: 35.0102 },
  'רחובות':          { lat: 31.8928, lon: 34.8113 },
  'ראש העין':        { lat: 32.0958, lon: 34.9558 },
  'שוהם':            { lat: 31.9957, lon: 34.9373 },
  'קריית שמונה':     { lat: 33.2076, lon: 35.5709 },
  'קריית מוצקין':    { lat: 32.8367, lon: 35.0831 },
  'קריית ביאליק':    { lat: 32.8365, lon: 35.0826 },
  'קריית גת':        { lat: 31.6100, lon: 34.7641 },
  'קריית אונו':      { lat: 32.0579, lon: 34.8559 },
  'קריית אתא':       { lat: 32.8056, lon: 35.1048 },
  'כרמיאל':          { lat: 32.9115, lon: 35.2974 },
  'נהריה':           { lat: 33.0045, lon: 35.0955 },
  'רמת השרון':       { lat: 32.1465, lon: 34.8406 },
  'הוד השרון':       { lat: 32.1508, lon: 34.8896 },
  'חדרה':            { lat: 32.4340, lon: 34.9187 },
  'אילת':            { lat: 29.5581, lon: 34.9482 },
  'מעלה אדומים':     { lat: 31.7731, lon: 35.2955 },
  'מבשרת ציון':      { lat: 31.8060, lon: 35.1467 },
  'נס ציונה':        { lat: 31.9285, lon: 34.7982 },
  'יהוד':            { lat: 32.0310, lon: 34.8890 },
  'באר יעקב':        { lat: 31.9363, lon: 34.8386 },
  'כפר יונה':        { lat: 32.3175, lon: 34.9310 },
  'פרדס חנה כרכור':  { lat: 32.4706, lon: 34.9711 },
  'מבשרת ציון':      { lat: 31.8060, lon: 35.1467 },
  'גבעת שמואל':      { lat: 32.0782, lon: 34.8458 },
  'אור יהודה':       { lat: 32.0321, lon: 34.8712 },
  'אזור':            { lat: 32.0207, lon: 34.8028 },
  'בני דרור':        { lat: 32.2735, lon: 34.9152 },
  'נשר':             { lat: 32.7745, lon: 35.0489 },
  'טבריה':           { lat: 32.7921, lon: 35.5312 },
  'בית שאן':         { lat: 32.5010, lon: 35.5000 },
  'יקנעם עילית':     { lat: 32.6575, lon: 35.1004 },
  'רמת ישי':         { lat: 32.7056, lon: 35.1689 },
  'מעלות-תרשיחא':    { lat: 33.0137, lon: 35.2687 },
  'צמח':             { lat: 32.7039, lon: 35.5757 },
  'שפיים':           { lat: 32.2802, lon: 34.8585 },
  'בית ינאי':        { lat: 32.3685, lon: 34.8838 },
  'בית חרות':        { lat: 32.3280, lon: 34.9218 },
  'שואבה':           { lat: 31.8014, lon: 35.0650 },
  'צריפין':          { lat: 31.9627, lon: 34.9113 },
  'עין המפרץ':       { lat: 32.9200, lon: 35.0820 },
  'מיתר':            { lat: 31.2747, lon: 34.9168 },
  'עין חצבה':        { lat: 30.7697, lon: 35.2355 },
  'עין בוקק':        { lat: 31.1955, lon: 35.3650 },
  'עין עבדת':        { lat: 30.8183, lon: 34.7618 },
  'בית קמה':         { lat: 31.4419, lon: 34.7233 },
  'נתיבות':          { lat: 31.4228, lon: 34.5878 },
  'דימונה':          { lat: 31.0677, lon: 35.0347 },
  'רמת ישי':         { lat: 32.7056, lon: 35.1689 },
};

let idCounter = 9300000;
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
    website: 'https://www.aroma.co.il',
    instagram: 'https://www.instagram.com/aromaisrael',
    openingHours: r.openingHours || undefined,
    category: 'dairy',
    certifiedBy: r.certifiedBy || undefined,
    source: 'manual',
  };
}

// ── כל הסניפים הכשרים ─────────────────────────────────────────────────────
// מוחרגים: ירכא, טמרה, כפר קרע, זרזיר (ערים ערביות)

const BRANCHES = [
  // ── תל אביב ──────────────────────────────────────────────────────────────
  { city: 'תל אביב', address: 'אלנבי 49',                            phone: '03-5031814' },
  { city: 'תל אביב', address: 'יגאל אלון 88',                        phone: '03-5612757' },
  { city: 'תל אביב', address: 'אלנבי 1, מגדל האופרה',               phone: '03-5165414' },
  { city: 'תל אביב', address: 'יחזקאל קויפמן 2',                    phone: '03-5476035' },
  { city: 'תל אביב', address: 'הירקון 145',                          phone: '03-6724298' },
  { city: 'תל אביב', address: 'נחלת יצחק 18',                       phone: '03-5177870' },
  { city: 'תל אביב', address: 'איינשטיין 40, רמת אביב',             phone: '03-6414949' },
  { city: 'תל אביב', address: 'הרצל 17',                             phone: '03-5169729' },
  { city: 'תל אביב', address: 'דיזנגוף 55',                          phone: '03-6496991' },
  { city: 'תל אביב', address: 'אבן גבירול 166',                      phone: '03-6020173' },
  { city: 'תל אביב', address: 'מנחם בגין 132, קניון עזריאלי',       phone: '03-6081424' },
  { city: 'תל אביב', address: 'המסגר 9, יד חרוצים',                 phone: '03-6873457' },
  { city: 'תל אביב', address: 'אהרון בקר 8',                         phone: '077-7180003' },
  { city: 'תל אביב', address: 'אבן גבירול 30',                       phone: '03-6092005' },
  { city: 'תל אביב', address: 'הברזל 25, רמת החייל',                phone: '03-6489432' },
  { city: 'תל אביב', address: 'קלאוזנר 8',                           phone: '03-6437774' },
  { city: 'תל אביב', address: 'מנחם בגין 48',                        phone: '03-5099549' },
  { city: 'תל אביב', address: 'החשמונאים 84',                        phone: '03-5461571' },
  { city: 'תל אביב', address: 'יורדי הסירה 1, נמל תל אביב',        phone: '03-5447047' },
  { city: 'תל אביב', address: 'ויצמן 14, ויצמן סיטי',               phone: '03-6916050' },

  // ── ירושלים ──────────────────────────────────────────────────────────────
  { city: 'ירושלים', address: 'יצחק קריב 6, מתחם ממילא',           phone: '02-6241367' },
  { city: 'ירושלים', address: 'אגודת ספורט ביתר 1, קניון ירושלים', phone: '02-6799154' },
  { city: 'ירושלים', address: 'בית הדפוס 12, גבעת שאול',           phone: '02-5326681' },
  { city: 'ירושלים', address: 'בייט שמואל 12, גבעת מרדכי',         phone: '02-6639000' },
  { city: 'ירושלים', address: 'הלל 18',                              phone: '02-6255365' },
  { city: 'ירושלים', address: 'עמק רפאים 43',                        phone: '02-5617236' },
  { city: 'ירושלים', address: 'ישפרו סנטר הדסה עין כרם',           phone: '02-6410222' },
  { city: 'ירושלים', address: 'יפו 40',                              phone: '02-6241102' },
  { city: 'ירושלים', address: 'המלך ג\'ורג\' 14',                   phone: '02-6259102' },
  { city: 'ירושלים', address: 'פייר קניג 26, קניון הדר',            phone: '02-6712228' },
  { city: 'ירושלים', address: 'יפו 224, תחנה מרכזית',              phone: '02-5388383' },
  { city: 'ירושלים', address: 'מחנה יהודה',                          phone: '02-6222833' },
  { city: 'ירושלים', address: 'שד\' צ\'רצ\'יל',                      phone: '02-5324785' },
  { city: 'מבשרת ציון', address: 'הראל 1, קניון הראל',              phone: '02-5335043' },
  { city: 'מעלה אדומים', address: 'דרך קדם 5',                      phone: '02-5352670' },
  { city: 'שואבה',      address: 'צומת שואבה',                      phone: '02-6526780' },

  // ── חיפה והצפון ──────────────────────────────────────────────────────────
  { city: 'חיפה', address: 'שד\' ההסתדרות 248, ביג קריות',         phone: '04-8710111' },
  { city: 'חיפה', address: 'שד\' ההסתדרות 55, קניון סינמול',       phone: '04-8405088' },
  { city: 'חיפה', address: 'פלימן משה 4, קניון חיפה',              phone: '053-8674761' },
  { city: 'חיפה', address: 'דרך שמחה גולן 64, גרנד קניון',         phone: '04-8123965' },
  { city: 'חיפה', address: 'שד\' ההגנה, בת גלים',                  phone: '04-8502450' },
  { city: 'חיפה', address: 'העליה השניה 8, בת גלים',               phone: '04-8406155' },
  { city: 'חיפה', address: 'השיש, צומת וולקן',                      phone: '04-8408597' },
  { city: 'קריית ביאליק', address: 'דרך עכו 144',                   phone: '053-4263603' },
  { city: 'קריית אתא',   address: 'העצמאות 37',                     phone: '053-9380852' },
  { city: 'כרמיאל',      address: 'מעלה כמון 2, ביג כרמיאל',       phone: '04-9585828' },
  { city: 'נהריה',       address: 'שד\' הגעתון 39',                 phone: '04-9000230' },
  { city: 'רמת ישי',     address: 'אקליפטוס 4',                     phone: '04-6444800' },
  { city: 'יקנעם עילית', address: 'התמר 2, קניון דרכים יקנעם',    phone: '04-9591055' },
  { city: 'מעלות-תרשיחא',address: 'שלמה שרירא 12, קניון כוכב הצפון', phone: '04-6265808' },
  { city: 'נשר',         address: 'דרך בר יהודה 147',               phone: '04-8218880' },
  { city: 'עין המפרץ',   address: 'עין המפרץ',                      phone: '04-9918989' },
  { city: 'בית שאן',     address: 'העמל 7',                          phone: '04-6077777' },
  { city: 'טבריה',       address: 'יהודה הלוי 4',                   phone: '04-8555555' },
  { city: 'צמח',         address: 'צומת צמח',                       phone: '04-6752222' },
  { city: 'בית ינאי',    address: 'צומת בית ינאי',                  phone: '09-8665136' },

  // ── שרון ─────────────────────────────────────────────────────────────────
  { city: 'נתניה',       address: 'רמת אפרים',                      phone: '09-8811275' },
  { city: 'נתניה',       address: 'הרצל 60, קניון השרון',           phone: '09-8870906' },
  { city: 'נתניה',       address: 'שדרות גיבורי ישראל 17',         phone: '09-8326950' },
  { city: 'כפר סבא',    address: 'טשרניחובסקי 57, בית חולים מאיר', phone: '09-7719111' },
  { city: 'כפר סבא',    address: 'ויצמן, מתחם G',                  phone: '09-7741555' },
  { city: 'הרצליה',     address: 'שדרות שבעת הכוכבים 130, קניון',  phone: '09-9502247' },
  { city: 'הרצליה',     address: 'ביילינסון 2, הרצליה מרכז',       phone: '09-9507300' },
  { city: 'חדרה',       address: 'צה"ל 100',                        phone: '04-6340100' },
  { city: 'חדרה',       address: 'ארבע האגודות 21, שערי חדרה',     phone: '04-6550200' },
  { city: 'פרדס חנה כרכור', address: 'תדהר 2, ביג פרדס חנה',       phone: '04-6390700' },
  { city: 'שפיים',      address: 'שפיים, צומת שפיים',               phone: '09-9508833' },
  { city: 'רעננה',      address: 'המלאכה 2, קניון רננים',           phone: '09-7415100' },
  { city: 'רעננה',      address: 'מדרשת רופין, מרכז אקדמי רופין',  phone: '09-8987374' },
  { city: 'בית חרות',   address: 'בית חרות 1, פז חופית ויתקין',    phone: '09-8995500' },
  { city: 'בני דרור',   address: 'קניון דרורים',                    phone: '09-7961792' },

  // ── מרכז / גוש דן (מחוץ לת"א) ────────────────────────────────────────────
  { city: 'אור יהודה',  address: 'אליהו סעדון 120, עזריאלי אאוטלט', phone: '03-5333991' },
  { city: 'בת ים',      address: 'דרך בן גוריון 75, טיילת',         phone: '03-5077543' },
  { city: 'בת ים',      address: 'רוטשילד 29',                       phone: '03-6593550' },
  { city: 'ראשון לציון', address: 'ילדי טהרן 3, סינמה סיטי',        phone: '03-9512040' },
  { city: 'ראשון לציון', address: 'דוד סחרוב 21, קניון הזהב',       phone: '054-3333693' },
  { city: 'גבעת שמואל', address: 'שפינדל יונה 1',                   phone: '03-5368640' },
  { city: 'גבעתיים',    address: 'דרך יצחק רבין 53, קניון גבעתיים', phone: '03-5722800' },
  { city: 'פתח תקווה',  address: 'ראשון לציון 1',                   phone: '03-9191791' },
  { city: 'אזור',       address: 'העלייה השנייה 43',                 phone: '03-5509024' },
  { city: 'רמת גן',     address: 'ז\'בוטינסקי 7, מתחם הבורסה',      phone: '03-6124014' },
  { city: 'שוהם',       address: 'שד\' עמק איילון 30',               phone: '03-9772290' },
  { city: 'באר יעקב',   address: 'שא נס 17',                        phone: '08-6238000' },
  { city: 'נס ציונה',   address: 'הפטיש 6',                         phone: '08-9408441' },
  { city: 'רחובות',     address: 'ביל"ו 2, קניון רחובות',           phone: '08-9494102' },
  { city: 'צריפין',     address: 'צריפין',                           phone: '08-9243091' },

  // ── דרום ─────────────────────────────────────────────────────────────────
  { city: 'אשדוד',      address: 'הגדוד העברי 6, קניון סי מול',     phone: '08-6432185' },
  { city: 'אשקלון',     address: 'שד\' בן גוריון 21, קניון גירון',   phone: '08-6734142' },
  { city: 'אשקלון',     address: 'פאואר סנטר סילבר',                 phone: '08-6751772' },
  { city: 'באר שבע',    address: 'שד\' דוד טוביהו 125',              phone: '08-6444800' },
  { city: 'באר שבע',    address: 'שד\' ירושלים 4',                   phone: '08-6104002' },
  { city: 'באר שבע',    address: 'שד\' יצחק רגר, אוניברסיטת בן-גוריון', phone: '08-6209344' },
  { city: 'באר שבע',    address: 'דרך חברון 21, מקס אמות',          phone: '08-6652032' },
  { city: 'באר שבע',    address: 'צומת אלי כהן',                     phone: '08-6654714' },
  { city: 'קריית גת',   address: 'ככר פז 3',                        phone: '08-6814455' },
  { city: 'נתיבות',     address: 'בעלי המלאכה 2, גלובוס סנטר',      phone: '08-9162522' },
  { city: 'דימונה',     address: 'פרץ סנטר 1',                      phone: '08-6571447' },
  { city: 'אילת',       address: 'הסתת 20, ביג אילת',               phone: '08-6318445' },
  { city: 'אילת',       address: 'טיילת רויאל ביץ\'',               phone: '08-6332026' },
  { city: 'אילת',       address: 'קאמפן 8',                         phone: '08-9177111' },
  { city: 'עין חצבה',   address: 'עין חצבה, כביש 90',               phone: '08-9975151' },
  { city: 'בית קמה',    address: 'צומת בית קמה',                    phone: '08-9919384' },
  { city: 'עין בוקק',   address: 'עין בוקק, ים המלח',               phone: '08-9954021' },
  { city: 'עין עבדת',   address: 'עין עבדת, כביש 40',               phone: '08-6532111' },
  { city: 'מיתר',       address: 'מיתר',                             phone: '08-6231046' },
];

const RPATH = 'src/data/generated/restaurants.osm.json';
const PPATH = 'src/data/generated/places.osm.json';
const rests  = readNoBom(RPATH);
const places = readNoBom(PPATH);

function isDup(e, existing) {
  return existing.some(x =>
    x.name === e.name && x.cityId === e.cityId &&
    x.address.trim() === e.address.trim()
  );
}

const toAdd = BRANCHES.map(r => buildEntry(r)).filter(e => !isDup(e, rests));

writeWithBom(RPATH, [...rests, ...toAdd]);
writeWithBom(PPATH, [...places, ...toAdd]);

console.log(`✅ נוספו ${toAdd.length} סניפי ארומה`);
console.log(`⏭  כבר קיימים: ${BRANCHES.length - toAdd.length}`);
console.log(`סה"כ restaurants: ${rests.length + toAdd.length}`);
