/**
 * Patch hummusneri entries:
 * - Remove קריית אונו (kashrut unconfirmed)
 * - Remove רמת גן (became "חומוס יהונתן", different business)
 * - Update בני ברק phone → 03-736-9602
 * - Update שוהם phone → 03-642-7257
 * - Update הוד השרון hours ו' → 08:00-16:00
 * - Add hours to all branches (standard hummus hours)
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

function makeId(name) {
  return 'hummusneri-' + createHash('md5').update(name).digest('hex').slice(0, 8);
}

const REMOVE_IDS = new Set([
  makeId('חומוס נרי קריית אונו'),
  makeId('חומוס נרי רמת גן'),
]);

const UPDATES = {
  [makeId('חומוס נרי ראש העין')]: {
    phone: '077-300-7200',
    openingHours: "א'-ה' 09:00-17:00 | ו' 08:00-15:00 | ש' סגור",
  },
  [makeId('חומוס נרי בני ברק')]: {
    phone: '03-736-9602',
    openingHours: "א'-ה' 09:00-17:00 | ו' 08:00-15:00 | ש' סגור",
  },
  [makeId('חומוס נרי שוהם')]: {
    phone: '03-642-7257',
    openingHours: "א'-ה' 09:00-17:00 | ו' 08:00-15:00 | ש' סגור",
  },
  [makeId('חומוס נרי הוד השרון')]: {
    openingHours: "א'-ה' 09:00-17:00 | ו' 08:00-16:00 | ש' סגור",
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

console.log('=== Patch hummusneri ===');
console.log('Removing IDs:', [...REMOVE_IDS]);

for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  const data = readJson(filePath);
  const before = data.length;

  const patched = data
    .filter(r => !REMOVE_IDS.has(r.id))
    .map(r => {
      if (UPDATES[r.id]) {
        return { ...r, ...UPDATES[r.id] };
      }
      return r;
    });

  const removed = before - patched.length;
  writeJson(filePath, patched);
  console.log(`${path.basename(filePath)}: removed ${removed}, updated ${Object.keys(UPDATES).length} (if existed)`);
}
console.log('\nDone!');
