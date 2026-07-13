import { readFileSync, writeFileSync, copyFileSync } from 'fs';

const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

function readNoBom(p) {
  const buf = readFileSync(p);
  const s = (buf[0]===0xEF&&buf[1]===0xBB&&buf[2]===0xBF) ? buf.slice(3) : buf;
  return JSON.parse(s.toString('utf8'));
}

function writeWithBom(p, data) {
  const content = JSON.stringify(data, null, 2);
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(content, 'utf8')]));
}

const PLACES_PATH = 'src/data/generated/places.osm.json';
const RESTS_PATH  = 'src/data/generated/restaurants.osm.json';

// Backup
copyFileSync(PLACES_PATH, PLACES_PATH.replace('.json', '.pre-shoham-fix.backup.json'));
copyFileSync(RESTS_PATH,  RESTS_PATH.replace('.json',  '.pre-shoham-fix.backup.json'));

// Shopping center location (עמק איילון 30, שוהם) — from גלידה גולדה coords
const MALL_ADDR  = 'שדרות עמק איילון 30, שוהם';
const MALL_LOC   = { latitude: 31.9992228, longitude: 34.9466929 };

const TO_UPDATE_ADDR = new Set([
  'osm-node-4406510254',    // רולדין
  'osm-node-12557322215',   // ReBar ריבר
  'osm-node-12557310999',   // פיצה רומא
  'osm-node-12557322224',   // McDonald's
  'osm-node-12557322221',   // גלידה גולדה (already correct, but force consistency)
]);

const TO_DELETE = new Set([
  'osm-node-4127872290',    // קפה קפה שוהם
  'osm-node-12628507149',   // קפיטרית תיכון שוהם
]);

let updatedAddr = 0, deleted = 0;

function processArray(arr) {
  const result = [];
  for (const item of arr) {
    if (TO_DELETE.has(item.id)) {
      console.log(`🗑  מחיקה: ${item.name} (${item.id})`);
      deleted++;
      continue;
    }
    if (TO_UPDATE_ADDR.has(item.id)) {
      console.log(`📍 עדכון כתובת: ${item.name} → ${MALL_ADDR}`);
      result.push({ ...item, address: MALL_ADDR, location: MALL_LOC });
      updatedAddr++;
    } else {
      result.push(item);
    }
  }
  return result;
}

const places = readNoBom(PLACES_PATH);
const rests  = readNoBom(RESTS_PATH);

const newPlaces = processArray(places);
const newRests  = processArray(rests);

writeWithBom(PLACES_PATH, newPlaces);
writeWithBom(RESTS_PATH,  newRests);

console.log(`\n✅ עודכנו כתובות: ${updatedAddr} | נמחקו: ${deleted}`);
console.log(`places: ${places.length} → ${newPlaces.length}`);
console.log(`restaurants: ${rests.length} → ${newRests.length}`);
