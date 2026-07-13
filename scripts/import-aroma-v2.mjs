/**
 * ייבוא סניפי ארומה אספרסו בר — נתונים רשמיים מאתר aroma.co.il
 * מוחק את כל הסניפים הישנים ומוסיף מחדש.
 * הרצה: node scripts/import-aroma-v2.mjs
 *
 * ⚠️  URL חסר לסניפים מחוץ לירושלים/מודיעין — יש להשלים מהאתר הרשמי!
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
  'ירושלים':          { lat: 31.7683, lon: 35.2137 },
  'בית שמש':          { lat: 31.7458, lon: 34.9926 },
  'מודיעין':          { lat: 31.8966, lon: 35.0102 },
  'מעלה אדומים':      { lat: 31.7731, lon: 35.2955 },
  'תל אביב':          { lat: 32.0853, lon: 34.7818 },
  'חיפה':             { lat: 32.7940, lon: 34.9896 },
  'באר שבע':          { lat: 31.2518, lon: 34.7913 },
  'ראשון לציון':      { lat: 31.9730, lon: 34.7898 },
  'פתח תקווה':        { lat: 32.0840, lon: 34.8878 },
  'אשדוד':            { lat: 31.8040, lon: 34.6553 },
  'אשקלון':           { lat: 31.6688, lon: 34.5742 },
  'נתניה':            { lat: 32.3215, lon: 34.8532 },
  'חולון':            { lat: 32.0114, lon: 34.7799 },
  'בני ברק':          { lat: 32.0840, lon: 34.8340 },
  'רמת גן':           { lat: 32.0682, lon: 34.8243 },
  'גבעתיים':          { lat: 32.0680, lon: 34.8126 },
  'בת ים':            { lat: 32.0235, lon: 34.7507 },
  'הרצליה':           { lat: 32.1663, lon: 34.8392 },
  'כפר סבא':          { lat: 32.1781, lon: 34.9075 },
  'רעננה':            { lat: 32.1839, lon: 34.8708 },
  'רחובות':           { lat: 31.8928, lon: 34.8113 },
  'נס ציונה':         { lat: 31.9285, lon: 34.7982 },
  'יהוד':             { lat: 32.0310, lon: 34.8890 },
  'באר יעקב':         { lat: 31.9363, lon: 34.8386 },
  'גבעת שמואל':       { lat: 32.0782, lon: 34.8458 },
  'אור יהודה':        { lat: 32.0321, lon: 34.8712 },
  'רמת השרון':        { lat: 32.1465, lon: 34.8406 },
  'הוד השרון':        { lat: 32.1508, lon: 34.8896 },
  'חדרה':             { lat: 32.4340, lon: 34.9187 },
  'פרדס חנה כרכור':   { lat: 32.4706, lon: 34.9711 },
  'קריית אתא':        { lat: 32.8056, lon: 35.1048 },
  'קריית ים':         { lat: 32.8497, lon: 35.0693 },
  'קריית אונו':       { lat: 32.0579, lon: 34.8559 },
  'נהריה':            { lat: 33.0045, lon: 35.0955 },
  'מגדל העמק':        { lat: 32.6795, lon: 35.2392 },
  'עפולה':            { lat: 32.6076, lon: 35.2899 },
  'טבריה':            { lat: 32.7921, lon: 35.5312 },
  'בית שאן':          { lat: 32.5010, lon: 35.5000 },
  'מעלות-תרשיחא':     { lat: 33.0137, lon: 35.2687 },
  'טירת כרמל':        { lat: 32.7606, lon: 35.0073 },
  'אור עקיבא':        { lat: 32.5040, lon: 34.9156 },
  'גדרה':             { lat: 31.8120, lon: 34.7760 },
  'גן יבנה':          { lat: 31.7870, lon: 34.7045 },
  'קריית גת':         { lat: 31.6100, lon: 34.7641 },
  'נתיבות':           { lat: 31.4228, lon: 34.5878 },
  'דימונה':           { lat: 31.0677, lon: 35.0347 },
  'ערד':              { lat: 31.2598, lon: 35.2141 },
  'רמלה':             { lat: 31.9245, lon: 34.8706 },
  'לוד':              { lat: 31.9516, lon: 34.8942 },
  'אילת':             { lat: 29.5581, lon: 34.9482 },
  'כפר עזה':          { lat: 31.4910, lon: 34.5460 },
  'צריפין':           { lat: 31.9627, lon: 34.9113 },
  'קסטינה':           { lat: 31.7280, lon: 34.7450 },
  'אורים':            { lat: 31.3500, lon: 34.5900 },
};

let idCounter = 9400000;
function makeId() { return String(idCounter++); }

const MISSING_URL = null; // ⚠️ יש להשלים את ה-URL מהאתר הרשמי

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
    website: r.url || 'https://www.aroma.co.il',
    openingHours: r.hours || undefined,
    category: 'dairy',
    certifiedBy: r.certified,
    source: 'manual',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// סניפים רשמיים מאתר aroma.co.il — כשרים בלבד
// מוסמן ⚠️ = URL חסר, יש להשלים
// ─────────────────────────────────────────────────────────────────────────────
const BRANCHES = [

  // ══ ירושלים ══════════════════════════════════════════════════════════════
  {
    city: 'בית שמש', address: 'יגאל אלון 1, ביג בית שמש',
    phone: '02-9921674', certified: 'כשר למהדרין',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-14:00',
    url: 'https://www.aroma.co.il/store/%d7%91%d7%99%d7%92-%d7%91%d7%99%d7%aa-%d7%a9%d7%9e%d7%a9/',
  },
  {
    city: 'ירושלים', address: 'ביה"ח הדסה עין כרם, ירושלים',
    phone: '051-2878566', certified: 'כשר למהדרין',
    hours: 'Su-Th 06:00-20:00; Fr 06:00-13:00',
    url: 'https://www.aroma.co.il/store/%d7%91%d7%99%d7%aa-%d7%97%d7%95%d7%9c%d7%99%d7%9d-%d7%94%d7%93%d7%a1%d7%94-%d7%a2%d7%99%d7%9f-%d7%9b%d7%a8%d7%9d/',
  },
  {
    city: 'ירושלים', address: 'שמואל בייט 12, ירושלים',
    phone: '02-6639000', certified: 'כשר למהדרין',
    hours: 'Su-Th 06:30-21:00; Fr 06:30-13:00',
    url: 'https://www.aroma.co.il/store/%d7%91%d7%99%d7%aa-%d7%97%d7%95%d7%9c%d7%99%d7%9d-%d7%a9%d7%a2%d7%a8%d7%99-%d7%a6%d7%93%d7%a7/',
  },
  {
    city: 'ירושלים', address: 'בית הדפוס 12, גבעת שאול, ירושלים',
    phone: '02-5326681', certified: 'כשר למהדרין',
    hours: 'Su-Th 06:00-18:30; Fr 06:00-12:00',
    url: 'https://www.aroma.co.il/store/%d7%91%d7%99%d7%aa-%d7%94%d7%93%d7%a4%d7%95%d7%a1/',
  },
  {
    city: 'ירושלים', address: 'פרופסור רקח 1, ירושלים',
    phone: '050-7279094', certified: 'כשר',
    hours: 'Su-Th 08:00-16:00',
    url: 'https://www.aroma.co.il/store/%d7%90%d7%95%d7%a0%d7%99%d7%91%d7%a8%d7%a1%d7%99%d7%98%d7%aa-%d7%92%d7%91%d7%a2%d7%aa-%d7%a8%d7%9d/',
  },
  {
    city: 'ירושלים', address: 'רחוב יפו 42, ירושלים',
    phone: '02-6241102', certified: 'כשר למהדרין',
    hours: 'Su-Th 07:00-19:30; Fr 07:00-14:30',
    url: 'https://www.aroma.co.il/store/%d7%99%d7%a4%d7%95/',
  },
  {
    city: 'ירושלים', address: 'עמק רפאים 43, ירושלים',
    phone: '02-5617236', certified: 'כשר',
    hours: 'Su-Th 06:00-22:30; Fr 06:00-14:30; Sa 17:45-23:00',
    url: 'https://www.aroma.co.il/store/%d7%a2%d7%9e%d7%a7-%d7%a8%d7%a4%d7%90%d7%99%d7%9d-%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d/',
  },
  {
    city: 'ירושלים', address: 'גנרל פייר קניג 26, קניון הדר, ירושלים',
    phone: '02-6712228', certified: 'כשר',
    hours: 'Su-Th 07:45-21:00; Fr 07:45-14:00',
    url: 'https://www.aroma.co.il/store/%d7%a7%d7%a0%d7%99%d7%95%d7%9f-%d7%94%d7%93%d7%a8/',
  },
  {
    city: 'ירושלים', address: 'קניון מלחה, ירושלים',
    phone: '02-6799154', certified: 'כשר',
    hours: 'Su-Th 08:15-20:00; Fr 08:15-13:30',
    url: 'https://www.aroma.co.il/store/%d7%a7%d7%a0%d7%99%d7%95%d7%9f-%d7%9e%d7%9c%d7%97%d7%94/',
  },
  {
    city: 'ירושלים', address: 'שדרות ממילא, ירושלים',
    phone: '02-6241367', certified: 'כשר',
    hours: 'Su-We 07:30-22:30; Th 07:30-23:00; Fr 07:30-15:30; Sa 20:30-23:30',
    url: 'https://www.aroma.co.il/store/%d7%a7%d7%a0%d7%99%d7%95%d7%9f-%d7%9e%d7%9e%d7%99%d7%9c%d7%90/',
  },
  {
    city: 'ירושלים', address: 'שוק מחנה יהודה, ירושלים',
    phone: '02-6222833', certified: 'כשר למהדרין',
    hours: 'Su-Th 06:30-19:00; Fr 06:30-15:30',
    url: 'https://www.aroma.co.il/store/%d7%a9%d7%95%d7%a7-%d7%9e%d7%97%d7%a0%d7%94-%d7%99%d7%94%d7%95%d7%93%d7%94/',
  },
  {
    city: 'ירושלים', address: 'התעשיה 6, ירושלים',
    phone: '02-5353160', certified: 'כשר',
    hours: 'Su-Th 07:00-17:00; Fr 07:00-13:00',
    url: 'https://www.aroma.co.il/store/%d7%aa%d7%9c%d7%a4%d7%99%d7%95%d7%aa-%d7%94%d7%aa%d7%a2%d7%a9%d7%99%d7%94-%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d/',
  },

  // ══ מודיעין / מעלה אדומים ═════════════════════════════════════════════════
  {
    city: 'מודיעין', address: 'לאה אימנו 1, מודיעין',
    phone: '08-8687070', certified: 'כשר למהדרין',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-14:00',
    url: 'https://www.aroma.co.il/store/%d7%9e%d7%95%d7%a8%d7%99%d7%94-%d7%a1%d7%a0%d7%98%d7%a8-%d7%9e%d7%95%d7%93%d7%99%d7%a2%d7%99%d7%9f/',
  },
  {
    city: 'מודיעין', address: 'קניון עזריאלי, מודיעין',
    phone: '08-9265510', certified: 'כשר',
    hours: 'Su-Th 07:00-22:00; Fr 07:00-15:00; Sa 19:30-22:30',
    url: 'https://www.aroma.co.il/store/%d7%a7%d7%a0%d7%99%d7%95%d7%9f-%d7%a2%d7%96%d7%a8%d7%99%d7%90%d7%9c%d7%99-%d7%9e%d7%95%d7%93%d7%99%d7%a2%d7%99%d7%9f/',
  },
  {
    city: 'מעלה אדומים', address: 'דרך קדם 5, מעלה אדומים',
    phone: '02-5352670', certified: 'כשר',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-14:00; Sa 21:00-22:30',
    url: 'https://www.aroma.co.il/store/%d7%9e%d7%a2%d7%9c%d7%94-%d7%90%d7%93%d7%95%d7%9e%d7%99%d7%9d/',
  },

  // ══ דרום ═════════════════════════════════════════════════════════════════
  {
    city: 'אילת', address: 'הסתת 20, מרכז ביג, אילת',
    phone: '08-6318445', certified: 'כשר למהדרין',
    hours: 'Su-Th 08:30-20:30; Fr 08:30-14:00; Sa 21:00-22:30',
    url: MISSING_URL, // ⚠️ URL חסר
  },
  {
    city: 'גדרה', address: 'שד׳ בן גוריון 105, ביג גדרה',
    phone: '08-6239915', certified: 'כשר למהדרין',
    hours: 'Su-Th 07:30-22:00; Fr 07:30-14:30',
    url: MISSING_URL,
  },
  {
    city: 'קסטינה', address: 'ביג קסטינה, א.ת באר טוביה, צומת קסטינה',
    phone: '08-8504404', certified: 'כשר למהדרין',
    hours: 'Su-Th 06:30-22:15; Fr 06:30-15:00; Sa 20:45-22:15',
    url: MISSING_URL,
  },
  {
    city: 'באר שבע', address: 'שדרות דוד טוביהו 125, באר שבע',
    phone: '08-6444800', certified: 'כשר',
    hours: 'Su-Th 08:45-21:00; Fr 08:00-14:00; Sa 18:30-22:00',
    url: MISSING_URL,
  },
  {
    city: 'דימונה', address: 'פרץ סנטר, דימונה',
    phone: '08-6571447', certified: 'כשר',
    hours: 'Su-Th 07:00-22:00; Fr 07:00-14:00; Sa 21:00-23:30',
    url: MISSING_URL,
  },
  {
    city: 'כפר עזה', address: 'צומת כפר עזה',
    phone: '08-6212330', certified: 'כשר',
    hours: 'Su-Th 08:00-20:00; Fr 08:00-13:00',
    url: MISSING_URL,
  },
  {
    city: 'אילת', address: 'אנטיב 8, מלכת שבא, אילת',
    phone: '08-6888422', certified: 'כשר למהדרין',
    hours: 'Su-Th 07:00-22:00; Fr 07:00-14:00',
    url: MISSING_URL,
  },
  {
    city: 'נתיבות', address: 'בעלי המלאכה 2, נתיבות',
    phone: '08-9162522', certified: 'כשר למהדרין',
    hours: 'Su-Th 07:00-22:00; Fr 07:00-13:00',
    url: MISSING_URL,
  },
  {
    city: 'אשדוד', address: 'וויצמן פינת בן-גוריון, סטאר סנטר, אשדוד',
    phone: '08-8568160', certified: 'כשר',
    hours: 'Su-Th 05:00-23:00; Fr 05:00-14:00; Sa 20:30-23:59',
    url: MISSING_URL,
  },
  {
    city: 'ערד', address: 'שמיר 11, צים סנטר, ערד',
    phone: '08-6738313', certified: 'כשר',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-15:00; Sa 20:30-22:00',
    url: MISSING_URL,
  },
  {
    city: 'אורים', address: 'דור אלון, צומת אורים',
    phone: '08-6224047', certified: 'כשר',
    hours: 'Su-Th 08:00-19:30; Fr 08:00-13:00',
    url: MISSING_URL,
  },
  {
    city: 'אשקלון', address: 'שד׳ בן-גוריון 21, קניון גירון, אשקלון',
    phone: '08-6734142', certified: 'כשר',
    hours: 'Su-Th 08:00-20:30; Fr 08:00-14:00; Sa 20:30-21:30',
    url: MISSING_URL,
  },
  {
    city: 'גן יבנה', address: 'המגינים 56, גן יבנה',
    phone: '08-9230700', certified: 'כשר למהדרין',
    hours: 'Su-Th 07:00-22:00; Fr 07:00-14:00',
    url: MISSING_URL,
  },
  {
    city: 'באר שבע', address: 'קניון הנגב, צומת אלי כהן, באר שבע',
    phone: '08-6650016', certified: 'כשר',
    hours: 'Su-Th 08:30-20:00; Fr 08:30-13:30',
    url: MISSING_URL,
  },
  {
    city: 'אשדוד', address: 'הגדוד העברי 6, קניון סימול, אשדוד',
    phone: '08-6432185', certified: 'כשר',
    hours: 'Su-Th 08:00-21:00; Fr 08:00-14:00',
    url: MISSING_URL,
  },
  {
    city: 'קריית גת', address: 'כיכר פז 3, קניון לב העיר, קריית גת',
    phone: '08-6814455', certified: 'כשר',
    hours: 'Su-Th 07:30-21:00; Fr 07:30-13:00',
    url: MISSING_URL,
  },
  {
    city: 'באר שבע', address: 'התקווה 4, קניון קריית הממשלה, באר שבע',
    phone: null, certified: 'כשר',
    hours: 'Su-Th 08:00-19:00; Fr 08:00-14:00',
    url: MISSING_URL,
  },
  {
    city: 'באר שבע', address: 'שד׳ יצחק רגר 57, באר שבע',
    phone: '08-6897095', certified: 'כשר',
    hours: 'Su-Th 07:30-20:00; Fr 07:30-13:00',
    url: MISSING_URL,
  },
  {
    city: 'באר שבע', address: 'שדרות ירושלים 4, באר שבע',
    phone: '08-6104002', certified: 'כשר',
    hours: 'Su-Th 07:00-22:30; Fr 07:00-13:00',
    url: MISSING_URL,
  },
  {
    city: 'אשקלון', address: 'פאואר סנטר סילבר, אשקלון',
    phone: '08-6751675', certified: 'כשר למהדרין',
    hours: 'Su-Th 06:15-21:00; Fr 06:15-14:30',
    url: MISSING_URL,
  },
  {
    city: 'באר שבע', address: 'בן צבי 4, תחנה מרכזית, באר שבע',
    phone: '08-6861200', certified: 'כשר',
    hours: 'Su-Th 07:00-19:30; Fr 07:00-12:00',
    url: MISSING_URL,
  },

  // ══ צפון ══════════════════════════════════════════════════════════════════
  {
    city: 'נהריה', address: 'שד׳ בן צבי 1, קניון סטאר, נהריה',
    phone: '04-6001180', certified: 'כשר למהדרין',
    hours: 'Su-Th 09:00-21:30; Fr 09:00-14:30; Sa 21:15-22:45',
    url: MISSING_URL,
  },
  {
    city: 'מגדל העמק', address: 'דרך העמק 1, ביג מגדל העמק',
    phone: '04-6602911', certified: 'כשר',
    hours: 'Su-Th 06:30-22:00; Fr 06:30-14:00; Sa 21:00-23:00',
    url: MISSING_URL,
  },
  {
    city: 'טבריה', address: 'מרכז ביג פוריה, טבריה עילית',
    phone: '04-8555555', certified: 'כשר',
    hours: 'Su-Th 07:30-22:30; Fr 08:00-13:30; Sa 20:30-22:30',
    url: MISSING_URL,
  },
  {
    city: 'פרדס חנה כרכור', address: 'תדהר 1, מרכז ביג, פרדס חנה',
    phone: '04-6724112', certified: 'כשר',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-15:00',
    url: MISSING_URL,
  },
  {
    city: 'בית שאן', address: 'העמל 7, צים סנטר, בית שאן',
    phone: '04-6077777', certified: 'כשר',
    hours: 'Su-Th 07:30-21:00; Fr 07:30-14:00',
    url: MISSING_URL,
  },
  {
    city: 'טבריה', address: 'יהודה הלוי 4, מתחם בית בזלת, טבריה',
    phone: '04-8555555', certified: 'כשר',
    hours: 'Su-Th 07:00-22:00; Fr 07:00-13:00',
    url: MISSING_URL,
  },
  {
    city: 'מעלות-תרשיחא', address: 'שלמה שרירא 12, מרכז צים, מעלות',
    phone: '04-6265808', certified: 'כשר',
    hours: 'Su-Th 08:00-20:30; Fr 08:00-13:30',
    url: MISSING_URL,
  },
  {
    city: 'אור עקיבא', address: 'השיקמים 8, נוף ים סנטר, אור עקיבא',
    phone: '04-6033100', certified: 'כשר',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-14:00',
    url: MISSING_URL,
  },
  {
    city: 'עפולה', address: 'יהושע חנקין 49, עפולה',
    phone: '04-6896050', certified: 'כשר',
    hours: 'Su-Th 07:00-22:00; Fr 07:00-14:00; Sa 20:45-23:00',
    url: MISSING_URL,
  },
  {
    city: 'טירת כרמל', address: 'הרצל 82, טירת כרמל',
    phone: '04-6167546', certified: 'כשר',
    hours: 'Su-Th 06:30-22:00; Fr 06:30-15:00; Sa 21:00-23:30',
    url: MISSING_URL,
  },
  {
    city: 'אור עקיבא', address: 'הנשיא 1, קניון אורות, אור עקיבא',
    phone: '04-6261717', certified: 'כשר',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-14:00',
    url: MISSING_URL,
  },
  {
    city: 'קריית אתא', address: 'העצמאות 37, קריית אתא',
    phone: '04-6215016', certified: 'כשר למהדרין',
    hours: 'Su-Th 07:30-21:30; Fr 07:30-14:00',
    url: MISSING_URL,
  },
  {
    city: 'קריית ים', address: 'שדרות ירושלים 99, קריית ים',
    phone: '04-6122862', certified: 'כשר למהדרין',
    hours: 'Su-Th 07:30-22:30; Fr 07:30-15:00',
    url: MISSING_URL,
  },
  {
    city: 'חדרה', address: 'יהודי פקיעין 1, שערי חדרה',
    phone: '04-6221333', certified: 'כשר',
    hours: 'Su-Th 07:00-22:00; Fr 07:00-15:00',
    url: MISSING_URL,
  },

  // ══ גוש דן / מרכז ════════════════════════════════════════════════════════
  {
    city: 'רמת גן', address: 'ביה"ח לילדים ספרא, תל השומר',
    phone: null, certified: 'כשר למהדרין',
    hours: 'Su-Th 06:30-20:00; Fr 06:30-14:00',
    url: MISSING_URL,
  },
  {
    city: 'רמת גן', address: 'אבא הלל סילבר 301, קניון איילון, רמת גן',
    phone: '052-2096195', certified: 'כשר',
    hours: 'Su-Th 08:00-22:00; Fr 08:00-15:30; Sa 20:00-23:00',
    url: MISSING_URL,
  },
  {
    city: 'פתח תקווה', address: 'ז\'בוטינסקי 72, הקניון הגדול אבנת, פתח תקווה',
    phone: '03-9192270', certified: 'כשר',
    hours: 'Su-Th 08:30-21:00; Fr 08:30-13:30',
    url: MISSING_URL,
  },
  {
    city: 'לוד', address: 'אולם מקבלי הפנים, נתב"ג',
    phone: null, certified: 'כשר למהדרין',
    hours: 'Su-Th 00:00-24:00; Fr 00:00-14:00; Sa 19:00-23:59',
    url: MISSING_URL,
  },
  {
    city: 'פתח תקווה', address: 'ראשון לציון 1, פתח תקווה',
    phone: '03-9191791', certified: 'כשר',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-14:00',
    url: MISSING_URL,
  },
  {
    city: 'רמת גן', address: 'ז\'בוטינסקי 7, מגדל משה אביב, בורסה',
    phone: '03-6114000', certified: 'כשר',
    hours: 'Su-Th 06:30-19:00',
    url: MISSING_URL,
  },
  {
    city: 'רמת גן', address: 'קניון גימיון, ביה"ח תל השומר',
    phone: '03-7362220', certified: 'כשר',
    hours: 'Su-Th 06:00-22:00; Fr 06:00-15:00',
    url: MISSING_URL,
  },
  {
    city: 'פתח תקווה', address: 'יצחק רבין 1, גלובל טאוורס, פתח תקווה',
    phone: '03-5186376', certified: 'כשר',
    hours: 'Su-Th 07:00-18:00; Fr 08:00-12:30',
    url: MISSING_URL,
  },
  {
    city: 'בת ים', address: 'יוספטל 92, ביג פאשן, בת ים',
    phone: '03-5562002', certified: 'כשר למהדרין',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-14:30',
    url: MISSING_URL,
  },
  {
    city: 'רמת השרון', address: 'ביג פאשן גלילות, רמת השרון',
    phone: null, certified: 'כשר',
    hours: 'Su-Th 08:30-21:00; Fr 08:30-15:00',
    url: MISSING_URL,
  },
  {
    city: 'בני ברק', address: 'בן גוריון 1, מגדל בסר 2, בני ברק',
    phone: '03-6967200', certified: 'כשר למהדרין',
    hours: 'Su-Th 06:30-19:00; Fr 06:30-13:00',
    url: MISSING_URL,
  },
  {
    city: 'הוד השרון', address: 'הרקון 2, מתחם מיקס שרונים, הוד השרון',
    phone: null, certified: 'כשר',
    hours: 'Su-Th 09:00-20:00; Fr 09:00-14:00',
    url: MISSING_URL,
  },
  {
    city: 'כפר סבא', address: 'ויצמן 207, מתחם G, כפר סבא',
    phone: '09-7680094', certified: 'כשר',
    hours: 'Su-Th 06:45-22:00; Fr 06:45-15:00; Sa 20:45-22:45',
    url: MISSING_URL,
  },
  {
    city: 'אור יהודה', address: 'אליהו סעדון 120, עזריאלי אאוטלט, אור יהודה',
    phone: '03-5333991', certified: 'כשר',
    hours: 'Su-Th 07:30-21:00; Fr 08:00-14:00',
    url: MISSING_URL,
  },
  {
    city: 'גבעת שמואל', address: 'שפינדל יונה 1, תחנת פז אורלי, גבעת שמואל',
    phone: '03-5368640', certified: 'כשר',
    hours: 'Su-Th 06:00-21:00; Fr 06:00-14:00',
    url: MISSING_URL,
  },
  {
    city: 'רעננה', address: 'תחנת דלק פז, צומת רופין',
    phone: '09-8987374', certified: 'כשר',
    hours: 'Su-Th 06:15-21:00; Fr 06:15-15:00',
    url: MISSING_URL,
  },
  {
    city: 'גבעתיים', address: 'דרך יצחק רבין 53, קניון גבעתיים',
    phone: '03-5722800', certified: 'כשר',
    hours: 'Su-Th 07:15-21:30; Fr 07:15-15:30',
    url: MISSING_URL,
  },
  {
    city: 'חולון', address: 'גולדה מאיר 7, קניון חולון',
    phone: '03-5176650', certified: 'כשר',
    hours: 'Su-Th 07:30-21:00; Fr 07:30-14:00',
    url: MISSING_URL,
  },
  {
    city: 'נתניה', address: 'הרצל 60, קניון השרון, נתניה',
    phone: '09-8870906', certified: 'כשר',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-14:00',
    url: MISSING_URL,
  },
  {
    city: 'נתניה', address: 'שדרות טום לנטוס 60, קניון נעימי, נתניה',
    phone: null, certified: 'כשר',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-13:00',
    url: MISSING_URL,
  },
  {
    city: 'יהוד', address: 'דרך משה דיין 3, קניון סביונים, יהוד',
    phone: '03-9343777', certified: 'כשר',
    hours: 'Su-Th 07:30-21:30; Fr 07:30-14:00',
    url: MISSING_URL,
  },
  {
    city: 'נתניה', address: 'בני ברמן 2, קניון עיר ימים, נתניה',
    phone: '09-8326950', certified: 'כשר',
    hours: 'Su-Th 08:30-21:30; Fr 08:30-14:30; Sa 20:15-23:00',
    url: MISSING_URL,
  },
  {
    city: 'קריית אונו', address: 'המלך שלמה 37, קניון קריית אונו',
    phone: '03-6093907', certified: 'כשר',
    hours: 'Su-Th 07:30-21:00; Fr 07:30-14:00',
    url: MISSING_URL,
  },
  {
    city: 'רעננה', address: 'המלאכה 2, קניון רננים, רעננה',
    phone: '09-7415445', certified: 'כשר',
    hours: 'Su-Th 08:30-21:30; Fr 08:00-14:30; Sa 21:00-22:30',
    url: MISSING_URL,
  },
  {
    city: 'הרצליה', address: 'בילינסון 2, שדרות חן, הרצליה',
    phone: '09-7660028', certified: 'כשר',
    hours: 'Su-Th 07:00-20:00; Fr 07:00-14:30',
    url: MISSING_URL,
  },
  {
    city: 'צריפין', address: 'ביה"ח אסף הרופא, שער יפו',
    phone: '08-9243091', certified: 'כשר',
    hours: 'Su-Th 06:30-21:00; Fr 06:30-13:30',
    url: MISSING_URL,
  },
  {
    city: 'ראשון לציון', address: 'ישראל גלילי 5, מתחם בית המשפט, ראשון לציון',
    phone: '03-9414883', certified: 'כשר',
    hours: 'Su-Th 07:00-18:30; Fr 07:30-13:30',
    url: MISSING_URL,
  },
  {
    city: 'רחובות', address: 'דרך הים 1, מיקס רחובות',
    phone: '08-9477056', certified: 'כשר',
    hours: 'Su-Th 07:30-21:30; Fr 07:30-14:30',
    url: MISSING_URL,
  },
  {
    city: 'נס ציונה', address: 'הפטיש 6, ישפרו סנטר, נס ציונה',
    phone: '08-9408441', certified: 'כשר',
    hours: 'Su-Th 07:00-20:00; Fr 07:00-13:30',
    url: MISSING_URL,
  },
  {
    city: 'רמלה', address: 'שדרות דוד רזיאל 1, עזריאלי רמלה',
    phone: '08-6580951', certified: 'כשר',
    hours: 'Su-Th 08:00-22:00; Fr 08:00-15:00; Sa 20:15-23:00',
    url: MISSING_URL,
  },
  {
    city: 'באר יעקב', address: 'שא נס 17, קניון באר יעקב',
    phone: '053-3788871', certified: 'כשר',
    hours: 'Su-Th 07:30-20:30; Fr 07:30-13:00',
    url: MISSING_URL,
  },
  {
    city: 'ראשון לציון', address: 'סחרוב 21, קניון הזהב, ראשון לציון',
    phone: '054-3333693', certified: 'כשר',
    hours: 'Su-Th 08:00-22:00; Fr 08:00-16:00',
    url: MISSING_URL,
  },
  {
    city: 'רחובות', address: 'ביל"ו 2, קניון רחובות',
    phone: '08-9494102', certified: 'כשר',
    hours: 'Su-Th 08:30-21:30; Fr 08:30-15:00; Sa 20:30-23:00',
    url: MISSING_URL,
  },
  {
    city: 'ראשון לציון', address: 'גולדה מאיר 1 פינת ההסתדרות 6, שער ראשון',
    phone: '03-9522613', certified: 'כשר',
    hours: 'Su-Th 07:30-19:30; Fr 07:30-14:00',
    url: MISSING_URL,
  },

  // ══ תל אביב ══════════════════════════════════════════════════════════════
  {
    city: 'תל אביב', address: 'הברזל 12, אסותא רמת החייל, תל אביב',
    phone: '03-6155435', certified: 'כשר למהדרין',
    hours: 'Su-Th 06:30-20:00; Fr 06:30-13:30',
    url: MISSING_URL,
  },
  {
    city: 'תל אביב', address: 'ג\'ורג\' וייז 20, תל אביב',
    phone: '03-5040603', certified: 'כשר',
    hours: 'Su-Th 06:30-20:00; Fr 06:30-13:00',
    url: MISSING_URL,
  },
  {
    city: 'תל אביב', address: 'ויצמן 14, ויצמן סיטי, תל אביב',
    phone: '050-5998090', certified: 'כשר',
    hours: 'Su-Th 06:30-21:00; Fr 06:30-14:00',
    url: MISSING_URL,
  },
  {
    city: 'תל אביב', address: 'החשמונאים 96, קניון TLV, תל אביב',
    phone: '03-7750775', certified: 'כשר',
    hours: 'Su-Th 08:00-21:30; Fr 08:00-15:30; Sa 20:30-23:00',
    url: MISSING_URL,
  },
  {
    city: 'תל אביב', address: 'שדרות שאול המלך 2, תל אביב',
    phone: null, certified: 'כשר',
    hours: 'Su-Th 07:00-21:00; Fr 07:00-14:30',
    url: MISSING_URL,
  },
  {
    city: 'תל אביב', address: 'יגאל אלון 94, מגדלי אלון, תל אביב',
    phone: '050-8424555', certified: 'כשר',
    hours: 'Su-Th 06:30-20:00; Fr 06:30-14:00',
    url: MISSING_URL,
  },
  {
    city: 'תל אביב', address: 'מנחם בגין 46, תל אביב',
    phone: '03-5099549', certified: 'כשר',
    hours: 'Su-Th 06:00-19:00; Fr 06:00-14:00',
    url: MISSING_URL,
  },
  {
    city: 'תל אביב', address: 'מנחם בגין 132, קניון עזריאלי, תל אביב',
    phone: '03-5040970', certified: 'כשר',
    hours: 'Su-Th 08:30-21:00; Fr 08:30-13:00',
    url: MISSING_URL,
  },
  {
    city: 'תל אביב', address: 'דבורה הנביאה 121, פארק עתידים, תל אביב',
    phone: null, certified: 'כשר',
    hours: 'Su-Th 06:30-18:00',
    url: MISSING_URL,
  },
  {
    city: 'תל אביב', address: 'הברזל 25, רמת החייל, תל אביב',
    phone: '03-6489432', certified: 'כשר',
    hours: 'Su-Th 06:30-18:00; Fr 07:00-14:00',
    url: MISSING_URL,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
const RPATH = 'src/data/generated/restaurants.osm.json';
const PPATH = 'src/data/generated/places.osm.json';
let rests  = readNoBom(RPATH);
let places = readNoBom(PPATH);

// מחיקת כל הסניפים הישנים של ארומה
const beforeR = rests.length;
rests  = rests.filter(e => e.name !== 'ארומה אספרסו בר');
places = places.filter(e => e.name !== 'ארומה אספרסו בר');
console.log(`🗑  נמחקו ${beforeR - rests.length} סניפי ארומה ישנים`);

function isDup(e, existing) {
  return existing.some(x => x.name === e.name && x.cityId === e.cityId && x.address === e.address);
}

const toAdd = BRANCHES.map(r => buildEntry(r)).filter(e => !isDup(e, rests));
writeWithBom(RPATH, [...rests, ...toAdd]);
writeWithBom(PPATH, [...places, ...toAdd]);

const missingUrl = toAdd.filter(e => e.website === 'https://www.aroma.co.il');
console.log(`✅ נוספו ${toAdd.length} סניפי ארומה אספרסו בר`);
console.log(`סה"כ restaurants: ${rests.length + toAdd.length}`);
console.log(`\n⚠️  URL חסר ל-${missingUrl.length} סניפים — יש להשלים מהאתר הרשמי:`);
missingUrl.forEach(e => console.log(`   • ${e.cityId} | ${e.address}`));
