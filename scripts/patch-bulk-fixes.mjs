/**
 * Bulk fixes:
 * 1. Remove BBB נחף (open on Shabbat → not kosher)
 * 2. Fix פיצה פצץ: 2 entries missing kosherType
 * 3. Fix OSM English duplicates: McDonald's מקדונלד'ס, Hummus Elihau, Golda, Cofix
 * 4. Fix קפה לנדוור בני ברק: mehadrin
 * 5. Set Papa John's + דומינוס: kosher from osmKosher tag
 * 6. Add menu URLs for bulk chains: חומוס אליהו*, בורגרס בר*, דבוש שווארמה*,
 *    שיפודי ציפורה*, לחם בשר*, אגאדיר*, BBB *, חומוס ברדיצ'ב*
 * Run: node scripts/patch-bulk-fixes.mjs
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
let patched = 0;
let removed = 0;

// ── 1. Remove BBB נחף — open on Shabbat (Th-Sa 11:30-00:00) ────────────────
{
  const idx = data.findIndex(e => e.name === 'BBB' && e.cityId === 'נחף');
  if (idx !== -1) {
    console.log('✗ BBB נחף removed (open Shabbat)');
    data.splice(idx, 1); removed++;
  }
}

// ── 2. פיצה פצץ — add kosherType from certifiedBy ────────────────────────────
for (const e of data) {
  if (e.name !== 'פיצה פצץ' || e.kosherType) continue;
  if (e.certifiedBy === 'רבנות נתניה') {
    e.kosherType = 'rabanut'; patched++;
    console.log('✓ פיצה פצץ נתניה → rabanut');
  } else if (e.certifiedBy === 'כשר למהדרין') {
    e.kosherType = 'mehadrin'; patched++;
    console.log('✓ פיצה פצץ ראשל"צ → mehadrin');
  }
}

// ── 3. OSM English duplicates ─────────────────────────────────────────────────
// McDonald's מקדונלד'ס שוהם
{
  const e = data.find(x => x.name === "McDonald's מקדונלד'ס");
  if (e) {
    e.kosherType = 'kosher';
    e.certifiedBy = 'כשר';
    e.website = e.website || 'https://www.mcdonalds.co.il';
    e.menu = e.menu || 'https://www.mcdonalds.co.il/%D7%9E%D7%94_%D7%91%D7%AA%D7%A4%D7%A8%D7%99%D7%98/%D7%9E%D7%95%D7%A6%D7%A8%D7%99%D7%9D_%D7%91%D7%95%D7%93%D7%93%D7%99%D7%9D';
    patched++;
    console.log("✓ McDonald's מקדונלד'ס שוהם → kosher");
  }
}

// Hummus Elihau נוה ימין → mehadrin (same chain as חומוס אליהו)
{
  const e = data.find(x => x.name === 'Hummus Elihau');
  if (e) {
    e.kosherType = 'mehadrin';
    e.certifiedBy = 'הרב לנדא';
    e.website = e.website || 'https://www.humus-eli-yahoo.com';
    e.menu = e.menu || 'https://www.humus-eli-yahoo.com/menu/';
    patched++;
    console.log('✓ Hummus Elihau נוה ימין → mehadrin');
  }
}

// Golda גיבתון → kosher (parve ice cream chain)
{
  const e = data.find(x => x.name === 'Golda');
  if (e) {
    e.kosherType = 'kosher';
    e.certifiedBy = 'כשר';
    e.website = e.website || 'https://www.goldaglida.co.il';
    e.menu = e.menu || 'https://www.goldaglida.co.il/flavours';
    patched++;
    console.log('✓ Golda גיבתון → kosher');
  }
}

// Cofix חולון → mehadrin (chain standard)
{
  const e = data.find(x => x.name === 'Cofix');
  if (e) {
    e.kosherType = 'mehadrin';
    e.certifiedBy = 'בד"ץ מהדרין';
    e.website = e.website || 'https://cofix.co.il';
    patched++;
    console.log('✓ Cofix חולון → mehadrin');
  }
}

// ── 4. קפה לנדוור בני ברק → mehadrin ─────────────────────────────────────────
{
  const e = data.find(x => x.name === 'קפה לנדוור');
  if (e) {
    e.kosherType = 'mehadrin';
    e.certifiedBy = 'כשר למהדרין';
    e.website = e.website || 'https://www.landwercafe.co.il';
    patched++;
    console.log('✓ קפה לנדוור בני ברק → mehadrin');
  }
}

// ── 5. Papa John's + דומינוס → kosher (OSM tag) ──────────────────────────────
{
  const pj = data.find(x => x.name === "Papa John's");
  if (pj && !pj.kosherType) {
    pj.kosherType = 'kosher';
    pj.certifiedBy = 'כשר';
    patched++;
    console.log("✓ Papa John's → kosher (osm)");
  }
  const dom = data.find(x => x.name === 'דומינוס');
  if (dom && !dom.kosherType) {
    dom.kosherType = 'kosher';
    dom.certifiedBy = 'כשר';
    patched++;
    console.log('✓ דומינוס כרמיאל → kosher (osm)');
  }
}

// ── 6. Bulk menu additions for named-branch chains ────────────────────────────
const CHAIN_MENUS = [
  // prefix (startsWith match) → menu URL
  { prefix: 'חומוס אליהו ',    menu: 'https://www.humus-eli-yahoo.com/menu/' },
  { prefix: 'בורגרס בר ',      menu: 'https://www.burgersbar.co.il/category/%D7%AA%D7%A4%D7%A8%D7%99%D7%98/' },
  { prefix: 'דבוש שווארמה ',   menu: 'https://www.dabush.co.il/%D7%AA%D7%A4%D7%A8%D7%99%D7%98/' },
  { prefix: 'שיפודי ציפורה ',  menu: 'https://tsiporagroup.co.il/%D7%AA%D7%A4%D7%A8%D7%99%D7%98/' },
  { prefix: 'אגאדיר ',         menu: 'https://agadirkosher.com/menu/' },
  { prefix: 'חומוס ברדיצ\'ב ', menu: 'https://hummusbardichev.co.il/menu/' },
  { prefix: 'BBB ',            menu: 'https://burgus.co.il/menu/' },
  { prefix: 'לחם בשר ',        menu: 'https://lechembasartlv.co.il/menu/' },
];

for (const { prefix, menu } of CHAIN_MENUS) {
  let count = 0;
  for (const e of data) {
    if (e.name.startsWith(prefix) && !e.menu) {
      e.menu = menu;
      count++;
    }
  }
  if (count > 0) {
    console.log(`✓ ${prefix.trim()}: menu added to ${count} entries`);
    patched += count;
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────
writeWithBom(DATA_FILE, data);
console.log(`\n✓ Done. Removed: ${removed}, patched: ${patched}. Total: ${data.length}`);
