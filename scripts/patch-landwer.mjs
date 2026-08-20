/**
 * Patch לנדוור:
 * - Fix website URL (landwer-cafe.co.il → landwercafe.co.il)
 * - Add kosherType for all 3 branches (confirmed via OSM osmKosher:only + hours)
 * - קרית שמונה: mehadrin per TripAdvisor reviews
 * Run: node scripts/patch-landwer.mjs
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
let patched = 0;

const CORRECT_WEBSITE = 'https://www.landwercafe.co.il';

for (const e of data) {
  if (e.name !== 'לנדוור') continue;

  // Fix wrong website URL
  if (e.website && e.website.includes('landwer-cafe.co.il')) {
    e.website = CORRECT_WEBSITE;
  }

  // קרית שמונה — mehadrin (confirmed by TripAdvisor reviews)
  if (e.cityId === 'קרית שמונה' && !e.kosherType) {
    e.kosherType = 'mehadrin';
    e.certifiedBy = 'כשר למהדרין';
    patched++;
    console.log('  ✓ mehadrin:', e.address || e.cityId);
  }

  // קריית מאיר (ראשל"צ neighborhood) + כפר נטר — kosher per OSM osmKosher:only
  if ((e.cityId === 'קריית מאיר' || e.cityId === 'כפר נטר') && !e.kosherType) {
    e.kosherType = 'kosher';
    e.certifiedBy = 'כשר';
    patched++;
    console.log('  ✓ kosher:', e.address || e.cityId);
  }
}

writeWithBom(DATA_FILE, data);
console.log(`\n✓ Landwer: patched ${patched} entries. Total: ${data.length}`);
