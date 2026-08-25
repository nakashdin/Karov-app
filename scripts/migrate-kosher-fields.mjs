// Migration: add kosherLevel, kosherAuthorityGroup, kosherAuthority to all places.
// Does NOT modify kosherType. Based only on kosherType values actually present in data.
//
// SCOPE LIMITATION — read this before trusting this script's output:
// The reviewQueue guard below only stops this MAP from overwriting a record
// whose certifiedBy is explicitly deferred to human review. It does NOT make
// this MAP safe in general. This script still invents kosherLevel/
// kosherAuthorityGroup/kosherAuthority purely from kosherType for every
// record that has NO certifiedBy at all: 633 records have no certifiedBy but
// a kosherType this MAP would enrich anyway — the guard cannot see any of
// them, because it only ever checks certifiedBy. Of those 633, 111 receive a
// specific NAMED authority (a real body, e.g. badatz_beit_yosef) invented
// from the enum alone, with zero identity evidence behind it. A clean run of
// this script is not proof the data is correct; it only means known-disputed
// certifiedBy values were left alone.
//
// The guard is also deliberately CONSERVATIVE, not precise: it blocks all
// three fields for every reviewQueue-deferred record, but reviewQueue
// entries do not all defer the same thing. Of the 58 entries, 27 carry a
// suggestedAuthorityId (12 of those a REGISTERED one) and 11 carry a
// suggestedLevel — some entries defer only the level while a human reviewer
// already confirmed the authority (e.g. raw "כשר בד״ץ בית יוסף": authority
// badatz-beit-yosef confirmed, only the level is disputed). Do NOT read
// "reviewQueue-deferred" as "no authority determination exists" — that is
// false for a real subset of these records and has been misread in both
// directions on this project already. This guard withholds some
// determinations a human already made, in exchange for never inventing one
// that wasn't. That is an accepted tradeoff (accuracy over completeness),
// not an oversight — per-field deferral would recover the rest, but is a
// separate, undesigned follow-on, not part of this guard.
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../src/data/generated/places.osm.json');
const registryPath = join(__dirname, 'reports/kashrut-registry.json');

let raw = readFileSync(dataPath, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const places = JSON.parse(raw);

const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const reviewQueueRaws = new Set(registry.reviewQueue.map((r) => r.raw));

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

const counts = { enriched: 0, noKosherType: 0, unmapped: 0, reviewQueueSkipped: 0 };

const updated = places.map(place => {
  // Never overwrite a record whose certifiedBy the registry has explicitly
  // deferred to human review — that deferral exists precisely because the
  // raw text doesn't cleanly resolve to one authority, and this MAP has no
  // way to know that; it only ever looks at kosherType.
  if (place.certifiedBy && reviewQueueRaws.has(place.certifiedBy)) {
    counts.reviewQueueSkipped++;
    return place;
  }
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

// Pretty-printed, matching the repo's committed convention for this file —
// a minified rewrite would silently reformat the entire dataset on any real
// run, burying the actual change in a whole-file diff (Phase 1 audit, §D).
writeFileSync(dataPath, JSON.stringify(updated, null, 2), 'utf8');

console.log('\n── Migration complete ──────────────────────────────');
console.log(`  Enriched:            ${counts.enriched}`);
console.log(`  Skipped (reviewQueue): ${counts.reviewQueueSkipped}`);
console.log(`  No kosherType:       ${counts.noKosherType}`);
console.log(`  Unmapped (warn):     ${counts.unmapped}`);
console.log(`  Total:               ${places.length}`);

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
