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

const RESTAURANTS = path.join(ROOT, 'src/data/generated/restaurants.osm.json');
const PLACES      = path.join(ROOT, 'src/data/generated/places.osm.json');

const rests  = readJson(RESTAURANTS);
const places = readJson(PLACES);

// רשומות גרג שאמורות להיות (לפי restaurants.osm.json)
const correctGreg = rests.filter(r => r.name && r.name.includes('קפה גרג'));
const correctIds  = new Set(correctGreg.map(r => r.id));

// הסר את כל רשומות גרג מ-places
const nonGreg = places.filter(r => !r.name || !r.name.includes('קפה גרג'));
console.log('הוסרו מ-places:', places.length - nonGreg.length, 'רשומות גרג');

// הוסף בחזרה רק את הרשומות הנכונות
const merged = [...nonGreg, ...correctGreg];
writeJson(PLACES, merged);
console.log('נוספו חזרה:', correctGreg.length, 'רשומות גרג נקיות');
console.log('סה"כ places.osm.json:', merged.length);

// אמת
const gregCheck = merged.filter(r => r.name && r.name.includes('קפה גרג'));
const noHours = gregCheck.filter(r => !r.openingHours);
console.log('\nאמות:');
console.log('  גרג ב-places:', gregCheck.length, '(צריך להיות', correctGreg.length, ')');
console.log('  ללא שעות:', noHours.length);
