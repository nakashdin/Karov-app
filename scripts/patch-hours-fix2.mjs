import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

function makeId(prefix, name) {
  return prefix + createHash('md5').update(name).digest('hex').slice(0, 8);
}

const UPDATES = {
  [makeId('bahadunes-', 'בהדונס איירפורט סיטי')]: {
    openingHours: "א'-ה' 09:00-16:00 | ו' 08:00-15:00 | ש' סגור",
  },
  // חומוס אליהו אזור — ID scheme is humus-eli-{name}
  'humus-eli-חומוס-אליהו-אזור': {
    openingHours: "א'-ד' 09:30-17:00 | ה' 09:30-18:00 | ו' 09:30-14:30 | ש' סגור",
  },
};

function readJson(p) {
  const raw = readFileSync(p);
  const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
  return JSON.parse(str);
}
function writeJson(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}

console.log('=== Patch hours fix 2 ===');

for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  const data = readJson(filePath);
  let updated = 0;
  const patched = data.map(r => {
    if (UPDATES[r.id]) { updated++; return { ...r, ...UPDATES[r.id] }; }
    return r;
  });
  writeJson(filePath, patched);
  console.log(`${path.basename(filePath)}: עודכנו ${updated}`);
}
console.log('Done!');
