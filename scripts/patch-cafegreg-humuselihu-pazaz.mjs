/**
 * Patch kashrut + menu for קפה גרג, חומוס אליהו, פיצה פצץ.
 * Source: official chain websites (scraped 2026-07-23)
 * Run: node scripts/patch-cafegreg-humuselihu-pazaz.mjs
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
let changed = 0;
let removed = 0;

// ── Helper ────────────────────────────────────────────────────────────────────
function findByNameAndCity(name, cityId) {
  return data.find(e => e.name === name && e.cityId === cityId);
}
function findByNameAndAddress(name, addressFragment) {
  return data.find(e => e.name === name && e.address && e.address.includes(addressFragment));
}
function patch(entry, fields) {
  if (!entry) { console.warn('  ⚠ entry not found'); return; }
  Object.assign(entry, fields);
  changed++;
  console.log('  ✓ patched:', entry.address || entry.cityId);
}

// ══════════════════════════════════════════════════════════════════════════════
// קפה גרג — menu: https://gregcafe.co.il/menus/
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== קפה גרג ===');
const GREG_MENU = 'https://gregcafe.co.il/menus/';

// כרמיאל — NOT KOSHER → remove from DB
const gregCarmiel = findByNameAndCity('קפה גרג', 'כרמיאל');
if (gregCarmiel) {
  const idx = data.indexOf(gregCarmiel);
  data.splice(idx, 1);
  removed++;
  console.log('  ✗ removed (not kosher):', gregCarmiel.address);
}

// ראש פינה — כשר למהדרין
patch(
  findByNameAndCity('קפה גרג', 'ראש פינה'),
  { kosherType: 'mehadrin', certifiedBy: 'כשר למהדרין', menu: GREG_MENU, website: 'https://gregcafe.co.il/branch/ראש-פינה/' }
);

// קרית שמונה — כשר למהדרין (temporarily closed but still listed)
patch(
  findByNameAndCity('קפה גרג', 'קרית שמונה'),
  { kosherType: 'mehadrin', certifiedBy: 'כשר למהדרין', menu: GREG_MENU, website: 'https://gregcafe.co.il/branch/קריית-שמונה/' }
);

// יוקנעם — כשר למהדרין
patch(
  findByNameAndCity('קפה גרג', 'יוקנעם המושבה'),
  { kosherType: 'mehadrin', certifiedBy: 'כשר למהדרין', menu: GREG_MENU, website: 'https://gregcafe.co.il/branch/יוקנעם/' }
);

// ══════════════════════════════════════════════════════════════════════════════
// חומוס אליהו — menu: https://www.humus-eli-yahoo.com/menu/
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== חומוס אליהו ===');
const HUMUS_MENU = 'https://www.humus-eli-yahoo.com/menu/';
const HUMUS_WEBSITE = 'https://www.humus-eli-yahoo.com';

// רחובות (יעקב 1) — כשר למהדרין
patch(
  findByNameAndAddress('חומוס אליהו', 'יעקב'),
  { kosherType: 'rabanut_mehadrin', certifiedBy: 'רבנות מהדרין רחובות', menu: HUMUS_MENU, website: HUMUS_WEBSITE }
);

// ראש פינה — כשר למהדרין
patch(
  findByNameAndCity('חומוס אליהו', 'ראש פינה'),
  { kosherType: 'mehadrin', certifiedBy: 'כשר למהדרין', menu: HUMUS_MENU, website: HUMUS_WEBSITE }
);

// עפולה — coming soon, not yet open → remove
const humusAfula = findByNameAndCity('חומוס אליהו', 'עפולה');
if (humusAfula) {
  const idx = data.indexOf(humusAfula);
  data.splice(idx, 1);
  removed++;
  console.log('  ✗ removed (not yet open / coming soon):', humusAfula.address);
}

// תל אביב — כשר למהדרין
patch(
  findByNameAndAddress('חומוס אליהו', 'מעון'),
  { kosherType: 'mehadrin', certifiedBy: 'כשר למהדרין', menu: HUMUS_MENU, website: HUMUS_WEBSITE }
);

// ══════════════════════════════════════════════════════════════════════════════
// פיצה פצץ — menu: https://order.plweb.online/branchesPage/piza-pazzaz
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== פיצה פצץ ===');
const PAZAZ_MENU = 'https://order.plweb.online/branchesPage/piza-pazzaz';

// אשדוד — כשר בד"צ
patch(
  findByNameAndCity('פיצה פצץ', 'אשדוד'),
  { kosherType: 'badatz_beit_yosef', certifiedBy: 'בד"צ', menu: PAZAZ_MENU, website: 'https://piza-pazzaz.co.il' }
);

// שוהם — כשר בד"צ בית יוסף
patch(
  findByNameAndCity('פיצה פצץ', 'שוהם'),
  { kosherType: 'badatz_beit_yosef', certifiedBy: 'בד"צ בית יוסף', menu: PAZAZ_MENU, website: 'https://pazaz-shoham.co.il' }
);

// ── Save ──────────────────────────────────────────────────────────────────────
writeWithBom(DATA_FILE, data);
console.log(`\n✓ Patched ${changed} entries, removed ${removed} (not kosher / not open).`);
console.log(`  Total entries: ${data.length}`);
