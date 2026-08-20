/**
 * Immediate obvious fixes:
 * - ג'פניקה גבעתיים: open Fr+Sa → not kosher → remove
 * - קרנף רמת השרון: open Su-Sa (7 days) → not kosher → remove
 * - חומוס אליהו קרני שומרון: exact duplicate → remove one
 * - Pizza Hut (English): add menu URL
 * Run: node scripts/patch-obvious-fixes.mjs
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
let removed = 0;
let patched = 0;

// ── 1. ג'פניקה גבעתיים — open Fri + Sat → non-kosher ──────────────────────
{
  const idx = data.findIndex(e =>
    e.name === "ג'פניקה" && e.cityId === 'גבעתיים'
  );
  if (idx !== -1) {
    console.log("✗ removing ג'פניקה גבעתיים (open Fr+Sa):", data[idx].address);
    data.splice(idx, 1);
    removed++;
  } else {
    console.log("ℹ ג'פניקה גבעתיים not found");
  }
}

// ── 2. קרנף רמת השרון — open 7 days (Su-Sa) → non-kosher ─────────────────
{
  const idx = data.findIndex(e =>
    e.name === 'קרנף' && e.cityId === 'רמת השרון'
  );
  if (idx !== -1) {
    console.log('✗ removing קרנף רמת השרון (open 7 days):', data[idx].address);
    data.splice(idx, 1);
    removed++;
  } else {
    console.log('ℹ קרנף רמת השרון not found');
  }
}

// ── 3. חומוס אליהו קרני שומרון — remove exact duplicate ──────────────────────
{
  const entries = data.filter(e => e.name === 'חומוס אליהו קרני שומרון');
  if (entries.length >= 2) {
    // Remove the second duplicate
    const second = entries[1];
    const idx = data.lastIndexOf(second);
    if (idx !== -1) {
      console.log('✗ removing חומוס אליהו קרני שומרון duplicate:', data[idx].address);
      data.splice(idx, 1);
      removed++;
    }
  } else {
    console.log('ℹ חומוס אליהו קרני שומרון: found', entries.length, 'entries (no duplicate to remove)');
  }
}

// Also add menu for חומוס אליהו קרני שומרון
{
  const e = data.find(e => e.name === 'חומוס אליהו קרני שומרון');
  if (e && !e.menu) {
    e.menu = 'https://www.humus-eli-yahoo.com/menu/';
    patched++;
    console.log('✓ menu added: חומוס אליהו קרני שומרון');
  }
}

// ── 4. Pizza Hut (English OSM entries) — add menu ─────────────────────────
{
  const PIZZA_HUT_MENU = 'https://order.pizzahut.co.il/3/menu';
  let count = 0;
  for (const e of data) {
    if (e.name === 'Pizza Hut') {
      if (!e.menu) { e.menu = PIZZA_HUT_MENU; count++; }
      if (!e.kosherType && e.extra?.osmKosher) {
        e.kosherType = 'kosher';
        e.certifiedBy = 'כשר';
        count++;
      }
    }
  }
  console.log('✓ Pizza Hut (English): patched', count, 'fields');
  patched += count;
}

writeWithBom(DATA_FILE, data);
console.log(`\n✓ Done. Removed: ${removed}, patched: ${patched}. Total: ${data.length}`);
