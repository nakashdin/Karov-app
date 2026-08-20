/**
 * Import kosher meat/shawarma chains — 2026-07-19
 * Chains: עבדאלה, שיפודי חן, צחי בשרים, דבוש, שיפודי ציפורה, שמעוני
 * Category: meat
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const CHAINS = [

  // ─── עבדאלה גריל ───────────────────────────────────────────────
  {
    id_prefix: 'abdalla',
    name: 'עבדאלה גריל בשרים כשר',
    city: 'אור יהודה', address: 'המפעל 17, אור יהודה',
    phone: '03-5336622', lat: 32.0333, lng: 34.8563,
    hours: "א'-ה' 12:00-00:00 | ו' סגור | ש' מוצ\"ש עד 00:00",
    kosherType: 'rabanut',
    website: 'https://abdalla.co.il',
  },

  // ─── שיפודי חן ──────────────────────────────────────────────────
  {
    id_prefix: 'shipudichen',
    name: 'שיפודי חן גבעתיים',
    city: 'גבעתיים', address: 'דרך השלום 53, גבעתיים',
    phone: '03-6717141', lat: 32.0713, lng: 34.8132,
    hours: "א'-ה' 11:00-00:00 | ו' סגור | ש' מוצ\"ש עד 00:00",
    kosherType: 'rabanut',
    website: 'https://shipudei-chen.co.il',
  },
  {
    id_prefix: 'shipudichen',
    name: 'שיפודי חן פתח תקווה',
    city: 'פתח תקווה', address: 'מוטה גור 7, פתח תקווה',
    phone: '03-9591122', lat: 32.0836, lng: 34.8878,
    hours: "א'-ה' 11:00-22:00 | ו' סגור | ש' מוצ\"ש עד 22:00",
    kosherType: 'rabanut',
    website: 'https://shipudei-chen.co.il',
  },

  // ─── צחי בשרים ──────────────────────────────────────────────────
  {
    id_prefix: 'tzahibsarim',
    name: 'צחי בשרים תל אביב',
    city: 'תל אביב', address: 'דרך קיבוץ גלויות 106, תל אביב',
    phone: '*2006', lat: 32.0461, lng: 34.7675,
    hours: "א'-ה' 11:00-23:00 | ו' סגור | ש' מוצ\"ש עד 00:00",
    kosherType: 'badatz_beit_yosef',
    website: 'https://tzahib.co.il',
  },
  {
    id_prefix: 'tzahibsarim',
    name: 'צחי בשרים בת ים',
    city: 'בת ים', address: 'הרצל 82, בת ים',
    phone: '*2006', lat: 32.0143, lng: 34.7517,
    hours: "א'-ה' 10:00-23:00 | ו' סגור | ש' מוצ\"ש עד 00:00",
    kosherType: 'badatz_beit_yosef',
    website: 'https://tzahib.co.il',
  },

  // ─── דבוש שווארמה ───────────────────────────────────────────────
  {
    id_prefix: 'dabush',
    name: 'דבוש שווארמה בני ברק',
    city: 'בני ברק', address: 'בן גוריון 1, מגדל BSR 2, בני ברק',
    phone: '03-6912175', lat: 32.0800, lng: 34.8347,
    hours: "א'-ה' 11:00-18:00 | ו' סגור | ש' סגור",
    kosherType: 'mehadrin',
    website: 'https://www.dabush.co.il',
  },
  {
    id_prefix: 'dabush',
    name: 'דבוש שווארמה קרליבך תל אביב',
    city: 'תל אביב', address: 'קרליבך 1, תל אביב',
    phone: '052-7961919', lat: 32.0701, lng: 34.7927,
    hours: "א'-ה' 11:00-22:00 | ו' סגור | ש' מוצ\"ש עד 22:00",
    kosherType: 'rabanut',
    website: 'https://www.dabush.co.il',
  },
  {
    id_prefix: 'dabush',
    name: 'דבוש שווארמה אבן גבירול תל אביב',
    city: 'תל אביב', address: 'אבן גבירול 64, תל אביב',
    phone: '03-6912175', lat: 32.0813, lng: 34.7810,
    hours: "א'-ה' 11:00-02:00 | ו' סגור | ש' מוצ\"ש עד 02:00",
    kosherType: 'rabanut',
    website: 'https://www.dabush.co.il',
  },
  {
    id_prefix: 'dabush',
    name: 'דבוש שווארמה פתח תקווה',
    city: 'פתח תקווה', address: 'דרך יצחק רבין 2, פתח תקווה',
    phone: '052-7961919', lat: 32.0843, lng: 34.8823,
    hours: "א'-ה' 11:00-22:00 | ו' סגור | ש' מוצ\"ש עד 22:00",
    kosherType: 'rabanut',
    website: 'https://www.dabush.co.il',
  },
  {
    id_prefix: 'dabush',
    name: 'דבוש שווארמה נתניה',
    city: 'נתניה', address: 'הרכבת 7, נתניה',
    phone: '03-6912175', lat: 32.3285, lng: 34.8568,
    hours: "א'-ה' 11:00-00:00 | ו' סגור | ש' מוצ\"ש עד 00:00",
    kosherType: 'rabanut',
    website: 'https://www.dabush.co.il',
  },
  {
    id_prefix: 'dabush',
    name: 'דבוש שווארמה חולון',
    city: 'חולון', address: 'דרך השבעה 20, חולון',
    phone: '052-7961919', lat: 32.0083, lng: 34.7790,
    hours: "א'-ה' 11:00-00:00 | ו' סגור | ש' מוצ\"ש עד 22:00",
    kosherType: 'rabanut',
    website: 'https://www.dabush.co.il',
  },

  // ─── שיפודי ציפורה ───────────────────────────────────────────────
  {
    id_prefix: 'tziposhipud',
    name: 'שיפודי ציפורה בת ים',
    city: 'בת ים', address: 'הרב בר שאול 5, בת ים',
    phone: '03-6591432', lat: 32.0204, lng: 34.7512,
    hours: "א'-ה' 11:00-00:00 | ו' סגור | ש' מוצ\"ש עד 00:00",
    kosherType: 'badatz_beit_yosef',
    website: 'https://tsiporagroup.co.il',
  },
  {
    id_prefix: 'tziposhipud',
    name: 'שיפודי ציפורה תל אביב',
    city: 'תל אביב', address: 'אבא אחימאיר 29, מרכז אלרם, תל אביב',
    phone: '03-9477769', lat: 32.0940, lng: 34.7805,
    hours: "א'-ה' 12:00-23:00 | ו' סגור | ש' מוצ\"ש עד 00:00",
    kosherType: 'rabanut',
    website: 'https://tsiporagroup.co.il',
  },
  {
    id_prefix: 'tziposhipud',
    name: 'שיפודי ציפורה ראשון לציון',
    city: 'ראשון לציון', address: 'דוד סחרוב 26, ראשון לציון',
    phone: '077-9976469', lat: 31.9730, lng: 34.8034,
    hours: "א'-ה' 11:00-00:00 | ו' סגור | ש' מוצ\"ש עד 00:00",
    kosherType: 'rabanut',
    website: 'https://tsiporagroup.co.il',
  },
  {
    id_prefix: 'tziposhipud',
    name: 'שיפודי ציפורה פתח תקווה',
    city: 'פתח תקווה', address: 'לשם 10, מרכז יאקין, פתח תקווה',
    phone: '077-8037123', lat: 32.0878, lng: 34.8872,
    hours: "א'-ה' 11:00-23:30 | ו' 11:00-14:30 | ש' מוצ\"ש עד 23:30",
    kosherType: 'rabanut',
    website: 'https://tsiporagroup.co.il',
  },

  // ─── שווארמה שמעוני ──────────────────────────────────────────────
  {
    id_prefix: 'shimoni',
    name: 'שווארמה שמעוני תל אביב',
    city: 'תל אביב', address: 'איינשטיין 7, רמת אביב, תל אביב',
    phone: '052-6895078', lat: 32.1138, lng: 34.8083,
    hours: "א'-ה' 10:00-01:00 | ו' 10:00-15:30 | ש' מוצ\"ש עד 01:00",
    kosherType: 'rabanut',
    website: 'https://www.instagram.com/shawarma.shimoni',
  },
];

function makeId(prefix, name) {
  return prefix + '-' + createHash('md5').update(name).digest('hex').slice(0, 8);
}

function buildPlace(b) {
  return {
    id: makeId(b.id_prefix, b.name),
    name: b.name,
    type: 'restaurant',
    cityId: b.city,
    address: b.address,
    phone: b.phone,
    location: { latitude: b.lat, longitude: b.lng },
    website: b.website,
    openingHours: b.hours,
    category: 'meat',
    kosherType: b.kosherType,
    source: 'manual',
    lastVerifiedAt: '2026-07-19',
  };
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

console.log('=== Import Meat Chains ===');
const places = CHAINS.map(buildPlace);
console.log(`Building ${places.length} records`);

for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  const data = readJson(filePath);
  const { merged, added, skipped } = mergeInto(data, places);
  writeJson(filePath, merged);
  console.log(`${path.basename(filePath)}: +${added} added, ${skipped} skipped`);
}
console.log('\nDone!');
