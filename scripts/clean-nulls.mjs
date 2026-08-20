import { readFileSync, writeFileSync } from 'fs';

const DATA_PATH = 'src/data/generated/places.osm.json';
const raw = readFileSync(DATA_PATH, 'utf8').replace(/^﻿/, '');
const data = JSON.parse(raw);

let nullsRemoved = 0;
const cleaned = data.map(p => {
  const out = {};
  for (const [k, v] of Object.entries(p)) {
    if (v !== null && v !== undefined) {
      out[k] = v;
    } else {
      nullsRemoved++;
    }
  }
  return out;
});

writeFileSync(DATA_PATH, JSON.stringify(cleaned, null, 2), 'utf8');
console.log('Null fields removed: ' + nullsRemoved);
console.log('Entries: ' + cleaned.length);