/**
 * Remove הוד השרון סוקולוב 10 from Roladin entries —
 * branch page at roladin.co.il shows NO kosher indicator (unlike certified branches).
 * Run: node scripts/patch-roladin-hodhashaon.mjs
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

let data = readNoBom(DATA_FILE);

const idx = data.findIndex(e =>
  e.name === 'רולדין' &&
  e.address && e.address.includes('סוקולוב 10') &&
  e.cityId === 'הוד השרון'
);

if (idx !== -1) {
  console.log('✗ removing:', data[idx].address, data[idx].cityId);
  data.splice(idx, 1);
  writeWithBom(DATA_FILE, data);
  console.log(`✓ Done. Total entries: ${data.length}`);
} else {
  console.log('⚠ Entry not found — may already be removed');
}
