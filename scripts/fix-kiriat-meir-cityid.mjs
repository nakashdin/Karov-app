import fs from 'fs';
const DATA_PATH = './src/data/generated/places.osm.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8').replace(/^﻿/, ''));

let fixedCity = 0, fixedAddr = 0;

const result = data.map(p => {
  if (p.cityId !== 'קריית מאיר') return p;
  let updated = { ...p, cityId: 'תל אביב' };
  fixedCity++;
  if (p.address?.endsWith(', קריית מאיר')) {
    updated.address = p.address.replace(/, קריית מאיר$/, ', תל אביב יפו');
    fixedAddr++;
  }
  return updated;
});

fs.writeFileSync(DATA_PATH, JSON.stringify(result, null, 2));
console.log(`cityId fixed: ${fixedCity}`);
console.log(`address fixed: ${fixedAddr}`);
