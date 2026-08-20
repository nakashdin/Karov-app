import { readFileSync, writeFileSync } from 'fs';

const DATA_PATH = 'src/data/generated/places.osm.json';

const HOURS_UPDATE = {
  'jer-bigapple-paran9-jlm': 'א-ה 10:00-23:00, ו 10:00-14:00, מוצ"ש עד 01:00',
  'jer-pizza-rimini-jlm':    'א-ה 08:00-22:00, ו 08:00-15:00, מוצ"ש עד 23:00',
  'jer-shabbos-bistro-jlm':  'א 08:00-12:00, ה 12:00-02:00, ו 08:00-16:00, ב-ד סגור',
};

// compute actual IDs
import { createHash } from 'crypto';
function makeId(prefix, key) {
  return prefix + '-' + createHash('md5').update(key).digest('hex').slice(0, 8);
}

const ID_MAP = {
  [makeId('jer', 'bigapple-paran9-jlm')]: HOURS_UPDATE['jer-bigapple-paran9-jlm'],
  [makeId('jer', 'pizza-rimini-jlm')]:    HOURS_UPDATE['jer-pizza-rimini-jlm'],
  [makeId('jer', 'shabbos-bistro-jlm')]:  HOURS_UPDATE['jer-shabbos-bistro-jlm'],
};

const raw = readFileSync(DATA_PATH, 'utf8').replace(/^﻿/, '');
const data = JSON.parse(raw);

let updated = 0;
const result = data.map(p => {
  if (ID_MAP[p.id]) {
    updated++;
    return { ...p, openingHours: ID_MAP[p.id] };
  }
  return p;
});

writeFileSync(DATA_PATH, JSON.stringify(result, null, 2), 'utf8');
console.log('Updated: ' + updated);