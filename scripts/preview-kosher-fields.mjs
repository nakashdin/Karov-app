// Preview script — does NOT modify any file.
// Shows how the new kosher fields would look for a sample of places.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../src/data/generated/places.osm.json');

let raw = readFileSync(dataPath, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const places = JSON.parse(raw);

// ── Mapping ──────────────────────────────────────────────────────────────────
// Rules:
//  • level:     'regular' | 'mehadrin' | null
//  • authority: known authority key, or null if not determinable
//  • verified:  true only when both level AND authority are known from the type
const MAP = {
  // Rabbinate — regular
  rabanut:                    { level: 'regular',  authority: 'rabbinate',         verified: true },
  rabanut_mekomi:             { level: 'regular',  authority: 'rabbinate',         verified: true },
  rabanut_tel_aviv:           { level: 'regular',  authority: 'rabbinate',         verified: true },
  rabanut_beit_shean:         { level: 'regular',  authority: 'rabbinate',         verified: true },
  rabanut_afula:              { level: 'regular',  authority: 'rabbinate',         verified: true },
  // Generic "kosher" — we know it's at least regular, but not who certified
  kosher:                     { level: 'regular',  authority: null,                verified: false },
  // Rabbinate mehadrin — both level and authority are clear
  rabanut_mehadrin:           { level: 'mehadrin', authority: 'rabbinate',         verified: true },
  rabanut_mehadrin_jerusalem: { level: 'mehadrin', authority: 'rabbinate',         verified: true },
  // "מהדרין" alone — level is clear, but who certified is unknown
  mehadrin:                   { level: 'mehadrin', authority: null,                verified: false },
  // Known Badatz bodies
  badatz_edah:                { level: 'mehadrin', authority: 'badatz_edah',       verified: true },
  badatz_beit_yosef:          { level: 'mehadrin', authority: 'badatz_beit_yosef', verified: true },
  badatz_rubin:               { level: 'mehadrin', authority: 'badatz_rubin',      verified: true },
  badatz_kehilot:             { level: 'mehadrin', authority: 'badatz_kehilot',    verified: true },
  // Known independent authorities
  rav_machpud:                { level: 'mehadrin', authority: 'rav_machpud',       verified: true },
  rav_landa:                  { level: 'mehadrin', authority: 'rav_landa',         verified: true },
  chatam_sofer:               { level: 'mehadrin', authority: 'chatam_sofer',      verified: true },
  // Tzohar — known authority, regular level
  tzohar:                     { level: 'regular',  authority: 'tzohar',            verified: true },
  // other / unknown
  other:                      { level: null,        authority: null,               verified: false },
};

function enrich(place) {
  const meta = MAP[place.kosherType] ?? { level: null, authority: null, verified: false };
  return {
    ...meta,
    // kosherType stays untouched — these are purely additive
  };
}

// ── Pick a diverse sample ─────────────────────────────────────────────────────
// Grab up to 3 places per kosherType so we see every variant.
const byType = {};
for (const p of places) {
  if (!p.kosherType) continue;
  if (!byType[p.kosherType]) byType[p.kosherType] = [];
  if (byType[p.kosherType].length < 3) byType[p.kosherType].push(p);
}

const sample = Object.values(byType).flat();

// ── Print ─────────────────────────────────────────────────────────────────────
console.log(`\nPreview — ${sample.length} records (up to 3 per kosherType)\n`);
console.log('─'.repeat(100));

for (const p of sample) {
  const { level, authority, verified } = enrich(p);
  console.log(
    `name:      ${p.name.padEnd(30)}` +
    `  kosherType: ${String(p.kosherType).padEnd(28)}` +
    `→  level: ${String(level).padEnd(10)}  authority: ${String(authority).padEnd(22)}  verified: ${verified}`
  );
}

console.log('─'.repeat(100));
console.log(`\nTotal places with kosherType in dataset: ${places.filter(p => p.kosherType).length}`);
console.log(`kosherType breakdown:`);
const counts = {};
for (const p of places) counts[p.kosherType ?? '(none)'] = (counts[p.kosherType ?? '(none)'] ?? 0) + 1;
for (const [k, v] of Object.entries(counts).sort((a,b) => b[1]-a[1]))
  console.log(`  ${k.padEnd(32)} ${v}`);
