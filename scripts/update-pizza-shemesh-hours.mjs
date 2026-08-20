/**
 * Updates openingHours for Pizza Shemesh branches using scraped data.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

function readJson(filePath) {
  const raw = readFileSync(filePath);
  const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
  return JSON.parse(str);
}
function writeJson(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  writeFileSync(filePath, Buffer.concat([BOM, Buffer.from(json, 'utf8')]));
}

const scraped = readJson(path.join(__dirname, 'pizza-shemesh-hours.json'));
// Build id → hours map (only entries with hours)
const hoursMap = {};
for (const r of scraped) {
  if (r.hours) hoursMap[r.id] = r.hours;
}

console.log(`Hours map: ${Object.keys(hoursMap).length} entries`);

let updatedR = 0, updatedP = 0;

for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  const data = readJson(filePath);
  let count = 0;
  for (const entry of data) {
    if (hoursMap[entry.id] && !entry.openingHours) {
      entry.openingHours = hoursMap[entry.id];
      count++;
    }
  }
  writeJson(filePath, data);
  const label = path.basename(filePath);
  console.log(`${label}: updated ${count} entries`);
  if (label.includes('restaurants')) updatedR = count;
  else updatedP = count;
}

console.log('\nDone!');
