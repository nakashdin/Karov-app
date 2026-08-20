/**
 * Add kosherType to all פיצה שמש and פיצה האט entries that are missing it.
 * - פיצה שמש: certified by הרב לנדא (Badatz Bnei Brak) → mehadrin
 * - פיצה האט: certified by "כשרות רבנות ובד"צ" (varies per branch) → rabanut baseline
 * Run: node scripts/patch-pizza-koshertype.mjs
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
let shemeshCount = 0;
let hutCount = 0;

for (const e of data) {
  if (e.kosherType) continue; // already set — skip

  if (e.name === 'פיצה שמש') {
    e.kosherType = 'mehadrin';
    // Keep existing certifiedBy ("הרב לנדא") if set, otherwise set generic
    if (!e.certifiedBy) e.certifiedBy = 'הרב לנדא';
    shemeshCount++;
  }

  if (e.name === 'פיצה האט') {
    e.kosherType = 'rabanut';
    // Keep existing certifiedBy ("כשרות רבנות ובד"צ") if set
    if (!e.certifiedBy) e.certifiedBy = 'כשר';
    hutCount++;
  }
}

writeWithBom(DATA_FILE, data);
console.log(`✓ פיצה שמש: set kosherType=mehadrin on ${shemeshCount} entries`);
console.log(`✓ פיצה האט: set kosherType=rabanut on ${hutCount} entries`);
console.log(`Total entries: ${data.length}`);
