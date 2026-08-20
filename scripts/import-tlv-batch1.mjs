import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

const DATA_PATH = 'src/data/generated/places.osm.json';

function makeId(prefix, address) {
  return prefix + '-' + createHash('md5').update(address).digest('hex').slice(0, 8);
}

const DELETE_OSM = new Set([
  'osm-node-2078990448', // Bodega
  'osm-node-2079006787', // מלכה
]);

const TLV = { latitude: 32.0853, longitude: 34.7818 };

const NEW_ENTRIES = [
  {
    id: makeId('bodega', 'רחוב קרליבך 14, תל אביב'),
    name: 'בודגה מטבח אמריקאי',
    type: 'restaurant',
    category: 'meat',
    kosherType: 'kosher',
    address: 'רחוב קרליבך 14, תל אביב',
    cityId: 'תל אביב',
    location: TLV,
    locationPrecision: 'city',
    openingHours: 'א׳-ד׳ 11:30-23:30 | ה׳ 11:30-00:30',
    website: 'https://tabitisrael.co.il/tabit-order?siteName=bodega&step=menu',
    menu: 'https://tabitisrael.co.il/tabit-order?siteName=bodega&step=menu',
    instagram: 'https://www.instagram.com/getbodega/',
    source: 'manual',
    lastVerifiedAt: '2026-08-02',
  },
  {
    id: makeId('malka', 'מנחם בגין 146, תל אביב יפו'),
    name: 'מלכה',
    type: 'restaurant',
    category: 'meat',
    kosherType: 'kosher',
    description: 'מסעדת שף של אייל שני',
    address: 'מנחם בגין 146, תל אביב יפו',
    cityId: 'תל אביב',
    location: TLV,
    locationPrecision: 'city',
    phone: '03-6091331',
    openingHours: 'א׳-ה׳ 12:00-16:00, 18:00-23:00 | ש׳ סגור',
    website: 'https://malkarest.com',
    menu: 'https://malkarest.com/menu/',
    instagram: 'https://www.instagram.com/malka.tlv/',
    facebook: 'https://www.facebook.com/malkatelaviv',
    source: 'manual',
    lastVerifiedAt: '2026-08-02',
  },
];

const raw = readFileSync(DATA_PATH, 'utf8').replace(/^﻿/, '');
let data = JSON.parse(raw);

const before = data.length;
data = data.filter(p => !DELETE_OSM.has(p.id));
const deleted = before - data.length;

data.push(...NEW_ENTRIES);

writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
console.log(`נמחקו ${deleted} רשומות OSM`);
NEW_ENTRIES.forEach(e => console.log(`נוסף: ${e.name} (${e.id})`));
console.log(`סה"כ: ${data.length} רשומות`);
