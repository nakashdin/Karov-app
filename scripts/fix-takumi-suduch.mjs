/**
 * Fix: טקומי שוהם category → meat, menu → קישור ישיר שוהם
 *       סודוך כל הסניפים → description טוסט נקניק
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

for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  const data = readJson(filePath);
  let changes = 0;

  for (const r of data) {
    // טקומי שוהם: category → meat, menu → direct Shoham link
    if (r.name === 'טקומי שוהם') {
      r.category = 'meat';
      r.menu = 'https://order.takumi.co.il/wl/615593';
      changes++;
    }
    // סודוך: add description
    if (r.name && r.name.startsWith('סודוך')) {
      r.description = 'טוסט נקניק';
      changes++;
    }
  }

  writeJson(filePath, data);
  console.log(`${path.basename(filePath)}: ${changes} records updated`);
}
console.log('Done!');
