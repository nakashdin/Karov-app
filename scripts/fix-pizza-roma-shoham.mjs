/**
 * Fix פיצה רומא שוהם: remove wrong website, fix hours, add kosher/category
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

function readJson(p) {
  const raw = readFileSync(p);
  const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
  return JSON.parse(str);
}
function writeJson(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}

const SHOHAM_ID = 'osm-node-12557310999';

for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  const data = readJson(filePath);
  const r = data.find(r => r.id === SHOHAM_ID);
  if (r) {
    delete r.website;
    r.openingHours = "א'-ה' 11:00-22:30 | ו' 11:00-14:00 | ש' מוצ\"ש 19:00-22:30";
    r.kosherType = 'rabanut';
    r.category = 'dairy';
    r.type = 'fast_food';
    r.tags = ['pizza'];
    console.log('Updated שוהם:', r.name);
  }
  writeJson(filePath, data);
}
console.log('Done!');
