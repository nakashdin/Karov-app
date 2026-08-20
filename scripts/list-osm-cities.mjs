import fs from 'fs';
const d = JSON.parse(fs.readFileSync('./src/data/generated/places.osm.json', 'utf8').replace(/^﻿/, ''));
const FOOD = ['restaurant','fast_food','cafe','coffee_cart','juice_bar','ice_cream_parlor','bakery'];
const list = d.filter(p => FOOD.includes(p.type) && !p.kosherType && p.source === 'osm' && p.cityId === 'קריית מאיר');
list.forEach((p, i) => console.log((i+1) + '. ' + p.name + ' [' + p.type + '] — ' + p.address));
console.log('\nסה"כ:', list.length);
