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

// IDs to DELETE (duplicates — keeping the cleaner manual record instead)
const DELETE_IDS = new Set([
  'osm-node-5498992177',  // ראש פינה OSM → שמור greg-9cf81d80
  'osm-node-5711530694',  // קרית שמונה OSM → שמור greg-d22f70cb
  'greg-0ff8033c',        // ים המלח → שמור greg-d1d652e6 (עין בוקק)
  'osm-node-6205595674',  // יוקנעם המושבה OSM → שמור greg-d99c94fb
  'greg-851ddf50',        // יוקנעם (dup) → שמור greg-d99c94fb
  'greg-0f966132',        // פרדס חנה (hours שגויות) → שמור greg-7406930e
]);

// Hours / name fixes for records to KEEP
const FIXES = {
  'greg-f8d2e80c': {  // ראש העין — חסר | ש' סגור
    openingHours: "א'-ה' 8:00-22:00 | ו' 8:00-14:00 | ש' סגור",
  },
  'greg-7406930e': {  // פרדס חנה כרכור — חסר ש' סגור (כבר OK אבל מוודא)
    openingHours: "א'-ה' 8:00-23:00 | ו' 8:00-14:30 | ש' סגור",
  },
  'greg-d99c94fb': {  // יוקנעם עילית — שם מוזר "יקנעם"
    name: 'קפה גרג יוקנעם עילית',
    openingHours: "א'-ה' 8:00-22:00 | ו' 8:00-14:30 | ש' סגור",
  },
  'greg-26408ffa': {  // נשר — שעות לא תקניות
    openingHours: "א'-ה' 7:30-22:00 | ו' 7:30-14:00 | ש' סגור",
  },
};

const FILES = [
  'C:/Users/User/Desktop/claude plane/kosher-app/src/data/generated/restaurants.osm.json',
  'C:/Users/User/Desktop/claude plane/kosher-app/src/data/generated/places.osm.json',
];

for (const filePath of FILES) {
  const data = readJson(filePath);
  const before = data.length;

  // 1. מחק כפילויות
  const filtered = data.filter(r => !DELETE_IDS.has(r.id));
  const deleted = before - filtered.length;

  // 2. תיקוני שדות
  let fixed = 0;
  for (const r of filtered) {
    if (FIXES[r.id]) {
      Object.assign(r, FIXES[r.id]);
      fixed++;
    }
  }

  writeJson(filePath, filtered);
  console.log(`${filePath.split('/').pop()}: נמחקו ${deleted} כפילויות, תוקנו ${fixed} רשומות → סה"כ ${filtered.length}`);
}

// אמת
const raw = readFileSync('C:/Users/User/Desktop/claude plane/kosher-app/src/data/generated/restaurants.osm.json');
const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
const data = JSON.parse(str);
const greg = data.filter(r => r.name && r.name.includes('קפה גרג'));
console.log('\n=== אחרי ניקוי ===');
greg.forEach(r => {
  const h = r.openingHours ? r.openingHours.slice(0, 50) : '❌ אין שעות';
  console.log(r.id.padEnd(28), '|', r.cityId.padEnd(20), '|', h);
});
console.log(`\nסה"כ קפה גרג: ${greg.length}`);
const noHours = greg.filter(r => !r.openingHours);
console.log(`❌ ללא שעות: ${noHours.length}`);
