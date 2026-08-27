import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');

const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
function readJson(p) {
  const raw = readFileSync(p);
  const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
  return JSON.parse(str);
}
function writeJson(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}

function dist(a, b) {
  if (!a.location || !b.location) return 9999;
  const dlat = (a.location.latitude - b.location.latitude) * 111320;
  const dlng = (a.location.longitude - b.location.longitude) * 111320 * Math.cos(a.location.latitude * (Math.PI / 180));
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

// ציון איכות הרשומה — גבוה יותר = עדיף לשמור
function score(r) {
  return (r.openingHours ? 4 : 0) + (r.address ? 2 : 0) + (r.phone ? 1 : 0);
}

const FOOD_TYPES = ['restaurant', 'fast_food', 'cafe', 'coffee_cart', 'juice_bar', 'ice_cream_parlor', 'winery'];
const THRESHOLD_M = 100; // מרחק בין שתי רשומות לאותו מקום

const FILES = [
  path.join(ROOT, 'src/data/generated/restaurants.osm.json'),
  path.join(ROOT, 'src/data/generated/places.osm.json'),
];

// חשב את סט ה-IDs למחיקה פעם אחת לפי places (המלא)
const places = readJson(FILES[1]);
const food = places.filter(r => FOOD_TYPES.includes(r.type));

const toDelete = new Set();
for (let i = 0; i < food.length; i++) {
  if (toDelete.has(food[i].id)) continue;
  for (let j = i + 1; j < food.length; j++) {
    if (toDelete.has(food[j].id)) continue;
    if (food[i].name !== food[j].name) continue;
    if (dist(food[i], food[j]) < THRESHOLD_M) {
      if (score(food[i]) >= score(food[j])) toDelete.add(food[j].id);
      else toDelete.add(food[i].id);
    }
  }
}

console.log('סה"כ רשומות למחיקה:', toDelete.size);

for (const filePath of FILES) {
  const data = readJson(filePath);
  const before = data.length;
  const filtered = data.filter(r => !toDelete.has(r.id));
  writeJson(filePath, filtered);
  console.log(`${filePath.split('/').pop()}: ${before} → ${filtered.length} (נמחקו ${before - filtered.length})`);
}

// אמות סופית
const check = readJson(FILES[1]);
const FOOD_CHECK = check.filter(r => FOOD_TYPES.includes(r.type));
const key = r => (r.name || '') + '|' + (r.cityId || '');
const byKey = {};
FOOD_CHECK.forEach(r => { byKey[key(r)] = (byKey[key(r)] || 0) + 1; });
const remaining = Object.values(byKey).filter(c => c > 1).length;
console.log('\nאחרי ניקוי — כפילויות שם+עיר שנותרו:', remaining);
console.log('(רשומות ב-places.osm.json):', check.length);
