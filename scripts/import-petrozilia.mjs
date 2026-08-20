import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

const DATA_PATH = 'src/data/generated/places.osm.json';

const DELETE_OSM = new Set(['osm-node-1989338503']);

function makeId(prefix, address) {
  return prefix + '-' + createHash('md5').update(address).digest('hex').slice(0, 8);
}

const ADDRESS = 'רחוב אלוף מגן קלמן 3, תל אביב';

const NEW_ENTRY = {
  id: makeId('petrozilia', ADDRESS),
  name: 'פיטרוזיליה',
  type: 'restaurant',
  category: 'meat',
  kosherType: 'rabanut_tel_aviv',
  address: ADDRESS,
  cityId: 'תל אביב',
  location: { latitude: 32.0853, longitude: 34.7818 },
  locationPrecision: 'city',
  phone: '03-5162468',
  openingHours: 'א׳-ו׳ עד 17:00',
  website: 'https://petrozilia.co.il',
  menu: 'https://petrozilia.co.il/תפריט/',
  facebook: 'https://www.facebook.com/petrozilya47/',
  source: 'manual',
  lastVerifiedAt: '2026-08-02',
};

const raw = readFileSync(DATA_PATH, 'utf8').replace(/^﻿/, '');
let data = JSON.parse(raw);

const before = data.length;
data = data.filter(p => !DELETE_OSM.has(p.id));
const deleted = before - data.length;

data.push(NEW_ENTRY);

writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
console.log(`נמחקו ${deleted} רשומות OSM`);
console.log(`נוסף: ${NEW_ENTRY.name} (${NEW_ENTRY.id})`);
console.log(`סה"כ: ${data.length} רשומות`);
