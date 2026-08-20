import { readFileSync } from 'fs';

const DATA_PATH = 'src/data/generated/places.osm.json';
const raw = readFileSync(DATA_PATH, 'utf8').replace(/^﻿/, '');
const data = JSON.parse(raw);

// Count null fields across all entries
let totalNulls = 0;
data.forEach(p => {
  Object.values(p).forEach(v => { if (v === null) totalNulls++; });
});

// Manual entries missing description
const manualNoDesc = data.filter(p => p.source === 'manual' && !p.description);
const osmFood = data.filter(p => p.source === 'osm' && ['restaurant','fast_food','cafe','bakery','juice_bar','ice_cream_parlor'].includes(p.type));

console.log('Total entries: ' + data.length);
console.log('Null fields to clean: ' + totalNulls);
console.log('Manual entries missing description: ' + manualNoDesc.length);
console.log('');
console.log('Manual entries without description:');
manualNoDesc.slice(0, 60).forEach(p => console.log('  ' + p.id + ' | ' + p.name + ' | ' + p.cityId));