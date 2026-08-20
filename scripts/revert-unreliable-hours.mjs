import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

const DATA_PATH = 'src/data/generated/places.osm.json';

function makeId(prefix, key) {
  return prefix + '-' + createHash('md5').update(key).digest('hex').slice(0, 8);
}

const REVERT_TO_NULL = new Set([
  makeId('jer', 'pizza-rimini-jlm'),
  makeId('jer', 'shabbos-bistro-jlm'),
]);

const raw = readFileSync(DATA_PATH, 'utf8').replace(/^﻿/, '');
const data = JSON.parse(raw);

let reverted = 0;
const result = data.map(p => {
  if (REVERT_TO_NULL.has(p.id)) {
    reverted++;
    const { openingHours, ...rest } = p;
    return rest;
  }
  return p;
});

writeFileSync(DATA_PATH, JSON.stringify(result, null, 2), 'utf8');
console.log('Reverted: ' + reverted);