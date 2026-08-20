import { readFileSync } from 'fs';

const DATA_PATH = 'src/data/generated/places.osm.json';
const raw = readFileSync(DATA_PATH, 'utf8').replace(/^﻿/, '');
const data = JSON.parse(raw);

const FOOD_TYPES = new Set(['restaurant','fast_food','cafe','bakery','juice_bar','ice_cream_parlor','coffee_cart','winery']);

const foodNoDesc = data.filter(p =>
  FOOD_TYPES.has(p.type) &&
  !p.description
);

// Group by base name (strip branch suffix)
const nameCount = {};
foodNoDesc.forEach(p => {
  const base = p.name.replace(/\s+(סניף|ירושלים|תל אביב|רמת גן|\d+|פ"ת|ב"ב).*$/,'').trim();
  nameCount[base] = (nameCount[base] || 0) + 1;
});

const chains = Object.entries(nameCount).filter(([,c]) => c > 1).sort((a,b) => b[1]-a[1]);
const unique = Object.entries(nameCount).filter(([,c]) => c === 1);

console.log('Food entries missing description: ' + foodNoDesc.length);
console.log('Unique names: ' + unique.length);
console.log('Chain groups (>1 branch): ' + chains.length);
console.log('');
console.log('Top chains:');
chains.slice(0, 15).forEach(([name, count]) => console.log('  ' + count + 'x ' + name));