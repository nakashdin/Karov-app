/**
 * Apply manually researched restaurant data (real sources only).
 * Run with: node scripts/apply-researched-data.mjs
 * Add new batches to RESEARCHED array and re-run.
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

// ── Batch 1 – agent ac9d4d1336ae4acc8 (north + center chains) ──────────────
const RESEARCHED = [
  {
    name: 'קפה גרג', city: 'כרמיאל',
    address: 'קניון חוצות כרמיאל, כרמיאל',
    phone: '04-8578475',
    openingHours: 'Su-Th 08:30-21:00; Fr 07:30-15:00',
    website: 'https://gregcafe.co.il',
  },
  {
    name: 'קפה גרג', city: 'ראש פינה',
    address: 'התפוח 5, מתחם סנטר הגליל, ראש פינה',
    phone: '04-6801191',
    openingHours: 'Su-Th 07:30-23:00; Fr 07:30-14:30',
    website: 'https://gregcafe.co.il',
  },
  {
    name: 'חומוס אליהו', city: 'רחובות',
    address: 'אופנהיימר 2, פארק המדע, רחובות',
    phone: '08-6608711',
    openingHours: 'Su-Th 07:30-19:30; Fr 09:00-13:00',
    website: 'https://www.humuseliahu.co.il',
  },
  {
    name: 'חומוס אליהו', city: 'ראש פינה',
    address: 'התפוח 3, סנטר הגליל, ראש פינה',
    phone: '04-6390449',
    openingHours: 'Su-Th 10:00-16:00; Fr 10:00-15:00',
    website: 'https://www.humuseliahu.co.il',
  },
  {
    name: 'פיצה האט', city: 'נשר',
    address: 'טכניון, חיפה',
    phone: '1700-506070',
    openingHours: 'Su-Th 12:00-23:00; Sa 20:45-00:00',
    website: 'https://www.pizzahut.co.il',
  },
  {
    name: 'פיצה האט', city: 'יוקנעם המושבה',
    address: 'התמר 2, מתחם G6, יוקנעם עילית',
    phone: '1700-506070',
    openingHours: 'Su-Th 11:00-23:00; Fr 11:00-14:30; Sa 18:30-23:00',
    website: 'https://www.pizzahut.co.il',
  },
  {
    name: "ג'פניקה", city: 'ראש פינה',
    address: 'דרך הגליל 1, ראש פינה',
    phone: '03-7236100',
    openingHours: 'Su-Sa 12:00-00:00',
    website: 'https://japanika.net',
    instagram: 'https://www.instagram.com/japanika.rosh.pinah/',
  },
  {
    name: "ג'פניקה", city: 'גבעתיים',
    address: 'תפוצות ישראל 5, גבעתיים',
    phone: '053-9386160',
    openingHours: 'Su-Th 12:00-00:00; Fr 12:00-00:00; Sa 12:00-01:00',
    website: 'https://japanika.net',
  },
  {
    name: 'New Deli', city: 'גבעתיים',
    address: 'דרך יצחק רבין 53, גבעתיים',
    phone: '03-7786380',
    openingHours: 'Su-Th 11:00-21:45; Fr 11:00-15:30',
    website: 'https://newdeli.com',
  },
  {
    name: 'New Deli', city: 'פתח תקווה',
    address: "ז'בוטינסקי 72, הקניון הגדול, פתח תקווה",
    phone: '03-7733114',
    openingHours: 'Su-Th 11:00-22:00; Fr 11:00-15:30; Sa 21:30-23:00',
    website: 'https://newdeli.com',
  },
  {
    name: 'קפה קפה', city: 'חולון',
    address: 'סוקולוב 48, חולון',
    phone: '03-5036699',
    openingHours: 'Su-Th 08:00-23:00; Fr 08:00-14:00',
    website: 'https://www.cafecafe.co.il',
  },
  {
    name: 'גולדה', city: 'ראשון לציון',
    address: 'גבעתי 1, ראשון לציון',
    phone: '03-6099949',
    openingHours: 'Su-Th 09:00-23:00; Fr 09:00-15:30',
    website: 'https://www.goldaglida.co.il',
    instagram: 'https://www.instagram.com/golda.glida/',
  },
  {
    name: 'קופיקס', city: 'בת ים',
    address: 'קניון בית ימון, בת ים',
    openingHours: 'Su-Th 09:00-21:30; Fr 09:00-16:00',
    website: 'https://coffix.co.il',
  },
  {
    name: 'קופיקס', city: 'פתח תקווה',
    address: 'רוטשילד 182, פתח תקווה',
    openingHours: 'Su-Th 07:00-21:30; Fr 07:00-16:00',
    website: 'https://coffix.co.il',
  },
  {
    name: 'בורגרים', city: 'נתניה',
    address: 'דרך הרכבת 14, נתניה',
    phone: '09-8344944',
    openingHours: 'Su-Th 11:00-23:30; Fr 11:00-14:30',
    website: 'https://www.iburgerim.co.il',
  },
  {
    name: 'בורגרים', city: 'שוהם',
    address: "שד' עמק איילון 161, שוהם",
    phone: '03-5072979',
    openingHours: 'Su-Th 11:00-23:00',
    website: 'https://www.iburgerim.co.il',
  },
];

// ── Batch 2 – agent abbbcc1e6602844c2 (Eilat + Jerusalem + south) ────────────
const BATCH2 = [
  {
    name: 'לורנס', city: 'אילת',
    address: 'הים 8, מלון הרודס ויטאליס, אילת',
    phone: '050-4068336',
    openingHours: 'Su-Th 18:30-22:30; Sa 20:30-00:00',
    website: 'https://www.lawrence-eilat.co.il',
    instagram: 'https://www.instagram.com/lawrence__eilat/',
  },
  {
    name: 'קפה בולבארד', city: 'אילת',
    address: 'שדרת לה בולבארד, מלון ישרוטל, אילת',
    phone: '053-9427425',
    openingHours: 'Su-Th 10:00-21:00; Fr 09:00-16:00; Sa 12:00-21:00',
    website: 'https://www.cafeboulevard.co.il',
  },
  {
    name: "ראנץ' האוס בר בורגר", city: 'אילת',
    address: "טיילת רויאל ביץ', אילת",
    phone: '053-9442738',
    openingHours: 'Su-Th 18:30-22:30; Sa 21:30-22:30',
    website: 'https://www.ranchhouse.co.il',
    instagram: 'https://www.instagram.com/ranch_house_eilat/',
  },
  {
    name: 'Buffalo Steak House', city: 'אילת',
    address: 'מלון הילטון מלכת שווא, החוף הצפוני, אילת',
    phone: '08-6306780',
    openingHours: 'Su-Th 19:00-23:00; Sa 21:00-23:00',
  },
  {
    name: "Levi's Place", city: 'ירושלים',
    address: 'פארן 13, ירושלים',
    phone: '02-6436778',
    openingHours: 'Su-Fr 07:30-21:30',
    instagram: 'https://www.instagram.com/levis.place/',
  },
  {
    name: 'צלילי האש', city: 'בני ברק',
    address: 'דרך זאב ז\'בוטינסקי 100, בני ברק',
    phone: '053-9375646',
    openingHours: 'Su-We 11:00-23:00; Th 11:00-23:30',
  },
];
RESEARCHED.push(...BATCH2);

// ── Batch 3 – agent a75cb0e67a5fc4775 (Aroma official site) ─────────────────
// 1 OSM entry per city → matched to the most-central branch
const BATCH3 = [
  {
    name: 'ארומה', city: 'ירושלים',
    address: 'הלל 18, ירושלים',
    phone: '02-6255365',
    openingHours: 'Su-Sa 06:00-23:00',
    website: 'https://www.aroma.co.il',
  },
  {
    name: 'ארומה', city: 'באר שבע',
    address: 'מרכז ביג, דרך חברון 21, באר שבע',
    phone: '08-6652032',
    openingHours: 'Su-Th 07:15-21:30; Fr 07:15-14:30; Sa 08:00-21:30',
    website: 'https://www.aroma.co.il',
  },
];
RESEARCHED.push(...BATCH3);

// שגיאות OSM — מקומות שלא קיימים בפועל לפי אתרים רשמיים
const WRONG_ENTRIES = [
  { name: 'ארומה',        city: "כפר חב\"ד" },  // אין ארומה בכפר חב"ד
  { name: "מקדונלד'ס",   city: "כפר חב\"ד" },  // אין מקדונלד'ס בכפר חב"ד
  { name: "מקדונלד'ס",   city: 'נטעים' },       // אין מקדונלד'ס בנטעים
  { name: "McDonald's מקדונלד'ס", city: 'נטעים' },
];

// ── Batch 4 – agent a771c6a41a6a8aa5a (Roladin, Golda, Burgers Bar) ─────────
const BATCH4 = [
  {
    name: 'רולדין', city: 'שוהם',
    phone: '03-5039419',
    openingHours: 'Su-Th 06:30-21:00; Fr 07:00-14:30',
    website: 'https://www.roladin.co.il',
  },
  {
    name: 'בורגרס בר', city: 'מודיעין-מכבים-רעות',
    address: 'עמק דותן 23, מרכז מליבו סנטר, מודיעין',
    openingHours: 'Su-Th 11:00-23:59',
    website: 'https://www.burgersbar.co.il',
  },
  {
    name: 'בורגרס בר', city: 'תל אביב–יפו',
    address: 'טאגור 30, תל אביב',
    openingHours: 'Su-Th 11:00-23:30; Fr 11:00-15:00',
    website: 'https://www.burgersbar.co.il',
  },
];
RESEARCHED.push(...BATCH4);

// ── Batch 5 – agent a66ba948a5ceaa547 (McDonald's official site) ─────────────
const BATCH5 = [
  {
    name: "מקדונלד'ס", city: 'ירושלים',
    address: "בן יהודה 7, ירושלים",
    openingHours: 'Su-We 11:00-23:00; Th 11:00-23:59; Fr 10:30-16:00; Sa 21:30-23:59',
    website: 'https://www.mcdonalds.co.il',
  },
  {
    name: "מקדונלד'ס", city: 'באר שבע',
    address: 'שדרות דוד טוביהו 125, באר שבע',
    openingHours: 'Su 10:00-23:00; Mo-Th 10:30-23:00; Fr 10:00-16:00; Sa 21:30-00:00',
    website: 'https://www.mcdonalds.co.il',
  },
  {
    name: "מקדונלד'ס", city: 'קרית שמונה',
    address: "טשרניחובסקי 4, קריית שמונה",
    openingHours: 'Su-Tu 11:00-21:00; We-Th 11:00-22:00; Fr 10:30-15:00',
    website: 'https://www.mcdonalds.co.il',
  },
];
RESEARCHED.push(...BATCH5);

// ── Confirmed CLOSED restaurants (delete from DB) ─────────────────────────
const CONFIRMED_CLOSED = [
  { name: 'יאקימונו',        city: 'אילת' },
  { name: 'שיפודי הבוסתן',  city: 'אילת' },
  { name: 'שיפודי אילת',    city: 'אילת' },
  { name: 'מרינה גריל',     city: 'אילת' },
  { name: 'Denis Kingdom',   city: 'אילת' },
  { name: 'סומסה',           city: 'גבעתיים' },
];

// Match by name + city (exact)
function applyToFile(path, updates) {
  const data = readNoBom(path);
  let count = 0;
  const result = data.map(p => {
    const upd = updates.find(u => u.name === p.name && u.city === p.cityId);
    if (!upd) return p;
    count++;
    const merged = { ...p };
    if (upd.phone    && !p.phone)        merged.phone        = upd.phone;
    if (upd.address  && p.address === p.cityId) merged.address = upd.address;
    if (upd.openingHours && !p.openingHours) merged.openingHours = upd.openingHours;
    if (upd.website  && !p.website)      merged.website      = upd.website;
    if (upd.instagram && !p.instagram)   merged.instagram    = upd.instagram;
    if (upd.facebook && !p.facebook)     merged.facebook     = upd.facebook;
    return merged;
  });
  writeWithBom(path, result);
  return count;
}

function deleteFromFile(path, closed) {
  const data = readNoBom(path);
  const before = data.length;
  const result = data.filter(p =>
    !closed.some(c => c.name === p.name && c.city === p.cityId)
  );
  writeWithBom(path, result);
  return before - result.length;
}

const RPATH = 'src/data/generated/restaurants.osm.json';
const PPATH = 'src/data/generated/places.osm.json';

const r = applyToFile(RPATH, RESEARCHED);
const p = applyToFile(PPATH, RESEARCHED);
console.log(`✅ עודכנו: ${r} ב-restaurants | ${p} ב-places`);

const dr = deleteFromFile(RPATH, CONFIRMED_CLOSED);
const dp = deleteFromFile(PPATH, CONFIRMED_CLOSED);
console.log(`🗑 נמחקו (נסגרו): ${dr} ב-restaurants | ${dp} ב-places`);

const wr = deleteFromFile(RPATH, WRONG_ENTRIES);
const wp = deleteFromFile(PPATH, WRONG_ENTRIES);
console.log(`🗑 נמחקו (שגיאות OSM): ${wr} ב-restaurants | ${wp} ב-places`);
