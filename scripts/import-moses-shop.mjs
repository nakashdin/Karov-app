/**
 * Moses Shop kosher branches importer
 * Source: moses-shop.com — scraped 2026-07-15
 * 15 kosher branches (excluding זכרון יעקב = ללא ציון כשר)
 * Category: meat | kosherType: kosher
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const BRANCHES = [
  {
    name: 'מוזס שופ תל אביב',
    city: 'תל אביב', address: 'דרך מנחם בגין 144, תל אביב',
    lat: 32.0791, lng: 34.7907,
    hours: "א'-ה' 11:00-23:00 | ו' 11:30-17:30 | ש' חצי שעה מצאת שבת עד 24:00",
  },
  {
    name: 'מוזס שופ בת ים',
    city: 'בת ים', address: 'אריק איינשטיין 3, בת ים',
    lat: 32.0173, lng: 34.7509,
    hours: "א'-ה' 11:30-23:30 | ו' סגור | ש' חצי שעה מצאת שבת עד 01:00",
  },
  {
    name: 'מוזס שופ חולון',
    city: 'חולון', address: 'פנחס איילון 13, חולון',
    lat: 32.0106, lng: 34.7707,
    hours: "א'-ה' 11:30-24:00 | ו' 11:30-15:00 | ש' חצי שעה מצאת שבת עד 24:00",
  },
  {
    name: 'מוזס שופ ראשון לציון',
    city: 'ראשון לציון', address: 'רבי יהודה הנשיא 1, ראשון לציון',
    lat: 31.9707, lng: 34.7898,
    hours: "א'-ג' 11:00-23:30 | ד'-ה' 11:00-24:00 | ו' 11:00-16:00 | ש' 20:00-24:00",
  },
  {
    name: 'מוזס שופ סביון',
    city: 'סביון', address: 'השקמה 1, סביון',
    lat: 32.0332, lng: 34.8816,
    hours: "א'-ה' 11:00-23:30 | ו' 11:00-17:30 | ש' חצי שעה מצאת שבת עד 01:00",
  },
  {
    name: 'מוזס שופ ראש העין',
    city: 'ראש העין', address: 'יגאל אלון 22, מרכז שפיר, ראש העין',
    lat: 32.0951, lng: 34.9600,
    hours: "א'-ה' 11:30-24:00 | ו' 11:30-16:00 | ש' חצי שעה מצאת שבת עד 24:00",
  },
  {
    name: 'מוזס שופ הוד השרון',
    city: 'הוד השרון', address: 'זבוטינסקי 3, הוד השרון',
    lat: 32.1512, lng: 34.8944,
    hours: "א'-ד' 11:00-23:00 | ה' 11:00-24:00 | ו' 11:00-17:00 | ש' מצאת שבת עד 24:00",
  },
  {
    name: 'מוזס שופ רעננה',
    city: 'רעננה', address: 'סשה ארגוב 23, רעננה',
    lat: 32.1877, lng: 34.8706,
    hours: "א'-ה' 11:00-24:30 | ו' 11:00-15:00 | ש' חצי שעה מצאת שבת עד 24:30",
  },
  {
    name: 'מוזס שופ הרצליה',
    city: 'הרצליה', address: 'אריק איינשטיין 1, הרצליה',
    lat: 32.1655, lng: 34.8386,
    hours: "א'-ג' 11:00-01:00 | ד'-ה' 11:00-02:00 | ו' 11:00-15:00 | ש' שעה מצאת שבת עד 02:00",
  },
  {
    name: 'מוזס שופ צורן',
    city: 'צורן', address: 'שדרות יצחק רבין 38, מרכז רוטשטיין, צורן',
    lat: 32.2153, lng: 34.9247,
    hours: "א'-ג' 11:30-23:00 | ד'-ה' 11:30-23:30 | ו' 11:00-16:00 | ש' חצי שעה מצאת שבת עד 01:00",
  },
  {
    name: 'מוזס שופ חדרה',
    city: 'חדרה', address: 'גמלא 3, סנטר פארק, חדרה',
    lat: 32.4419, lng: 34.9174,
    hours: "א'-ה' 11:30-01:00 | ו' 11:30-16:00 | ש' שעה מצאת שבת עד 01:00",
  },
  {
    name: 'מוזס שופ קריית אתא',
    city: 'קריית אתא', address: 'דרך חיפה 32, קניון שער הצפון, קריית אתא',
    lat: 32.8114, lng: 35.1077,
    hours: "א'-ה' 11:00-22:30 | ו' 11:00-14:30 | ש' חצי שעה מצאת שבת עד 22:30",
  },
  {
    name: 'מוזס שופ אשדוד',
    city: 'אשדוד', address: 'מנגו 4, אשדוד',
    lat: 31.8067, lng: 34.6579,
    hours: "א'-ד' 11:00-23:00 | ה' 11:00-23:30 | ו' 11:00-14:30 | ש' חצי שעה מצאת שבת עד 24:30",
  },
  {
    name: 'מוזס שופ דימונה',
    city: 'דימונה', address: 'פרץ סנטר 1, דימונה',
    lat: 31.0699, lng: 35.0327,
    hours: "א'-ד' 11:00-23:30 | ה' 11:00-24:00 | ו' 11:00-15:00 | ש' מצאת שבת עד 24:00",
  },
  {
    name: 'מוזס שופ באר שבע',
    city: 'באר שבע', address: 'ראובן רובין 1, באר שבע',
    lat: 31.2415, lng: 34.8038,
    hours: "א'-ד' 11:00-00:00 | ה' 11:00-01:00 | ו' 11:00-16:00 | ש' חצי שעה מצאת שבת עד 01:00",
  },
];

function makeId(name) {
  return 'mosesshop-' + createHash('md5').update(name).digest('hex').slice(0, 8);
}

function buildPlace(b) {
  return {
    id: makeId(b.name),
    name: b.name,
    type: 'restaurant',
    cityId: b.city,
    address: b.address,
    location: { latitude: b.lat, longitude: b.lng },
    website: 'https://moses-shop.com',
    openingHours: b.hours,
    category: 'meat',
    kosherType: 'kosher',
    source: 'manual',
    lastVerifiedAt: '2026-07-15',
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

console.log('=== Moses Shop Import ===');
const places = BRANCHES.map(buildPlace);
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
