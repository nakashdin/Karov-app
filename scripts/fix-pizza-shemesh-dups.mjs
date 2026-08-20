import { readFileSync, writeFileSync } from 'fs';

const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
function readJson(p) {
  const raw = readFileSync(p);
  const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
  return JSON.parse(str);
}
function writeJson(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}

const FILES = [
  'C:/Users/User/Desktop/claude plane/kosher-app/src/data/generated/restaurants.osm.json',
  'C:/Users/User/Desktop/claude plane/kosher-app/src/data/generated/places.osm.json',
];

// ב-places.osm.json יש manual-pizza-shemesh-* (מאומת)
// נמחק 9000xxx רק בערים שיש להן manual
const places = readJson(FILES[1]);
const pizzaShemesh = places.filter(r => r.name && r.name.includes('פיצה שמש'));
const manualCities = new Set(
  pizzaShemesh.filter(r => r.id.startsWith('manual-pizza-shemesh')).map(r => r.cityId)
);
console.log('ערים עם manual מאומת:', [...manualCities].join(', '));

// IDs למחיקה: 9000xxx בערים שיש manual
const toDelete = new Set(
  pizzaShemesh
    .filter(r => /^9000/.test(r.id) && manualCities.has(r.cityId))
    .map(r => r.id)
);
console.log('נמחקים:', toDelete.size, 'רשומות 9000xxx כפולות');

for (const filePath of FILES) {
  const data = readJson(filePath);
  const before = data.length;
  const filtered = data.filter(r => !toDelete.has(r.id));
  writeJson(filePath, filtered);
  console.log(`${filePath.split('/').pop()}: ${before} → ${filtered.length}`);
}

// אמות
const check = readJson(FILES[1]);
const ps = check.filter(r => r.name && r.name.includes('פיצה שמש'));
console.log('\nסה"כ פיצה שמש אחרי תיקון:', ps.length);
const byCity = {};
ps.forEach(r => { byCity[r.cityId] = (byCity[r.cityId]||[]); byCity[r.cityId].push(r.id.split('-')[0]); });
const dups = Object.entries(byCity).filter(([,ids])=>ids.length>1);
if (dups.length) {
  console.log('ערים עם עדיין כפל:');
  dups.forEach(([city, ids]) => console.log(' ', city, ids.join(', ')));
} else {
  console.log('✅ אין כפילויות');
}
