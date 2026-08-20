/**
 * Patch דומינו'ס:
 * - Add kosherType: badatz_beit_yosef to all 10 branches
 * - Add opening hours per branch (scraped 2026-07-23)
 * - Add menu URL to all
 * Source: https://www.dominos.co.il/branches/...
 * Run: node scripts/patch-dominos.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../src/data/generated/restaurants.osm.json');

const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
function readNoBom(p) {
  const buf = readFileSync(p);
  const s = (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) ? buf.slice(3) : buf;
  return JSON.parse(s.toString('utf8'));
}
function writeWithBom(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}

const data = readNoBom(DATA_FILE);
const MENU = 'https://www.dominos.co.il/menu';

const BRANCHES = [
  { id: '9000093', hours: 'Su-Th 12:00-00:00; Fr 12:00-14:30; Sa (sunset+00:30)-01:00' },  // הירקון ת"א
  { id: '9000094', hours: 'Su-Th 12:00-00:00; Fr 12:00-15:00; Sa (sunset+00:30)-00:00' },  // גבעתיים בורוכוב
  { id: '9000095', hours: 'Su-Th 11:30-00:00; Fr 11:00-13:45; Sa (sunset+00:30)-00:00' },  // שטמפפר פ"ת
  { id: '9000096', hours: 'Su-Th 11:30-00:00; Fr 11:00-13:45; Sa (sunset+00:30)-00:00' },  // כפר גנים פ"ת
  { id: '9000097', hours: 'Su-Th 11:30-00:00; Fr 11:30-13:45; Sa (sunset+00:30)-23:00' },  // אם המושבות פ"ת
  { id: '9000098', hours: 'Su-Th 12:00-23:30; Fr 12:00-15:00; Sa (sunset+00:30)-23:30' },  // אשדוד
  { id: '9000099', hours: 'Su-Th 12:00-00:00; Fr 11:30-14:30; Sa (sunset+00:30)-00:00' },  // אשקלון
  { id: '9000100', hours: 'Su-Th 12:00-23:00; Fr 11:00-14:00; Sa (sunset+00:30)-23:00' },  // עפולה
  { id: '9000101', hours: 'Su-Th 12:00-00:00; Fr 12:00-15:00; Sa (sunset+00:30)-01:00' },  // קריית ביאליק
  { id: '9000102', hours: 'Su-Th 12:00-22:00; Fr 11:00-14:45; Sa (sunset+00:30)-22:00' },  // חולון פארק פרס
];

let patched = 0;
for (const { id, hours } of BRANCHES) {
  const e = data.find(d => d.id === id);
  if (!e) { console.warn('⚠ not found:', id); continue; }
  e.kosherType = 'badatz_beit_yosef';
  e.openingHours = hours;
  e.menu = MENU;
  patched++;
  console.log('✓', e.address || id);
}

writeWithBom(DATA_FILE, data);
console.log(`\n✓ Domino's: patched ${patched} branches. Total: ${data.length}`);
