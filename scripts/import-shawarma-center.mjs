/**
 * Import kosher shawarma places — מרכז הארץ — 2026-07-20
 * Sources: rabanut.co.il, ydat.org.il, easy.co.il, badatz.biz
 * All records: kashrut verified + complete hours
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const PLACES = [

  // ─── תל אביב יפו ────────────────────────────────────────────────
  {
    id_prefix: 'mifgashbracha',
    name: 'מפגש הברכה תל אביב',
    city: 'תל אביב', address: 'הרצל 98, פלורנטין, תל אביב',
    phone: '052-4883183', lat: 32.0598, lng: 34.7737,
    hours: "א'-ה' 07:30-19:30 | ו' 09:00-13:00 | ש' סגור",
    kosherType: 'rabanut', website: null,
    kashrut_source: 'rabanut.co.il ✓',
  },
  {
    id_prefix: 'shawarmacarmel',
    name: 'שווארמה הכרמל תל אביב',
    city: 'תל אביב', address: 'דניאל 25, שוק הכרמל, תל אביב',
    phone: '053-4919771', lat: 32.0652, lng: 34.7726,
    hours: "א'-ה' 07:30-19:30 | ו' 09:00-13:00 | ש' סגור",
    kosherType: 'rabanut', website: 'https://www.instagram.com/shawarma_carmel',
    kashrut_source: 'rabanut.co.il ✓',
  },
  {
    id_prefix: 'pundakherzel',
    name: 'פונדק הרצל תל אביב',
    city: 'תל אביב', address: 'שדרות ירושלים 67, תל אביב יפו',
    phone: '03-6827842', lat: 32.0531, lng: 34.7564,
    hours: "א'-ה' 10:00-20:30 | ו' 10:00-15:30 | ש' סגור",
    kosherType: 'rabanut', website: 'https://pundak-herzel.co.il',
    kashrut_source: 'rabanut.co.il ✓',
  },
  {
    id_prefix: 'mifgashfalafel',
    name: 'מפגש הפלאפל והשווארמה תל אביב',
    city: 'תל אביב', address: 'אצ"ל 38, תל אביב',
    phone: '054-2227772', lat: 32.0522, lng: 34.7675,
    hours: "א'-ה' 08:00-00:00 | ו' 08:00-16:00 | ש' סגור",
    kosherType: 'rabanut', website: null,
    kashrut_source: 'rabanut.co.il ✓',
  },
  {
    id_prefix: 'pinatshawarma',
    name: 'פינת השווארמה תל אביב',
    city: 'תל אביב', address: 'אצ"ל 2, תל אביב',
    phone: '03-7485459', lat: 32.0608, lng: 34.7790,
    hours: "א'-ה' 11:00-23:00 | ו' 11:00-כניסת שבת | ש' סגור",
    kosherType: 'badatz_beit_yosef', website: 'https://pinathshawarma.co.il',
    kashrut_source: 'badatz.biz ✓',
  },

  // ─── גבעתיים ─────────────────────────────────────────────────────
  {
    id_prefix: 'etzelmali',
    name: 'אצל מלי גבעתיים',
    city: 'גבעתיים', address: 'הרב הרצוג 27, גבעתיים',
    phone: '03-5714006', lat: 32.0718, lng: 34.8118,
    hours: "א'-ה' 09:00-20:30 | ו' 09:00-15:00 | ש' סגור",
    kosherType: 'rabanut', website: 'https://www.instagram.com/etselmali',
    kashrut_source: 'easy.co.il + רבנות גבעתיים ✓',
  },

  // ─── רמת גן ──────────────────────────────────────────────────────
  {
    id_prefix: 'hasultan',
    name: 'הסולטן שווארמה רמת גן',
    city: 'רמת גן', address: 'הירדן 94, רמת גן',
    phone: '03-6763422', lat: 32.0830, lng: 34.8185,
    hours: "א'-ה' 10:00-22:30 | ו' 10:30-15:00 | ש' סגור",
    kosherType: 'mehadrin', website: 'https://hasultan.co.il',
    kashrut_source: 'hasultan.co.il ✓',
  },

  // ─── אור יהודה ───────────────────────────────────────────────────
  {
    id_prefix: 'tzahigrill',
    name: 'צחי גריל אור יהודה',
    city: 'אור יהודה', address: 'העבודה 8, אור יהודה',
    phone: '054-2553305', lat: 32.0322, lng: 34.8568,
    hours: "א'-ה' 10:30-22:00 | ו' סגור | ש' סגור",
    kosherType: 'rabanut', website: null,
    kashrut_source: 'easy.co.il — רבנות מקומית ✓',
  },

  // ─── קריית אונו ──────────────────────────────────────────────────
  {
    id_prefix: 'alonishawarma',
    name: 'אלוני קריית אונו',
    city: 'קריית אונו', address: 'שלמה המלך 37, מרכז מסחרי קיראון, קריית אונו',
    phone: '03-6354385', lat: 32.0612, lng: 34.8668,
    hours: "א'-ה' 07:30-19:30 | ו' 09:00-13:00 | ש' סגור",
    kosherType: 'rabanut', website: null,
    kashrut_source: 'easy.co.il — רבנות קריית אונו ✓',
  },

  // ─── יהוד מונסון ─────────────────────────────────────────────────
  {
    id_prefix: 'etzaladri',
    name: 'אצל אדרי יהוד',
    city: 'יהוד מונסון', address: 'וייצמן 44, יהוד מונסון',
    phone: '03-6984858', lat: 32.0315, lng: 34.8798,
    hours: "א'-ה' 09:00-20:00 | ו' סגור | ש' סגור",
    kosherType: 'rabanut', website: null,
    kashrut_source: 'ydat.org.il — מועצה דתית יהוד ✓',
  },
  {
    id_prefix: 'hapinalevana',
    name: 'הפינה הלבנה יהוד',
    city: 'יהוד מונסון', address: 'הרצל 7, יהוד מונסון',
    phone: '03-5360937', lat: 32.0330, lng: 34.8786,
    hours: "א'-ה' 08:30-21:00 | ו' 08:30-15:00 | ש' סגור",
    kosherType: 'rabanut', website: null,
    kashrut_source: 'ydat.org.il — מועצה דתית יהוד ✓',
  },

  // ─── גני תקווה ───────────────────────────────────────────────────
  {
    id_prefix: 'palpaliko',
    name: 'פלפליקו גני תקווה',
    city: 'גני תקווה', address: 'הרמה 23, גני תקווה',
    phone: '03-5352341', lat: 32.0565, lng: 34.8750,
    hours: "א'-ה' 08:00-01:00 | ו' 08:00-כניסת שבת | ש' סגור",
    kosherType: 'mehadrin', website: null,
    kashrut_source: 'easy.co.il + 2eat.co.il — מהדרין ✓',
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
    ...(b.website ? { website: b.website } : {}),
    openingHours: b.hours,
    category: 'meat',
    kosherType: b.kosherType,
    source: 'manual',
    lastVerifiedAt: '2026-07-20',
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

console.log('=== Import Shawarma Center ===');
const places = PLACES.map(buildPlace);
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
