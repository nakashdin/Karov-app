import { readFileSync, writeFileSync } from 'fs';

const DATA_PATH = 'src/data/generated/places.osm.json';
const raw = readFileSync(DATA_PATH, 'utf8').replace(/^﻿/, '');
const data = JSON.parse(raw);

const FOOD_TYPES = new Set(['restaurant','fast_food','cafe','bakery','juice_bar','ice_cream_parlor','coffee_cart','winery']);

const foodNoDesc = data.filter(p => FOOD_TYPES.has(p.type) && !p.description);

// detect chain: same name appears 2+ times
const nameGroups = {};
foodNoDesc.forEach(p => {
  if (!nameGroups[p.name]) nameGroups[p.name] = [];
  nameGroups[p.name].push(p);
});

// chains: pick one representative entry (the one with most data = website/instagram)
const chains = [];
const uniques = [];

Object.entries(nameGroups).forEach(([name, entries]) => {
  if (entries.length > 1) {
    // pick representative with best data
    const rep = entries.sort((a,b) => {
      const score = p => (p.website?2:0)+(p.instagram?1:0)+(p.facebook?1:0);
      return score(b)-score(a);
    })[0];
    chains.push({
      name,
      branchCount: entries.length,
      ids: entries.map(e => e.id),
      type: rep.type,
      category: rep.category,
      website: rep.website || null,
      instagram: rep.instagram || null,
      facebook: rep.facebook || null,
    });
  } else {
    const p = entries[0];
    uniques.push({
      id: p.id,
      name: p.name,
      type: p.type,
      category: p.category,
      cityId: p.cityId,
      website: p.website || null,
      instagram: p.instagram || null,
      facebook: p.facebook || null,
    });
  }
});

writeFileSync('scripts/desc-chains.json', JSON.stringify(chains, null, 2), 'utf8');
writeFileSync('scripts/desc-uniques.json', JSON.stringify(uniques, null, 2), 'utf8');

console.log('Chains to describe: ' + chains.length);
console.log('Unique entries to describe: ' + uniques.length);