/**
 * Patch multiple chains in one script:
 * - מקדונלד'ס: add menu URL
 * - ארומה אספרסו בר: add menu URL
 * - גלידה גולדה: add certifiedBy text + website + menu
 * - פיצה סטורי: add kosherType + menu
 * - New Deli: add kosherType + website + menu
 * - פיצה מילאנו: add per-branch kosherType
 * Source: official chain websites (scraped 2026-07-23)
 * Run: node scripts/patch-multi-chains.mjs
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

// ══════════════════════════════════════════════════════════════════════════════
// מקדונלד'ס — menu: https://www.mcdonalds.co.il/מה_בתפריט/מוצרים_בודדים
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== מקדונלד\'ס ===');
const MC_MENU = 'https://www.mcdonalds.co.il/%D7%9E%D7%94_%D7%91%D7%AA%D7%A4%D7%A8%D7%99%D7%98/%D7%9E%D7%95%D7%A6%D7%A8%D7%99%D7%9D_%D7%91%D7%95%D7%93%D7%93%D7%99%D7%9D';
let mcCount = 0;
for (const e of data) {
  if (e.name === "מקדונלד'ס" && !e.menu) {
    e.menu = MC_MENU;
    mcCount++;
  }
}
patched += mcCount;
console.log(`  ✓ menu added to ${mcCount} McDonald's entries`);

// ══════════════════════════════════════════════════════════════════════════════
// ארומה אספרסו בר — menu: https://www.aroma.co.il/menus/
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== ארומה אספרסו בר ===');
const AROMA_EB_MENU = 'https://www.aroma.co.il/menus/';
let aromaCount = 0;
for (const e of data) {
  if (e.name === 'ארומה אספרסו בר' && !e.menu) {
    e.menu = AROMA_EB_MENU;
    aromaCount++;
  }
}
patched += aromaCount;
console.log(`  ✓ menu added to ${aromaCount} ארומה אספרסו בר entries`);

// ══════════════════════════════════════════════════════════════════════════════
// גלידה גולדה — add certifiedBy text + website + menu
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== גלידה גולדה ===');
const GOLDA_WEBSITE = 'https://www.goldaglida.co.il';
const GOLDA_MENU = 'https://www.goldaglida.co.il/flavours';
let goldaCount = 0;
for (const e of data) {
  if (e.name !== 'גלידה גולדה') continue;
  let changed = false;
  if (!e.website) { e.website = GOLDA_WEBSITE; changed = true; }
  if (!e.menu) { e.menu = GOLDA_MENU; changed = true; }
  // Add certifiedBy where missing (based on kosherType)
  if (!e.certifiedBy && e.kosherType) {
    if (e.kosherType === 'badatz_beit_yosef') {
      e.certifiedBy = 'בד"ץ בית יוסף';
      changed = true;
    } else if (e.kosherType === 'mehadrin') {
      e.certifiedBy = 'כשר למהדרין';
      changed = true;
    } else if (e.kosherType === 'rabanut' || e.kosherType === 'rabanut_mekomi') {
      e.certifiedBy = 'רבנות מקומית';
      changed = true;
    }
  }
  if (changed) { goldaCount++; }
}
patched += goldaCount;
console.log(`  ✓ patched ${goldaCount} גלידה גולדה entries (website + menu + certifiedBy)`);

// ══════════════════════════════════════════════════════════════════════════════
// פיצה סטורי — mehadrin, בד"ץ בית יוסף
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== פיצה סטורי ===');
const PIZZA_STORY_MENU = 'https://pizza-story.co.il/?page_id=1736';
const PIZZA_STORY_WEBSITE = 'https://pizza-story.co.il';
let psCount = 0;
for (const e of data) {
  if (e.name !== 'פיצה סטורי') continue;
  if (!e.kosherType) e.kosherType = 'badatz_beit_yosef';
  if (!e.certifiedBy) e.certifiedBy = 'בד"ץ בית יוסף';
  if (!e.menu) e.menu = PIZZA_STORY_MENU;
  if (!e.website) e.website = PIZZA_STORY_WEBSITE;
  psCount++;
  console.log('  ✓', e.address || e.cityId);
}
patched += psCount;

// ══════════════════════════════════════════════════════════════════════════════
// New Deli — kosher meat, rabanut (most branches)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== New Deli ===');
const NEW_DELI_MENU = 'https://newdeli.com/%D7%AA%D7%A4%D7%A8%D7%99%D7%98/';
const NEW_DELI_WEBSITE = 'https://newdeli.com';
let ndCount = 0;
for (const e of data) {
  if (e.name !== 'New Deli') continue;
  if (!e.kosherType) e.kosherType = 'rabanut';
  if (!e.certifiedBy) e.certifiedBy = 'כשר';
  if (!e.menu) e.menu = NEW_DELI_MENU;
  if (!e.website) e.website = NEW_DELI_WEBSITE;
  ndCount++;
  console.log('  ✓', e.address || e.cityId);
}
patched += ndCount;

// ══════════════════════════════════════════════════════════════════════════════
// פיצה מילאנו — 4 independent branches, different certifications
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== פיצה מילאנו ===');
const milanoPatches = [
  { addr: 'בן גוריון 3', city: 'רעננה',      kosherType: 'other',   certifiedBy: 'בד"ץ יורה דעה' },
  { addr: 'הרצל 45',    city: 'רמלה',         kosherType: 'other',   certifiedBy: 'בד"ץ יורה דעה' },
  { addr: 'העצמאות 37', city: 'קריית אתא',    kosherType: 'mehadrin', certifiedBy: 'העדה החרדית' },
  { addr: 'אייס מול',   city: 'אילת',          kosherType: 'rabanut', certifiedBy: 'רבנות אילת' },
];
let milanoCount = 0;
for (const { addr, city, kosherType, certifiedBy } of milanoPatches) {
  const e = data.find(d =>
    d.name === 'פיצה מילאנו' &&
    ((d.address && d.address.includes(addr)) || (d.cityId === city))
  );
  if (!e) { console.warn('  ⚠ not found:', addr, city); continue; }
  if (!e.kosherType) e.kosherType = kosherType;
  if (!e.certifiedBy) e.certifiedBy = certifiedBy;
  milanoCount++;
  console.log('  ✓', e.address || e.cityId, '-', certifiedBy);
}
patched += milanoCount;

// ── Save ──────────────────────────────────────────────────────────────────────
writeWithBom(DATA_FILE, data);
console.log(`\n✓ Total patched: ${patched} fields. Total entries: ${data.length}`);
