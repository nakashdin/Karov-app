// Migration: add kosherLevel, kosherAuthorityGroup, kosherAuthority to all places.
// Does NOT modify kosherType. Based only on kosherType values actually present in data.
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../src/data/generated/places.osm.json');

let raw = readFileSync(dataPath, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const places = JSON.parse(raw);

// Approved mapping — only types present in actual data.
// authority: null = group is known but specific body is not.
const MAP = {
  rabanut:                    { kosherLevel: 'regular',  kosherAuthorityGroup: 'rabbinate',   kosherAuthority: null },
  rabanut_mekomi:             { kosherLevel: 'regular',  kosherAuthorityGroup: 'rabbinate',   kosherAuthority: null },
  rabanut_tel_aviv:           { kosherLevel: 'regular',  kosherAuthorityGroup: 'rabbinate',   kosherAuthority: 'rabbinate_tel_aviv' },
  rabanut_mehadrin:           { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'rabbinate',   kosherAuthority: null },
  rabanut_mehadrin_jerusalem: { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'rabbinate',   kosherAuthority: 'rabbinate_jerusalem' },
  kosher:                     { kosherLevel: 'regular',  kosherAuthorityGroup: 'unknown',     kosherAuthority: null },
  mehadrin:                   { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'unknown',     kosherAuthority: null },
  badatz_beit_yosef:          { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz',      kosherAuthority: 'badatz_beit_yosef' },
  badatz_edah:                { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz',      kosherAuthority: 'badatz_edah_hachareidis' },
  badatz_kehilot:             { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz',      kosherAuthority: 'badatz_kehilot' },
  badatz_rubin:               { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz',      kosherAuthority: 'badatz_rubin' },
  rav_machpud:                { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz',      kosherAuthority: 'yoreh_deah_mahfoud' },
  chatam_sofer:               { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz',      kosherAuthority: 'chatam_sofer' },
  tzohar:                     { kosherLevel: 'regular',  kosherAuthorityGroup: 'independent', kosherAuthority: 'tzohar' },
};

const counts = { enriched: 0, noKosherType: 0, unmapped: 0 };

const updated = places.map(place => {
  if (!place.kosherType) {
    counts.noKosherType++;
    return place;
  }
  const meta = MAP[place.kosherType];
  if (!meta) {
    counts.unmapped++;
    console.warn(`  WARN: unmapped kosherType "${place.kosherType}" on "${place.name}"`);
    return place;
  }
  counts.enriched++;
  return {
    ...place,
    kosherLevel: meta.kosherLevel,
    kosherAuthorityGroup: meta.kosherAuthorityGroup,
    kosherAuthority: meta.kosherAuthority,
  };
});

writeFileSync(dataPath, JSON.stringify(updated), 'utf8');

console.log('\n── Migration complete ──────────────────────────────');
console.log(`  Enriched:         ${counts.enriched}`);
console.log(`  No kosherType:    ${counts.noKosherType}`);
console.log(`  Unmapped (warn):  ${counts.unmapped}`);
console.log(`  Total:            ${places.length}`);

// Spot-check: print one record per kosherType to verify
console.log('\n── Spot-check (one per kosherType) ─────────────────');
const seen = new Set();
for (const p of updated) {
  if (!p.kosherType || seen.has(p.kosherType)) continue;
  seen.add(p.kosherType);
  console.log(
    `  ${String(p.kosherType).padEnd(28)}` +
    `level: ${String(p.kosherLevel).padEnd(10)}` +
    `group: ${String(p.kosherAuthorityGroup).padEnd(14)}` +
    `authority: ${String(p.kosherAuthority)}`
  );
}
