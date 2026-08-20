/**
 * Patch ארומה and קפה קפה data:
 * - ארומה: remove non-kosher/unverifiable branches, add kosherType where missing, add menu
 * - קפה קפה: fix kosherType for confirmed branches, add menu
 * Source: official chain websites (scraped 2026-07-23)
 * Run: node scripts/patch-aroma-cafecafe.mjs
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

// ══════════════════════════════════════════════════════════════════════════════
// ארומה — menu: https://www.aroma.co.il/menus/
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== ארומה ===');
const AROMA_MENU = 'https://www.aroma.co.il/menus/';

// Add menu to ALL ארומה entries
let aromaCount = 0;
for (const e of data) {
  if (e.name === 'ארומה') {
    e.menu = AROMA_MENU;
    aromaCount++;
  }
}
console.log(`  ✓ added menu to ${aromaCount} ארומה entries`);

// ── Remove branches not on official site or confirmed non-kosher ──────────────
const AROMA_REMOVE = [
  { match: e => e.name === 'ארומה' && e.cityId === 'נחף',
    reason: 'not on official Aroma site' },
  { match: e => e.name === 'ארומה' && e.address && e.address.includes('הלל') && e.address.includes('18') && e.cityId === 'ירושלים',
    reason: 'not on official Aroma site' },
  { match: e => e.name === 'ארומה' && e.address && e.address.includes('חברון') && e.address.includes('21') && e.cityId === 'באר שבע',
    reason: 'not on official Aroma site (ביג באר שבע)' },
  { match: e => e.name === 'ארומה' && e.address && e.address.includes('התמר') && e.cityId && e.cityId.includes('יוקנעם'),
    reason: 'not on official Aroma site' },
  { match: e => e.name === 'ארומה' && e.address && e.address.includes('הארבעה') && e.address.includes('24'),
    reason: 'not on official Aroma site' },
  { match: e => e.name === 'ארומה' && e.address && e.address.includes('בן יהודה') && e.address.includes('21'),
    reason: 'open on Shabbat / not on official Aroma site' },
];

for (const { match, reason } of AROMA_REMOVE) {
  const idx = data.findIndex(match);
  if (idx !== -1) {
    console.log(`  ✗ removed (${reason}):`, data[idx].address || data[idx].cityId);
    data.splice(idx, 1);
    removed++;
  } else {
    // Log not found — might already be absent
    console.log(`  ℹ not found (already absent or different address)`);
  }
}

// ── Set kosherType for confirmed branches ─────────────────────────────────────
function patchAroma(matchFn, fields) {
  const e = data.find(matchFn);
  if (!e) { console.warn('  ⚠ not found'); return; }
  Object.assign(e, fields);
  patched++;
  console.log(`  ✓ patched:`, e.address || e.cityId);
}

// אילת — מהדרין
patchAroma(
  e => e.name === 'ארומה' && e.cityId === 'אילת' && !e.kosherType,
  { kosherType: 'mehadrin', certifiedBy: 'כשר למהדרין' }
);

// דימונה — מהדרין
patchAroma(
  e => e.name === 'ארומה' && e.cityId === 'דימונה' && !e.kosherType,
  { kosherType: 'mehadrin', certifiedBy: 'כשר למהדרין' }
);

// ויצמן 14, תל אביב (איכילוב) — כשר
patchAroma(
  e => e.name === 'ארומה' && e.address && e.address.includes('ויצמן') && e.address.includes('14') && !e.kosherType,
  { kosherType: 'kosher', certifiedBy: 'כשר' }
);

// יגאל אלון 94, תל אביב — כשר
patchAroma(
  e => e.name === 'ארומה' && e.address && e.address.includes('יגאל אלון') && e.address.includes('94') && !e.kosherType,
  { kosherType: 'kosher', certifiedBy: 'כשר' }
);

console.log(`\n  ✓ ארומה: removed ${removed}, patched ${patched} kosher, menu added to ${aromaCount}`);

// ══════════════════════════════════════════════════════════════════════════════
// קפה קפה — menu: https://www.cafecafe.co.il/he/company/a/menu/
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== קפה קפה ===');
const CAFECAFE_MENU = 'https://www.cafecafe.co.il/he/company/a/menu/';
let removedCC = 0;
let patchedCC = 0;

// Add menu to ALL קפה קפה entries
let ccCount = 0;
for (const e of data) {
  if (e.name === 'קפה קפה') {
    e.menu = CAFECAFE_MENU;
    ccCount++;
  }
}
console.log(`  ✓ added menu to ${ccCount} קפה קפה entries`);

function patchCC(matchFn, fields) {
  const e = data.find(matchFn);
  if (!e) { console.warn('  ⚠ not found'); return; }
  Object.assign(e, fields);
  patchedCC++;
  console.log(`  ✓ patched:`, e.address || e.cityId);
}

// חולון סוקולוב 48 — חתם סופר
patchCC(
  e => e.name === 'קפה קפה' && e.cityId === 'חולון' && e.address && e.address.includes('סוקולוב'),
  { kosherType: 'chatam_sofer', certifiedBy: 'בד"צ חתם סופר' }
);

// מנחם בגין 132, תל אביב (עזריאלי) — מהדרין
patchCC(
  e => e.name === 'קפה קפה' && e.address && e.address.includes('מנחם בגין') && (e.address.includes('132') || e.cityId === 'תל אביב'),
  { kosherType: 'mehadrin', certifiedBy: 'כשר למהדרין' }
);

// יוקנעם התמר 1 — not on official site → remove
const ccYokneem = data.find(e => e.name === 'קפה קפה' && e.cityId && e.cityId.includes('יוקנעם'));
if (ccYokneem) {
  const idx = data.indexOf(ccYokneem);
  data.splice(idx, 1);
  removedCC++;
  console.log('  ✗ removed (not on official cafecafe.co.il site):', ccYokneem.address || ccYokneem.cityId);
} else {
  console.log('  ℹ יוקנעם — not found (already absent)');
}

console.log(`\n  ✓ קפה קפה: removed ${removedCC}, patched ${patchedCC} kosher, menu added to ${ccCount}`);

// ── Save ──────────────────────────────────────────────────────────────────────
writeWithBom(DATA_FILE, data);
console.log(`\n✓ Total: removed ${removed + removedCC}, patched ${patched + patchedCC} kosher entries.`);
console.log(`  Total entries: ${data.length}`);
