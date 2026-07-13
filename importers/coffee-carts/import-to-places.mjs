/**
 * מייבא את coffee-carts.normalized.json לתוך src/data/generated/places.osm.json
 * כלל: additive בלבד — לא מוחק, לא מחליף רשומות קיימות עם אותו id
 * גיבוי: places.osm.pre-coffeetrail.backup.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const PLACES_PATH = path.join(ROOT, 'src', 'data', 'generated', 'places.osm.json');
const CARTS_PATH  = path.join(__dirname, 'output', 'coffee-carts.normalized.json');
const BACKUP_PATH = path.join(ROOT, 'src', 'data', 'generated', 'places.osm.pre-coffeetrail.backup.json');

const existing = JSON.parse(fs.readFileSync(PLACES_PATH, 'utf8').replace(/^﻿/, ''));
const carts    = JSON.parse(fs.readFileSync(CARTS_PATH,  'utf8'));

const existingIds = new Set(existing.map(p => p.id));
const toAdd = carts.filter(c => {
  if (existingIds.has(c.id)) {
    console.warn(`  SKIP (dup): ${c.id}`);
    return false;
  }
  return true;
});

if (toAdd.length === 0) {
  console.log('אין רשומות חדשות להוסיף.');
  process.exit(0);
}

// גיבוי
fs.copyFileSync(PLACES_PATH, BACKUP_PATH);
console.log(`גיבוי: ${BACKUP_PATH}`);

const merged = [...existing, ...toAdd];

// כתיבה עם UTF-8 BOM (חובה לפי כלל הפרויקט)
const BOM = '﻿';
fs.writeFileSync(PLACES_PATH, BOM + JSON.stringify(merged, null, 2), 'utf8');

console.log(`\n✅ ייבוא הושלם`);
console.log(`   לפני: ${existing.length} רשומות`);
console.log(`   נוספו: ${toAdd.length} עגלות קפה`);
console.log(`   סה"כ: ${merged.length} רשומות`);
toAdd.forEach(c => console.log(`   + ${c.name} (${c.cityId})`));
