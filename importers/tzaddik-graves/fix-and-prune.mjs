import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../../src/data/generated/places.osm.json');

const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// ── FIXES: 7 records with clear coordinate corrections ────────
const FIXES = [
  {
    id: 'tzaddik-wikidata-grave-Q5054952',
    name: 'מערת אליהו הנביא',
    lat: 32.8298, lng: 34.9696,
  },
  {
    id: 'tzaddik-wikidata-grave-Q6373413',
    name: 'קבר יונה הנביא',
    lat: 32.7378, lng: 35.3256,
  },
  {
    id: 'tzaddik-wikidata-grave-Q6373556',
    name: 'קבר רבן גמליאל',
    lat: 31.8677, lng: 34.7432,
    wikidataId: 'Q41365933',
    newId: 'tzaddik-wikidata-grave-Q41365933',
  },
  {
    id: 'tzaddik-wikidata-grave-Q12411009',
    name: 'קבר רבי חנינא בן דוסא',
    lat: 32.8486, lng: 35.3358,
  },
  {
    id: 'tzaddik-manual-c14',
    name: 'קבר רבי ישמעאל כהן גדול',
    lat: 32.9384, lng: 35.3437,
  },
  {
    id: 'tzaddik-wikidata-grave-Q12410948',
    name: 'קבר ישי ורות',
    lat: 31.5244, lng: 35.1017,
  },
  {
    id: 'tzaddik-wikidata-grave-Q6373391',
    name: 'קבר כלב בן יפונה',
    lat: 32.1195, lng: 35.1569,
    wikidataId: 'Q56376617',
    newId: 'tzaddik-wikidata-grave-Q56376617',
  },
];

// ── REMOVE: 4 records held for manual review ──────────────────
const REMOVE_IDS = new Set([
  'tzaddik-manual-c06',   // מערת הלל הזקן ותלמידיו
  'tzaddik-wikidata-grave-Q2629985', // קבר רבי יוחנן בן זכאי
  'tzaddik-manual-c12',   // קבר רבי פנחס בן יאיר
  'tzaddik-manual-c16',   // קבר רבי יהושע דסכנין
]);

const report = { fixed: [], removed: [], idRenamed: [] };

// Apply fixes
for (const fix of FIXES) {
  const idx = data.findIndex(p => p.id === fix.id);
  if (idx === -1) { console.error('NOT FOUND:', fix.id); continue; }
  const rec = data[idx];

  // Fix coordinates
  rec.location.latitude  = fix.lat;
  rec.location.longitude = fix.lng;
  rec.lastVerifiedAt = '2026-07-09';

  // Fix wikidataId and rename record ID if needed
  if (fix.wikidataId) {
    if (!rec.extra) rec.extra = {};
    rec.extra.wikidataId = fix.wikidataId;
  }
  if (fix.newId) {
    const oldId = rec.id;
    rec.id = fix.newId;
    report.idRenamed.push({ from: oldId, to: fix.newId, name: fix.name });
  }

  report.fixed.push({
    id: rec.id, name: fix.name,
    lat: fix.lat, lng: fix.lng,
    wikidataId: fix.wikidataId || null,
  });
}

// Remove manual-review records
const before = data.length;
const pruned = data.filter(p => !REMOVE_IDS.has(p.id));
REMOVE_IDS.forEach(id => {
  const rec = data.find(p => p.id === id);
  if (rec) report.removed.push({ id: rec.id, name: rec.name });
});
const afterData = pruned;

fs.writeFileSync(DB_PATH, JSON.stringify(afterData, null, 2), 'utf8');

// ── Counts ────────────────────────────────────────────────────
const tzaddikAll = afterData.filter(p =>
  p.type === 'tzaddik_grave' || (p.tags && p.tags.includes('tzaddik_grave'))
);

console.log('=== תיקונים שבוצעו ===');
report.fixed.forEach(r => {
  const wd = r.wikidataId ? ` | wikidataId→${r.wikidataId}` : '';
  console.log(`  ✅ ${r.name} → ${r.lat}, ${r.lng}${wd}`);
});
report.idRenamed.forEach(r => console.log(`  🔁 ID שונה: ${r.from} → ${r.to}`));

console.log('\n=== הוסרו (manual_review) ===');
report.removed.forEach(r => console.log(`  🗑  ${r.id} — ${r.name}`));

console.log('\n=== מספרים ===');
console.log(`  רשומות לפני: ${before} | אחרי: ${afterData.length}`);
console.log(`  רשומות tzaddik: ${tzaddikAll.length}`);
console.log(`  רשומות חדשות בפאזה זו שנשארו:`);

const FINAL_NEW = [
  'tzaddik-wikidata-grave-Q311703',   // רמח"ל
  'tzaddik-wikidata-grave-Q5054952',  // אליהו
  'tzaddik-wikidata-grave-Q6373413',  // יונה
  'tzaddik-wikidata-grave-Q41365933', // רבן גמליאל (ID תוקן)
  'tzaddik-wikidata-grave-Q12411009', // חנינא בן דוסא
  'tzaddik-manual-c14',               // ישמעאל
  'tzaddik-wikidata-grave-Q12410948', // ישי ורות
  'tzaddik-wikidata-grave-Q56376617', // כלב (ID תוקן)
  'tzaddik-manual-c15',               // שלמה אלקבץ
];
FINAL_NEW.forEach(id => {
  const r = afterData.find(p => p.id === id);
  if (r) console.log(`    + ${r.name} (${r.cityId}) | ${r.location.latitude}, ${r.location.longitude}`);
  else   console.log(`    ❌ NOT FOUND: ${id}`);
});
