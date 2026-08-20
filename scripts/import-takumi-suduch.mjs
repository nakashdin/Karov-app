/**
 * Import: טקומי שוהם + סודוך 19 סניפים — 2026-07-23
 * Sources: takumi.co.il, suduch.co.il, rabanut.co.il, mdrl.org.il
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
function buildPlace(b) {
  const p = {
    id: makeId(b.prefix, b.name),
    name: b.name,
    type: b.type ?? 'restaurant',
    cityId: b.city,
    address: b.address,
    location: { latitude: b.lat, longitude: b.lng },
    openingHours: b.hours,
    category: b.category,
    kosherType: b.kosher,
    tags: b.tags,
    source: 'manual',
    lastVerifiedAt: '2026-07-23',
  };
  if (b.phone)     p.phone    = b.phone;
  if (b.website)   p.website  = b.website;
  if (b.menu)      p.menu     = b.menu;
  if (b.instagram) p.instagram = b.instagram;
  return p;
}
function readJson(p) {
  const raw = readFileSync(p);
  const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
  return JSON.parse(str);
}
function writeJson(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}
function mergeInto(existing, newRecords) {
  const existingIds = new Set(existing.map(r => r.id));
  const toAdd = newRecords.filter(r => !existingIds.has(r.id));
  return { merged: [...existing, ...toAdd], added: toAdd.length, skipped: newRecords.length - toAdd.length };
}

const PLACES = [
  // ─── טקומי שוהם — פרווה, רבנות ───────────────────────────────────
  {
    prefix: 'takumi', name: 'טקומי שוהם',
    type: 'restaurant',
    city: 'שוהם', address: 'הדקל 30, שוהם מרקט, שוהם',
    phone: '*3870', lat: 31.9987, lng: 34.9446,
    hours: "א'-ה' 11:30-22:00 | ו' 11:30-14:00 | ש' 20:45-23:00",
    kosher: 'rabanut', category: 'parve',
    tags: ['סושי', 'פאן-אסייתי'],
    website: 'https://www.takumi.co.il',
    menu: 'https://www.takumi.co.il/menu/',
    instagram: 'takumi_street_food',
  },

  // ─── סודוך — בשרי, רבנות, מזון מהיר ─────────────────────────────
  {
    prefix: 'suduch', name: 'סודוך כפר סבא',
    type: 'fast_food',
    city: 'כפר סבא', address: 'התע"ש 18, כפר סבא',
    phone: '03-6096638', lat: 32.1763, lng: 34.9056,
    hours: "א'-ד' 09:00-03:00 | ה' 09:00-04:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך תל אביב אפקה',
    type: 'fast_food',
    city: 'תל אביב', address: 'פנחס רוזן 19, אפקה, תל אביב',
    phone: '03-6096638', lat: 32.1094, lng: 34.8009,
    hours: "א'-ד' 09:00-03:00 | ה' 09:00-04:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך פתח תקווה שופ טיים',
    type: 'fast_food',
    city: 'פתח תקווה', address: 'תוצרת הארץ 3, שופ טיים, פתח תקווה',
    phone: '03-6096638', lat: 32.0917, lng: 34.8723,
    hours: "א'-ד' 09:00-04:00 | ה' 09:00-05:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך הרצליה',
    type: 'fast_food',
    city: 'הרצליה', address: 'אבא אבן 3, הרצליה',
    phone: '03-6096638', lat: 32.1668, lng: 34.8376,
    hours: "א'-ד' 09:00-04:00 | ה' 09:00-05:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך תל אביב המסגר',
    type: 'fast_food',
    city: 'תל אביב', address: 'המסגר 64, תל אביב',
    phone: '03-6096638', lat: 32.0654, lng: 34.7808,
    hours: "א'-ד' 09:00-04:00 | ה' 09:00-05:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: "סודוך תל אביב איינשטיין",
    type: 'fast_food',
    city: 'תל אביב', address: 'איינשטיין 9, תל אביב',
    phone: '03-6096638', lat: 32.1043, lng: 34.8042,
    hours: "א'-ה' 09:00-02:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך תל אביב קרליבך',
    type: 'fast_food',
    city: 'תל אביב', address: 'קרליבך 20, תל אביב',
    phone: '03-6096638', lat: 32.0789, lng: 34.7843,
    hours: "א'-ד' 09:00-04:00 | ה' 09:00-05:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: "קריית אונו סודוך",
    type: 'fast_food',
    city: 'קריית אונו', address: 'יעקב דורי 7, קריית אונו',
    phone: '03-6096638', lat: 32.0606, lng: 34.8651,
    hours: "א'-ד' 09:00-04:00 | ה' 09:00-05:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך תל אביב הירקון',
    type: 'fast_food',
    city: 'תל אביב', address: 'הירקון 121, תל אביב',
    phone: '077-2195219', lat: 32.0891, lng: 34.7710,
    hours: "לפי תנאי מזג האוויר",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך גבעתיים',
    type: 'fast_food',
    city: 'גבעתיים', address: 'דרך השלום 51, גבעתיים',
    phone: '03-6096638', lat: 32.0699, lng: 34.8078,
    hours: "א'-ד' 09:00-04:00 | ה' 09:00-05:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך חולון',
    type: 'fast_food',
    city: 'חולון', address: 'סוקולוב 60, חולון',
    phone: '03-6096638', lat: 32.0186, lng: 34.7656,
    hours: "א'-ד' 09:00-04:00 | ה' 09:00-05:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך פתח תקווה חיים עוזר',
    type: 'fast_food',
    city: 'פתח תקווה', address: 'חיים עוזר 15, פתח תקווה',
    phone: '03-6096638', lat: 32.0800, lng: 34.8805,
    hours: "א'-ד' 09:00-04:00 | ה' 09:00-05:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך חיפה',
    type: 'fast_food',
    city: 'חיפה', address: "שד' הנשיא 133, חיפה",
    phone: '03-6096638', lat: 32.8182, lng: 34.9926,
    hours: "א'-ה' 09:00-04:30 | ו' לבדוק מול המסעדה | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך ראשון לציון מערב',
    type: 'fast_food',
    city: 'ראשון לציון', address: 'משה לוי 14, ראשון לציון',
    phone: '077-5308200', lat: 31.9680, lng: 34.8022,
    hours: "א'-ה' 08:00-06:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך הוד השרון',
    type: 'fast_food',
    city: 'הוד השרון', address: 'דרך רמתיים 63, הוד השרון',
    phone: '03-6096638', lat: 32.1457, lng: 34.8952,
    hours: "א'-ד' 09:00-04:00 | ה' 09:00-05:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך ראשון לציון מזרח',
    type: 'fast_food',
    city: 'ראשון לציון', address: 'המכבים 22, ראשון לציון',
    phone: '03-6096638', lat: 31.9814, lng: 34.8294,
    hours: "א'-ד' 09:00-04:00 | ה' 09:00-05:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך נתניה',
    type: 'fast_food',
    city: 'נתניה', address: 'גיבורי ישראל 5, נתניה',
    phone: '03-6096638', lat: 32.3312, lng: 34.8598,
    hours: "א'-ד' 09:00-04:00 | ה' 09:00-05:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך אור יהודה',
    type: 'fast_food',
    city: 'אור יהודה', address: 'יהדות קנדה 12, אור יהודה',
    phone: '03-6096638', lat: 32.0270, lng: 34.8598,
    hours: "א'-ד' 09:00-03:00 | ה' 09:00-04:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
  {
    prefix: 'suduch', name: 'סודוך ראש העין',
    type: 'fast_food',
    city: 'ראש העין', address: 'הרב שלום שבזי 58, ראש העין',
    phone: '03-6096638', lat: 32.0956, lng: 34.9574,
    hours: "א'-ד' 09:00-04:00 | ה' 09:00-05:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['טוסט', 'נקניק', 'מזון מהיר'],
    website: 'https://suduch.co.il',
  },
];

console.log('=== Import Takumi + Suduch ===');
const places = PLACES.map(buildPlace);

for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  const data = readJson(filePath);
  const { merged, added, skipped } = mergeInto(data, places);
  writeJson(filePath, merged);
  console.log(`${path.basename(filePath)}: +${added} added, ${skipped} skipped`);
}
console.log('Done!');
