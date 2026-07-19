/**
 * Bahadunes hummus kosher branches importer
 * Source: bahadunes.co.il + easy.co.il + rabanut sites — 2026-07-15
 * 14 branches (all kosher, 2 mehadrin)
 * Category: parve
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
    name: 'בהדונס כפר סבא אזור תעשייה',
    city: 'כפר סבא', address: 'התע"ש 20, כפר סבא',
    phone: '09-8858053', lat: 32.1780, lng: 34.9176, kosherType: 'rabanut',
  },
  {
    name: 'בהדונס רעננה',
    city: 'רעננה', address: 'העמל 2, רעננה',
    phone: '09-7442029', lat: 32.1878, lng: 34.8661, kosherType: 'rabanut',
  },
  {
    name: 'בהדונס כפר סבא צומת רעננה',
    city: 'כפר סבא', address: 'דרך השרון 5, כפר סבא',
    phone: '053-9442279', lat: 32.1720, lng: 34.9135, kosherType: 'rabanut',
  },
  {
    name: 'בהדונס הרצליה',
    city: 'הרצליה', address: 'המנופים 9, הרצליה',
    phone: '09-7684010', lat: 32.1655, lng: 34.8381, kosherType: 'rabanut',
  },
  {
    name: 'בהדונס רמת השרון',
    city: 'רמת השרון', address: 'סוקולוב 72, רמת השרון',
    phone: '03-5400791', lat: 32.1480, lng: 34.8425, kosherType: 'rabanut',
  },
  {
    name: 'בהדונס פתח תקווה',
    city: 'פתח תקווה', address: 'אודם 3, פתח תקווה',
    phone: '03-9192123', lat: 32.0884, lng: 34.8828, kosherType: 'rabanut',
  },
  {
    name: 'בהדונס רמת גן',
    city: 'רמת גן', address: 'ביאליק 138, רמת גן',
    phone: '03-7528074', lat: 32.0682, lng: 34.8245, kosherType: 'rabanut',
  },
  {
    name: 'בהדונס בני ברק',
    city: 'בני ברק', address: 'בר כוכבא 14, בני ברק',
    phone: '03-5795151', lat: 32.0835, lng: 34.8338, kosherType: 'rabanut',
  },
  {
    name: 'בהדונס קריית עקרון',
    city: 'קריית עקרון', address: 'המלך חסן השני 10, קריית עקרון',
    phone: '08-9491499', lat: 31.8683, lng: 34.8138, kosherType: 'rabanut',
  },
  {
    name: 'בהדונס בסיס קיריה תל אביב',
    city: 'תל אביב', address: 'הקיריה, תל אביב',
    lat: 32.0780, lng: 34.7881, kosherType: 'kosher',
    locationPrecision: 'city',
  },
  {
    name: 'בהדונס איירפורט סיטי',
    city: 'איירפורט סיטי', address: 'גולן 44, איירפורט סיטי',
    phone: '03-6356626', lat: 32.0083, lng: 34.8895, kosherType: 'mehadrin',
  },
  {
    name: 'בהדונס ראשון לציון',
    city: 'ראשון לציון', address: 'דוד סחרוב 17, ראשון לציון',
    phone: '077-5035012', lat: 31.9730, lng: 34.8075, kosherType: 'rabanut',
  },
  {
    name: 'בהדונס אבן גבירול תל אביב',
    city: 'תל אביב', address: 'אבן גבירול 109, תל אביב',
    phone: '03-9672224', lat: 32.0832, lng: 34.7810, kosherType: 'rabanut',
  },
  {
    name: 'בהדונס פארק המדע רחובות',
    city: 'רחובות', address: 'חיים פקריס 3, פארק המדע, רחובות',
    phone: '08-6640244', lat: 31.8928, lng: 34.8113, kosherType: 'mehadrin',
  },
];

function makeId(name) {
  return 'bahadunes-' + createHash('md5').update(name).digest('hex').slice(0, 8);
}

function buildPlace(b) {
  return {
    id: makeId(b.name),
    name: b.name,
    type: 'restaurant',
    cityId: b.city,
    address: b.address,
    ...(b.phone ? { phone: b.phone } : {}),
    location: { latitude: b.lat, longitude: b.lng },
    locationPrecision: b.locationPrecision ?? 'city',
    website: 'https://www.bahadunes.co.il',
    category: 'parve',
    kosherType: b.kosherType,
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

console.log('=== Bahadunes Import ===');
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
