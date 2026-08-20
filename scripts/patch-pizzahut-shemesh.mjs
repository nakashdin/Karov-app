/**
 * Patch קפה גרג kashrut + menu for all Pizza Hut and Pizza Shemesh branches.
 * Source: official websites (scraped 2026-07-23)
 * Run: node scripts/patch-pizzahut-shemesh.mjs
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
let changed = 0;
let removed = 0;

// ══════════════════════════════════════════════════════════════════════════════
// פיצה האט — menu: https://order.pizzahut.co.il/3/menu
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== פיצה האט ===');
const HATHUT_MENU = 'https://order.pizzahut.co.il/3/menu';

// Add menu to ALL Pizza Hut entries
let hutCount = 0;
for (const e of data) {
  if (e.name === 'פיצה האט') {
    e.menu = HATHUT_MENU;
    hutCount++;
  }
}
console.log(`  ✓ added menu to ${hutCount} Pizza Hut entries`);

// Fix kosher for the 4 specific missing branches
function fixHut(cityId, addressFragment, kosherType, certifiedBy) {
  const e = data.find(d =>
    d.name === 'פיצה האט' &&
    d.cityId === cityId &&
    (!d.kosherType) &&
    (!addressFragment || (d.address && d.address.includes(addressFragment)))
  );
  if (!e) {
    // Try without address fragment
    const fallback = data.find(d => d.name === 'פיצה האט' && d.cityId === cityId && !d.kosherType);
    if (fallback) {
      fallback.kosherType = kosherType;
      fallback.certifiedBy = certifiedBy;
      changed++;
      console.log(`  ✓ kosher patched: ${fallback.address || cityId}`);
    } else {
      console.warn(`  ⚠ not found: ${cityId} ${addressFragment || ''}`);
    }
    return;
  }
  e.kosherType = kosherType;
  e.certifiedBy = certifiedBy;
  changed++;
  console.log(`  ✓ kosher patched: ${e.address || cityId}`);
}

fixHut('קרית שמונה', null, 'badatz_beit_yosef', 'בד"צ בית יוסף');
fixHut('נשר', null, 'rabanut', 'כשר');            // טכניון חיפה — no specific authority listed
fixHut('יוקנעם המושבה', null, 'rabanut_mehadrin', 'רבנות מקומית מהדרין');
fixHut('גבעתיים', null, 'badatz_beit_yosef', 'בד"צ בית יוסף');

// ══════════════════════════════════════════════════════════════════════════════
// פיצה שמש — menu: https://pizza-shemesh.co.il/תפריט/
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n=== פיצה שמש ===');
const SHEMESH_MENU = 'https://pizza-shemesh.co.il/תפריט/';

// Add menu to ALL Pizza Shemesh entries
let shemeshCount = 0;
for (const e of data) {
  if (e.name === 'פיצה שמש') {
    e.menu = SHEMESH_MENU;
    shemeshCount++;
  }
}
console.log(`  ✓ added menu to ${shemeshCount} Pizza Shemesh entries`);

// יהודה הלוי 49, תל אביב — NOT on official website, cannot verify kosher → remove
const shemeshTlvBranch = data.find(e =>
  e.name === 'פיצה שמש' &&
  e.address && e.address.includes('יהודה הלוי')
);
if (shemeshTlvBranch) {
  data = data.filter(e => e !== shemeshTlvBranch);
  removed++;
  console.log('  ✗ removed (not on official site, cannot verify kosher):', shemeshTlvBranch.address);
}

// Fix kosher for the remaining 4 branches
function fixShemesh(cityId, kosherType, certifiedBy) {
  const e = data.find(d => d.name === 'פיצה שמש' && d.cityId === cityId && !d.kosherType);
  if (!e) { console.warn(`  ⚠ not found or already has kosher: ${cityId}`); return; }
  e.kosherType = kosherType;
  e.certifiedBy = certifiedBy;
  changed++;
  console.log(`  ✓ kosher patched: ${e.address || cityId}`);
}

fixShemesh('בת ים', 'badatz_beit_yosef', 'בד"צ בית יוסף');
fixShemesh('שדרות', 'badatz_beit_yosef', 'בד"צ בית יוסף');
fixShemesh('אור יהודה', 'badatz_beit_yosef', 'בד"צ בית יוסף');
fixShemesh('טבריה', 'mehadrin', 'העדה החרדית');

// ── Save ──────────────────────────────────────────────────────────────────────
writeWithBom(DATA_FILE, data);
console.log(`\n✓ Patched ${changed} kosher entries, removed ${removed}, added menu to ${hutCount + shemeshCount} entries.`);
console.log(`  Total entries: ${data.length}`);
