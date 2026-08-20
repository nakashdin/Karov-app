/**
 * Patch Roladin (רולדין) data:
 * - Remove 10 non-kosher branches ("ללא תעודת כשרות" per official site)
 * - Mark 5 branches as kosher (confirmed by hours/OSM/site)
 * - Add menu URL to all remaining branches
 * Source: https://roladin.co.il/סניפים/ (scraped 2026-07-23)
 * Run: node scripts/patch-roladin.mjs
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

// ── Non-kosher branches to REMOVE (confirmed "ללא תעודת כשרות") ────────────
const REMOVE = [
  { addr: 'יהודה מכבי 57',  city: 'תל אביב'      },
  { addr: 'ברודצקי 43',     city: 'תל אביב'      },
  { addr: 'יוסי שריד 11',   city: 'הרצליה'        },
  { addr: 'דיזנגוף 50',     city: 'תל אביב'      },
  { addr: 'נחום חת 5',      city: 'חיפה'         },  // actually in טירת הכרמל per site
  { addr: 'בן גוריון 113',  city: 'בת ים'        },
  { addr: 'סוקולוב 37',     city: 'רמת השרון'    },
  { addr: 'צבי גרינברג 25', city: 'תל אביב'      },
  { addr: 'אחד העם 62',     city: 'רמת גן'       },
  { addr: 'קניון 7 הכוכבים', city: 'הרצליה'      },  // open all Saturday = not kosher
];

console.log('\n=== רולדין — הסרת סניפים לא כשרים ===');
for (const { addr, city } of REMOVE) {
  const idx = data.findIndex(e =>
    e.name === 'רולדין' &&
    e.address && e.address.includes(addr)
  );
  if (idx === -1) {
    // Fallback: match by city if address not exact
    const idx2 = data.findIndex(e =>
      e.name === 'רולדין' && e.cityId === city &&
      !e.kosherType && !e.certifiedBy
    );
    if (idx2 !== -1) {
      console.log(`  ✗ removed (${city}):`, data[idx2].address);
      data.splice(idx2, 1);
      removed++;
    } else {
      console.warn(`  ⚠ not found: ${addr}, ${city}`);
    }
  } else {
    console.log(`  ✗ removed:`, data[idx].address);
    data.splice(idx, 1);
    removed++;
  }
}

// ── Confirmed kosher branches — add kosherType ────────────────────────────────
const KOSHER_PATCHES = [
  { addr: 'מעלה כמון',    city: 'נחף',           kosherType: 'kosher', certifiedBy: 'כשר' },
  { addr: null,            city: 'קריית מאיר',   kosherType: 'kosher', certifiedBy: 'כשר',
    matchFn: e => e.name === 'רולדין' && e.cityId === 'קריית מאיר' && !e.kosherType },
  { addr: 'שדרות נים 3',  city: 'ראשון לציון',  kosherType: 'kosher', certifiedBy: 'כשר' },
  { addr: 'סוקולוב 10',   city: 'הוד השרון',    kosherType: 'kosher', certifiedBy: 'כשר' },
  { addr: 'טום לנטוס 26', city: 'נתניה',         kosherType: 'kosher', certifiedBy: 'כשר' },
];

console.log('\n=== רולדין — עדכון כשרות ===');
for (const p of KOSHER_PATCHES) {
  const e = p.matchFn
    ? data.find(p.matchFn)
    : data.find(d => d.name === 'רולדין' && d.address && d.address.includes(p.addr));
  if (!e) { console.warn(`  ⚠ not found: ${p.addr || p.city}`); continue; }
  e.kosherType = p.kosherType;
  e.certifiedBy = p.certifiedBy;
  patched++;
  console.log(`  ✓ kosher marked:`, e.address || p.city);
}

// ── Add menu URL to ALL remaining Roladin entries ─────────────────────────────
const ROLADIN_MENU = 'https://www.roladin.co.il/המוצרים-שלנו/';
let menuCount = 0;
for (const e of data) {
  if (e.name === 'רולדין') {
    e.menu = ROLADIN_MENU;
    menuCount++;
  }
}
console.log(`\n=== רולדין — תפריט ===`);
console.log(`  ✓ added menu to ${menuCount} entries`);

// ── Save ──────────────────────────────────────────────────────────────────────
writeWithBom(DATA_FILE, data);
console.log(`\n✓ Removed ${removed} non-kosher, patched ${patched} kosher, menu added to ${menuCount}.`);
console.log(`  Roladin remaining: ${data.filter(e => e.name === 'רולדין').length}`);
console.log(`  Total entries: ${data.length}`);
