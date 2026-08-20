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

const KOKO_ID = 'osm-node-12626437216';

for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  let data = readJson(filePath);

  // Remove קוקו על גלגלים שוהם
  const before = data.length;
  data = data.filter(r => r.id !== KOKO_ID);
  const removed = before - data.length;

  // Burger → fast_food
  let burgerUpdates = 0;
  for (const r of data) {
    if (r.name && (r.name.includes('בורגר') || r.name.toLowerCase().includes('burger')) && r.type !== 'fast_food') {
      r.type = 'fast_food';
      burgerUpdates++;
    }
  }

  writeJson(filePath, data);
  console.log(`${path.basename(filePath)}: burgers→fast_food: ${burgerUpdates}, removed: ${removed}`);
}
console.log('Done!');
