/**
 * Import kosher restaurant chains — batch 1 — 2026-07-23
 * Sources: easy.co.il, memphis.co.il, mifgashberlin.co.il, alohatlv.co.il,
 *          rabanut.co.il, badatz.biz, rest.co.il, ninihachi.com, tau77.co.il
 * 23 new records across 14 chains
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
  return {
    id: makeId(b.prefix, b.name),
    name: b.name,
    type: 'restaurant',
    cityId: b.city,
    address: b.address,
    phone: b.phone,
    location: { latitude: b.lat, longitude: b.lng },
    ...(b.website ? { website: b.website } : {}),
    openingHours: b.hours,
    category: b.category,
    kosherType: b.kosher,
    tags: b.tags,
    source: 'manual',
    lastVerifiedAt: '2026-07-23',
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

const PLACES = [
  // ─── ממפיס — בד"צ בית יוסף מהדרין ──────────────────────────────
  {
    prefix: 'memphis', name: 'ממפיס פתח תקווה',
    city: 'פתח תקווה', address: 'תוצרת הארץ 17, פתח תקווה',
    phone: '03-7723200', lat: 32.0883, lng: 34.8737,
    hours: "א'-ד' 12:00-23:00 | ה' 12:00-23:30 | ו' סגור | ש' מוצ\"ש",
    kosher: 'badatz_beit_yosef', category: 'meat',
    tags: ['burger'], website: 'https://memphis.co.il',
  },
  {
    prefix: 'memphis', name: 'ממפיס בני ברק',
    city: 'בני ברק', address: 'הירקון 10, בני ברק',
    phone: '*2904', lat: 32.0879, lng: 34.8338,
    hours: "א'-ה' 12:00-22:30 | ו' סגור | ש' סגור",
    kosher: 'badatz_beit_yosef', category: 'meat',
    tags: ['burger'], website: 'https://memphis.co.il',
  },

  // ─── מפגש ברלין — מהדרין ─────────────────────────────────────────
  {
    prefix: 'mifgash-berlin', name: "מפגש ברלין ז'בוטינסקי",
    city: 'רמת גן', address: "דרך זאב ז'בוטינסקי 61, רמת גן",
    phone: '077-5008966', lat: 32.0698, lng: 34.8144,
    hours: "א'-ה' 11:00-23:00 | ו' 11:00-17:00 | ש' סגור",
    kosher: 'mehadrin', category: 'meat',
    tags: ['burger'], website: 'https://mifgashberlin.co.il',
  },
  {
    prefix: 'mifgash-berlin', name: 'מפגש ברלין בורסה',
    city: 'רמת גן', address: 'תובל 16, רמת גן (מתחם הבורסה)',
    phone: '053-8093026', lat: 32.0706, lng: 34.8186,
    hours: "א'-ה' 11:00-04:00 | ו' 11:00-16:00 | ש' מוצ\"ש עד 04:00",
    kosher: 'mehadrin', category: 'meat',
    tags: ['burger'], website: 'https://mifgashberlin.co.il',
  },

  // ─── אלוהה — רבנות ───────────────────────────────────────────────
  {
    prefix: 'aloha', name: 'אלוהה שרונה',
    city: 'תל אביב', address: 'אלוף קלמן מגן 5, שרונה מרקט, תל אביב',
    phone: '051-240-0966', lat: 32.0670, lng: 34.7966,
    hours: "א'-ה' 10:30-22:00 | ו' 11:00-15:00 | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['burger'], website: 'https://alohatlv.co.il',
  },
  {
    prefix: 'aloha', name: 'אלוהה פתח תקווה BSR',
    city: 'פתח תקווה', address: 'יצחק רבין 4, ב.ס.ר סיטי, פתח תקווה',
    phone: '058-592-9984', lat: 32.0837, lng: 34.8740,
    hours: "א'-ה' 11:00-21:00 | ו' 11:00-15:30 | ש' סגור",
    kosher: 'rabanut', category: 'meat',
    tags: ['burger'], website: 'https://alohatlv.co.il',
  },

  // ─── בוטרא — מהדרין הרב מחפוד ───────────────────────────────────
  {
    prefix: 'butra', name: 'בוטרא אשדוד',
    city: 'אשדוד', address: 'אדר 4, רובע י"ב, אשדוד',
    phone: '08-9955284', lat: 31.7919, lng: 34.6464,
    hours: "א'-ה' 10:30-23:00 | ו' לבדוק מול המסעדה | ש' מוצ\"ש",
    kosher: 'mehadrin', category: 'meat',
    tags: ['shawarma'],
  },

  // ─── סמרקנד — מסעדה אוזבקית ─────────────────────────────────────
  {
    prefix: 'samarkand', name: 'סמרקנד תל אביב',
    city: 'תל אביב', address: 'בן צבי 34, תל אביב',
    phone: '03-6811122', lat: 32.0642, lng: 34.7848,
    hours: "א'-ה' 11:30-23:30 | ו' לבדוק מול המסעדה | ש' מוצ\"ש",
    kosher: 'rabanut', category: 'meat',
    tags: ['שף'],
  },

  // ─── פיצה X — חלבי, רבנות ────────────────────────────────────────
  {
    prefix: 'pizzax', name: 'פיצה X דיזינגוף',
    city: 'תל אביב', address: 'דיזינגוף 70, תל אביב',
    phone: '03-6218574', lat: 32.0784, lng: 34.7734,
    hours: "א'-ה' 12:00-02:00 | ו' 12:00-04:00 | ש' מוצ\"ש",
    kosher: 'rabanut', category: 'dairy',
    tags: ['pizza'], website: 'https://pizzax.co.il',
  },

  // ─── פיצה אנד טורטיה — חלבי, מהדרין ─────────────────────────────
  {
    prefix: 'pizzandtortilla', name: 'פיצה אנד טורטיה',
    city: 'תל אביב', address: 'אלנבי 79, תל אביב',
    phone: '072-3290637', lat: 32.0668, lng: 34.7740,
    hours: "א'-ה' 11:00-21:00 | ו' 11:00-14:30 | ש' סגור",
    kosher: 'mehadrin', category: 'dairy',
    tags: ['pizza'], website: 'https://pizzandtortilla.co.il',
  },

  // ─── Bread Cafe — חלבי, מהדרין ───────────────────────────────────
  {
    prefix: 'breadcafe', name: 'Bread Cafe רמת גן',
    city: 'רמת גן', address: 'תובל 19, רמת גן',
    phone: '050-480-0042', lat: 32.0706, lng: 34.8186,
    hours: "א'-ה' 07:00-18:00 | ו' סגור | ש' סגור",
    kosher: 'mehadrin', category: 'dairy',
    tags: ['קפה', 'סנדוויץ'], website: 'https://breadcafe.co.il',
  },
  {
    prefix: 'breadcafe', name: 'Bread Cafe בן גבירול תל אביב',
    city: 'תל אביב', address: 'בן גבירול 30, תל אביב',
    phone: '052-828-7990', lat: 32.0748, lng: 34.7823,
    hours: "א'-ה' 07:00-22:00 | ו' 07:00-15:00 | ש' סגור",
    kosher: 'mehadrin', category: 'dairy',
    tags: ['קפה', 'סנדוויץ'], website: 'https://breadcafe.co.il',
  },

  // ─── קפה לוגאנו — חלבי, מהדרין ──────────────────────────────────
  {
    prefix: 'cafe-lugano', name: 'קפה לוגאנו',
    city: 'רמת גן', address: 'החוגה 2, רמת גן',
    phone: '077-407-0604', lat: 32.0747, lng: 34.8221,
    hours: "א'-ה' 08:00-20:00 | ו' 08:00-14:00 | ש' סגור",
    kosher: 'mehadrin', category: 'dairy',
    tags: ['קפה'],
  },

  // ─── סו סושי — חלבי, רבנות ──────────────────────────────────────
  {
    prefix: 'so-sushi', name: 'סו סושי',
    city: 'תל אביב', address: 'אבן גבירול 54, תל אביב',
    phone: '072-3910811', lat: 32.0794, lng: 34.7831,
    hours: "א'-ה' 11:00-23:00 | ו' 11:00-14:00 | ש' מוצ\"ש",
    kosher: 'rabanut', category: 'dairy',
    tags: ['סושי'],
  },

  // ─── קנסאי — פרווה, רבנות ────────────────────────────────────────
  {
    prefix: 'kansai', name: 'קנסאי פתח תקווה',
    city: 'פתח תקווה', address: 'רפאל איתן 3, פתח תקווה',
    phone: null, lat: 32.0940, lng: 34.8876,
    hours: "א'-ה' 10:30-22:45 | ו' 10:30-14:30 | ש' מוצ\"ש",
    kosher: 'rabanut', category: 'parve',
    tags: ['סושי'],
  },

  // ─── סושי בזל — פרווה, רבנות ─────────────────────────────────────
  {
    prefix: 'sushi-bazel', name: 'סושי בזל תל אביב',
    city: 'תל אביב', address: 'בוגרשוב 33, תל אביב',
    phone: '077-9968444', lat: 32.0740, lng: 34.7706,
    hours: "א'-ה' 10:30-23:45 | ו' לבדוק מול המסעדה | ש' מוצ\"ש",
    kosher: 'rabanut', category: 'parve',
    tags: ['סושי'], website: 'https://sushibarbazel.co.il',
  },

  // ─── טאו 77 — פרווה, רבנות ───────────────────────────────────────
  {
    prefix: 'tau77', name: 'טאו 77',
    city: 'תל אביב', address: 'רוטשילד 15, תל אביב',
    phone: '03-7788997', lat: 32.0643, lng: 34.7730,
    hours: "א'-ד' 12:00-23:00 | ה' 12:00-00:00 | ו' 12:00-16:00 | ש' מוצ\"ש",
    kosher: 'rabanut', category: 'parve',
    tags: ['סושי', 'פאן-אסייתי'], website: 'https://tau77.co.il',
  },

  // ─── ניני — פרווה, רבנות ─────────────────────────────────────────
  {
    prefix: 'nini-hachi', name: "ניני האצ'י",
    city: 'תל אביב', address: 'בן יהודה 228, תל אביב',
    phone: '03-6249228', lat: 32.0968, lng: 34.7759,
    hours: "א'-ה' 12:00-23:30 | ו' עד 16:00 | ש' מוצ\"ש",
    kosher: 'rabanut', category: 'parve',
    tags: ['סושי', 'פאן-אסייתי'], website: 'https://ninihachi.com',
  },
  {
    prefix: 'nini-cho', name: "ניני צ'ו פתח תקווה",
    city: 'פתח תקווה', address: 'הסיבים 18, פתח תקווה',
    phone: '03-5183333', lat: 32.0908, lng: 34.8866,
    hours: "א'-ה' 12:00-23:00 | ו' 12:00-15:00 | ש' מוצ\"ש",
    kosher: 'rabanut', category: 'parve',
    tags: ['סושי', 'פאן-אסייתי'],
  },
  {
    prefix: 'nini-kai', name: 'ניני קאי אילת',
    city: 'אילת', address: 'אנטיב 5, אילת',
    phone: '08-6386698', lat: 29.5558, lng: 34.9520,
    hours: "א'-ה' 13:00-22:00 | ו' 13:00-16:00 | ש' מוצ\"ש",
    kosher: 'rabanut', category: 'parve',
    tags: ['סושי', 'פאן-אסייתי'],
  },

  // ─── סביח השרון — פרווה ──────────────────────────────────────────
  {
    prefix: 'sabiach-hasharon', name: 'סביח השרון רמת גן',
    city: 'רמת גן', address: 'תובל 34, רמת גן',
    phone: '050-424-8540', lat: 32.0703, lng: 34.8185,
    hours: "א'-ה' 08:00-23:00 | ו' עד 13:00 | ש' סגור",
    kosher: 'rabanut', category: 'parve',
    tags: ['סביח', 'falafel'],
  },
  {
    prefix: 'sabiach-hasharon', name: 'סביח השרון כפר סבא',
    city: 'כפר סבא', address: 'ויצמן 43, כפר סבא',
    phone: '050-6590590', lat: 32.1821, lng: 34.9082,
    hours: "א'-ה' 09:00-21:00 | ו' 09:00-15:00 | ש' סגור",
    kosher: 'badatz_beit_yosef', category: 'parve',
    tags: ['סביח', 'falafel'],
  },

  // ─── רק מרק — פרווה, מהדרין ──────────────────────────────────────
  {
    prefix: 'rak-marak', name: 'רק מרק רמת גן',
    city: 'רמת גן', address: 'ביאליק 76, רמת גן',
    phone: '054-837-1265', lat: 32.0845, lng: 34.8074,
    hours: "א'-ה' 10:00-23:00 | ו' 10:00-15:00 | ש' מוצ\"ש",
    kosher: 'mehadrin', category: 'parve',
    tags: ['מרק', 'בריאות'], website: 'https://rakmarak.co.il',
  },
];

console.log('=== Import Chains Batch 1 ===');
const places = PLACES.map(b => {
  const p = buildPlace(b);
  if (!b.phone) delete p.phone;
  return p;
});

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
