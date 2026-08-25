// Migration: add kosherLevel, kosherAuthorityGroup, kosherAuthority to all places.
// Does NOT modify kosherType. Based only on kosherType values actually present in data.
//
// SCOPE LIMITATION — read this before trusting this script's output:
// The reviewQueue guard below only stops this MAP from overwriting a record
// whose certifiedBy is explicitly deferred to human review. It does NOT make
// this MAP safe in general. This script still enriches every record that has
// NO certifiedBy at all: 633 records have no certifiedBy but a kosherType
// this MAP would enrich anyway — the guard cannot see any of them, because
// it only ever checks certifiedBy. A clean run of this script is not proof
// the data is correct; it only means known-disputed certifiedBy values were
// left alone.
//
// The guard is also deliberately CONSERVATIVE, not precise: it blocks all
// writes for every reviewQueue-deferred record, but reviewQueue entries do
// not all defer the same thing. Of the 58 entries, 27 carry a
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
//
// BATCH B1 MIGRATION — the MAP no longer invents a level from an enum alone.
// Every write routes through recordKashrutWrite() with basis
// {kind:'enum-inference', fromKosherType}. enum-inference is unconditionally
// rejected by the choke point for a level-asserting write (kosherLevel:
// 'mehadrin') — that IS the site-A mechanism (FACTS §5b/§13): inferring a
// level purely from which kosherType enum value a record carries, the same
// defect this whole batch exists to stop, previously committed by this exact
// script for 154 of the 358 records now known to carry an invented level.
//
// The three writes are attempted INDEPENDENTLY per field, not atomically per
// record, because the guard only gates kosherLevel — kosherAuthority and
// kosherAuthorityGroup are not level claims, they are body/group claims, and
// for a kosherType that already names a body (e.g. badatz_beit_yosef) they
// recover real identity rather than inventing one (the RECOVER operation,
// not REMOVE — FACTS §4/§8's fabricated-vs-identity-discarding distinction).
// Verified against the live dataset before choosing this over a per-record
// skip: of 2,017 currently-enrichable records, 1,048 are mehadrin-mapped and
// would have their level declined; of THOSE, 327 (259 with a specific named
// authority, 68 with at least a recovered group) still gain real, non-
// invented identity under the per-field design that a blanket per-record
// skip would have discarded for no safety benefit. The remaining 721 are
// bare `mehadrin`/`kosher` types where the MAP itself has nothing to recover
// (group stays 'unknown', authority stays null) — genuinely inert either way.
//
// When kosherLevel is declined, it is written as explicit `null` — not left
// absent — through the same recordKashrutWrite call (null is not a level
// assertion, so the guard does not gate it). This is the B1.3 state exactly:
// "the evidence names an authority but not a level" (place.ts). Leaving it
// absent instead would silently recreate the very ambiguity kosherLevel:
// null exists to resolve (FACTS §5c: absence already conflates "never
// migrated" / "deliberately undetermined" / "genuinely unknown" for 249
// records — this script must not add to that pile now that a real state
// exists for it).
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { recordKashrutWrite } from './shared/kashrut-write.mjs';

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

const counts = {
  enrichedFully: 0,          // regular-level: kosherLevel/kosherAuthorityGroup/kosherAuthority all written
  levelDeclinedIdentityRecovered: 0, // mehadrin-mapped: level -> null, but authority or group carried real info
  levelDeclinedNoRecovery: 0,        // mehadrin-mapped: level -> null, authority/group were inert (unknown/null) anyway
  noKosherType: 0,
  unmapped: 0,
  reviewQueueSkipped: 0,
};
const helperViolations = []; // should stay empty by construction — see header note; not silently trusted

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

  const basis = { kind: 'enum-inference', fromKosherType: place.kosherType };
  const next = { ...place };

  try {
    recordKashrutWrite(next, 'kosherAuthority', meta.kosherAuthority, basis);
    recordKashrutWrite(next, 'kosherAuthorityGroup', meta.kosherAuthorityGroup, basis);
  } catch (err) {
    helperViolations.push(`${place.id} "${place.name}": kosherAuthority/kosherAuthorityGroup — ${err.message}`);
    return place;
  }

  if (meta.kosherLevel === 'mehadrin') {
    // The one write the choke point actually exists to stop: a level
    // inferred purely from the kosherType enum. Write explicit null instead
    // of leaving the field absent — see header note.
    recordKashrutWrite(next, 'kosherLevel', null, basis); // null is never gated — always succeeds
    if (meta.kosherAuthority || meta.kosherAuthorityGroup !== 'unknown') {
      counts.levelDeclinedIdentityRecovered++;
    } else {
      counts.levelDeclinedNoRecovery++;
    }
  } else {
    try {
      recordKashrutWrite(next, 'kosherLevel', meta.kosherLevel, basis);
      counts.enrichedFully++;
    } catch (err) {
      helperViolations.push(`${place.id} "${place.name}": kosherLevel — ${err.message}`);
      return place;
    }
  }

  return next;
});

// Pretty-printed, matching the repo's committed convention for this file —
// a minified rewrite would silently reformat the entire dataset on any real
// run, burying the actual change in a whole-file diff (Phase 1 audit, §D).
writeFileSync(dataPath, JSON.stringify(updated, null, 2), 'utf8');

console.log('\n── Migration complete ──────────────────────────────');
console.log(`  Enriched fully (regular level):        ${counts.enrichedFully}`);
console.log(`  Level declined, identity recovered:    ${counts.levelDeclinedIdentityRecovered}  (authority/group written, kosherLevel -> explicit null)`);
console.log(`  Level declined, no recovery (bare type): ${counts.levelDeclinedNoRecovery}  (kosherLevel -> explicit null only)`);
console.log(`  Skipped (reviewQueue):                 ${counts.reviewQueueSkipped}`);
console.log(`  No kosherType:                         ${counts.noKosherType}`);
console.log(`  Unmapped (warn):                        ${counts.unmapped}`);
console.log(`  recordKashrutWrite refusals:            ${helperViolations.length}  (should be 0 — see header note)`);
console.log(`  Total:                                  ${places.length}`);

if (helperViolations.length) {
  console.log('\n── recordKashrutWrite refusals (unexpected — investigate before trusting this run) ──');
  helperViolations.forEach((m) => console.log(`  ⚠ ${m}`));
}

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
