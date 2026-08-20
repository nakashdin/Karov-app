/**
 * Patch small chains with kosherType, certifiedBy, website, menu:
 * קרנף, ג'פניקה, קופיקס, בורגרס בר, השניצליה, PokeShop,
 * קצפת, אצה, קפה גן סיפור, דבוש
 * Source: agent web research 2026-07-23
 * Run: node scripts/patch-small-chains.mjs
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

function patch(e, fields) {
  if (!e) return;
  Object.assign(e, fields);
  patched++;
}

// ── קרנף גליל ים — rabanut, confirmed by Herzliya Religious Council ─────────
console.log('\n=== קרנף ===');
patch(
  data.find(e => e.name === 'קרנף' && e.cityId === 'גליל ים'),
  { kosherType: 'rabanut', certifiedBy: 'רבנות הרצליה' }
);
console.log('  ✓ קרנף גליל ים — rabanut');

// ── ג'פניקה ראש פינה — mehadrin, confirmed by Wolt + easy.co.il ─────────────
console.log('\n=== ג\'פניקה ===');
patch(
  data.find(e => e.name === "ג'פניקה" && e.cityId === 'ראש פינה'),
  {
    kosherType: 'mehadrin',
    certifiedBy: 'כשר למהדרין',
    menu: 'https://japanika.net/menu/',
    website: 'https://japanika.net',
  }
);
console.log('  ✓ ג\'פניקה ראש פינה — mehadrin');

// ── קופיקס — mehadrin (בד"ץ מהדרין, post-2019) ───────────────────────────────
console.log('\n=== קופיקס ===');
for (const e of data) {
  if (e.name !== 'קופיקס') continue;
  patch(e, {
    kosherType: 'mehadrin',
    certifiedBy: 'בד"ץ מהדרין',
    website: 'https://cofix.co.il',
  });
  console.log('  ✓', e.address || e.cityId);
}

// ── בורגרס בר — mehadrin ────────────────────────────────────────────────────
console.log('\n=== בורגרס בר ===');
for (const e of data) {
  if (e.name !== 'בורגרס בר') continue;
  patch(e, {
    kosherType: 'mehadrin',
    certifiedBy: 'רבנות מהדרין',
    website: 'https://www.burgersbar.co.il',
    menu: 'https://www.burgersbar.co.il/category/%D7%AA%D7%A4%D7%A8%D7%99%D7%98/',
  });
  console.log('  ✓', e.address || e.cityId);
}

// ── השניצליה — rabanut ───────────────────────────────────────────────────────
console.log('\n=== השניצליה ===');
for (const e of data) {
  if (e.name !== 'השניצליה') continue;
  patch(e, {
    kosherType: 'rabanut',
    certifiedBy: 'רבנות מקומית',
    menu: 'https://order.hashnizelia.co.il/branchespage/hashnizelia',
    website: e.website || 'https://hashnizelia.co.il',
  });
  console.log('  ✓', e.address || e.cityId);
}

// ── PokeShop — rabanut ───────────────────────────────────────────────────────
console.log('\n=== PokeShop ===');
for (const e of data) {
  if (e.name !== 'PokeShop') continue;
  const certifiedBy = e.cityId === 'בני ברק' ? 'רבנות בני ברק' : 'רבנות מקומית';
  patch(e, {
    kosherType: 'rabanut',
    certifiedBy,
    website: 'https://pokeshop.co.il',
  });
  console.log('  ✓', e.address || e.cityId, '-', certifiedBy);
}

// ── קצפת — mehadrin ──────────────────────────────────────────────────────────
console.log('\n=== קצפת ===');
for (const e of data) {
  if (e.name !== 'קצפת') continue;
  patch(e, {
    kosherType: 'mehadrin',
    certifiedBy: 'כשר למהדרין',
    website: 'https://katsefet.co.il',
    menu: 'https://katsefet.co.il/%D7%94%D7%98%D7%A2%D7%9E%D7%99%D7%9D-%D7%A9%D7%9C%D7%A0%D7%95/',
  });
  console.log('  ✓', e.address || e.cityId);
}

// ── אצה — mehadrin (Rav Rubin supervision) ──────────────────────────────────
console.log('\n=== אצה ===');
for (const e of data) {
  if (e.name !== 'אצה') continue;
  patch(e, {
    kosherType: 'mehadrin',
    certifiedBy: 'הרב רובין',
    website: 'https://atza.co.il',
  });
  console.log('  ✓', e.address || e.cityId);
}

// ── קפה גן סיפור ────────────────────────────────────────────────────────────
// ירושלים — confirmed badatz + mehadrin
// ירקונה — unverifiable → remove
console.log('\n=== קפה גן סיפור ===');
{
  const jerusalem = data.find(e => e.name === 'קפה גן סיפור' && e.cityId === 'ירושלים');
  if (jerusalem) {
    patch(jerusalem, {
      kosherType: 'badatz_beit_yosef',
      certifiedBy: 'בד"ץ בית יוסף ורבנות ירושלים מהדרין',
      website: 'https://www.gansipur.co.il',
    });
    console.log('  ✓ ירושלים — badatz_beit_yosef');
  }
  // ירקונה — cannot verify kosher → remove
  const yirkona = data.find(e => e.name === 'קפה גן סיפור' && e.cityId === 'ירקונה');
  if (yirkona) {
    const idx = data.indexOf(yirkona);
    data.splice(idx, 1);
    removed++;
    console.log('  ✗ removed ירקונה (cannot verify kosher status)');
  }
}

// ── דבוש — rabanut meat chain ─────────────────────────────────────────────────
console.log('\n=== דבוש ===');
for (const e of data) {
  if (e.name !== 'דבוש') continue;
  const kosherType = e.cityId === 'בני ברק' ? 'rabanut_mehadrin' : 'rabanut';
  const certifiedBy = e.cityId === 'בני ברק' ? 'רבנות בני ברק מהדרין' : 'רבנות מקומית';
  patch(e, {
    kosherType,
    certifiedBy,
    website: 'https://www.dabush.co.il',
    menu: 'https://www.dabush.co.il/%D7%AA%D7%A4%D7%A8%D7%99%D7%98/',
  });
  console.log('  ✓', e.address || e.cityId, '-', certifiedBy);
}

// ── Save ──────────────────────────────────────────────────────────────────────
writeWithBom(DATA_FILE, data);
console.log(`\n✓ Patched ${patched} entries, removed ${removed}. Total: ${data.length}`);
