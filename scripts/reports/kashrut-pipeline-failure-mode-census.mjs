/**
 * READ-ONLY census for the Phase 1 kashrut pipeline audit
 * (scripts/reports/kashrut-pipeline-audit-phase1.md, section B/C).
 *
 * Does NOT write src/data/generated/places.osm.json, kashrut-registry.json,
 * or any script. Reads only. Output: scripts/reports/kashrut-pipeline-failure-mode-census.json
 *
 * Classifies every FOOD_TYPES place by how each of its structured kashrut
 * fields (kosherAuthority, kosherLevel, kosherAuthorityGroup) appears to have
 * been established, cross-tabulated per field (never collapsed into one
 * verdict per record) — per the owner's rule that kosherAuthority, kosherLevel,
 * kosherAuthorityGroup, certificate identity, and provenance are separate
 * facts that must not imply one another without an explicit, documented rule.
 *
 * IMPORTANT LIMITATION (stated up front, not discovered after the fact):
 * there is no per-record field recording WHICH script/pass set a given
 * field's current value. This script can only INFER origin by checking
 * whether the record's current field values are BYTE-IDENTICAL to what
 * migrate-kosher-fields.mjs's MAP would produce today from the record's
 * current kosherType (== "looks exactly like the blind kosherType map, and
 * nothing has touched it since") — it cannot prove that's really how the
 * value was set, only that it's consistent with that origin. A hand-edit
 * that happens to match would be indistinguishable. This is itself a
 * Section C finding (evidence tier is not reliably per-record-auditable).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLACES = resolve(root, 'src/data/generated/places.osm.json');
const REGISTRY = resolve(root, 'scripts/reports/kashrut-registry.json');
const AUTHORITIES_TS = resolve(root, 'src/data/kashrut/authorities.ts');

const FOOD_TYPES = new Set([
  'restaurant', 'fast_food', 'cafe', 'coffee_cart',
  'juice_bar', 'ice_cream_parlor', 'bakery', 'winery',
]);

// Exact copy of scripts/migrate-kosher-fields.mjs's MAP — kept identical on
// purpose so "consistent with the blind map" is checked against the real
// mapping, not a paraphrase of it.
const MIGRATE_MAP = {
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
  chatam_sofer:                { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz',      kosherAuthority: 'chatam_sofer' },
  tzohar:                     { kosherLevel: 'regular',  kosherAuthorityGroup: 'independent', kosherAuthority: 'tzohar' },
};

const places = JSON.parse(readFileSync(PLACES, 'utf8').replace(/^﻿/, ''));
const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
const aliasMap = new Map(registry.aliases.map((a) => [a.raw, { authorityId: a.authorityId, level: a.level }]));
const reviewQueueRaws = new Set(registry.reviewQueue.map((r) => r.raw));

const authoritiesSrc = readFileSync(AUTHORITIES_TS, 'utf8');
const registeredIds = new Set([...authoritiesSrc.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]));
if (registeredIds.size !== 81) {
  console.error(`✗ SANITY FAIL: expected 81 registered authority ids, regex found ${registeredIds.size}. Aborting — do not trust output.`);
  process.exit(1);
}

const food = places.filter((p) => FOOD_TYPES.has(p.type));

// ── B: per-record category (owner's categories 1–6) ───────────────────────
const categories = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

function matchesMigrateMap(p) {
  const meta = p.kosherType ? MIGRATE_MAP[p.kosherType] : undefined;
  if (!meta) return false;
  return (
    (p.kosherLevel ?? null) === meta.kosherLevel &&
    (p.kosherAuthorityGroup ?? null) === meta.kosherAuthorityGroup &&
    (p.kosherAuthority ?? null) === meta.kosherAuthority
  );
}

function hasAnyStructuredValue(p) {
  return !!(p.kosherLevel || (p.kosherAuthorityGroup && p.kosherAuthorityGroup !== 'unknown') || p.kosherAuthority);
}

// Categories 1-4 partition strictly on certifiedBy state (mutually exclusive
// by construction — every food record has exactly one of: present+clean-alias,
// present+reviewQueue, present+no-registry-knowledge, or absent). Category 5
// is NOT part of that partition — it is an independent, overlapping
// cross-cut ("does this record assert a level with zero identity evidence"),
// reported separately with its overlap against 1-4 made explicit, rather
// than silently absorbed by an if/else priority order that would hide it.
const registryNullAuthority = []; // certifiedBy resolves, but alias.authorityId is legitimately null (level-known, body-unknown — a real resolved state, not a gap)
const trueNone = []; // no certifiedBy, no kosherType, no structured value at all
const unmappedKosherType = []; // no certifiedBy, kosherType present but genuinely not a MIGRATE_MAP key, no structured value
const staleUnenriched = []; // no certifiedBy, kosherType IS a MIGRATE_MAP key, but structured fields are absent — migration hasn't (re-)run on this record
const reviewQueueCorrectlyBlank = []; // certifiedBy in reviewQueue, and correctly left with no structured value
const noRegistryKnowledgeCorrectlyBlank = []; // certifiedBy unknown to registry, and correctly left with no structured value

for (const p of food) {
  const certifiedBy = p.certifiedBy || null;
  const inReviewQueue = certifiedBy ? reviewQueueRaws.has(certifiedBy) : false;
  const alias = certifiedBy ? aliasMap.get(certifiedBy) : undefined;
  const registryKnowsRaw = inReviewQueue || alias !== undefined;
  const anyStructured = hasAnyStructuredValue(p);

  const row = { id: p.id, name: p.name, certifiedBy, kosherType: p.kosherType ?? null,
    kosherLevel: p.kosherLevel ?? null, kosherAuthorityGroup: p.kosherAuthorityGroup ?? null,
    kosherAuthority: p.kosherAuthority ?? null, certifierId: 'certifierId' in p ? p.certifierId : undefined };

  if (certifiedBy && !inReviewQueue && alias && alias.authorityId && registeredIds.has(alias.authorityId)) {
    categories[1].push(row); // resolves via registry alias, unambiguous, to a REGISTERED body
  } else if (certifiedBy && inReviewQueue) {
    if (anyStructured) categories[2].push(row); // reviewQueue-deferred but structured value populated anyway (the bug)
    else reviewQueueCorrectlyBlank.push(row);
  } else if (certifiedBy && !registryKnowsRaw) {
    if (anyStructured) categories[3].push(row); // registry has no knowledge of this raw string at all, yet structured value populated
    else noRegistryKnowledgeCorrectlyBlank.push(row);
  } else if (certifiedBy && alias && alias.authorityId === null) {
    registryNullAuthority.push(row); // legitimate "level known, body not identified" resolution
  } else if (!certifiedBy) {
    if (p.kosherType && anyStructured) categories[4].push(row); // no certifiedBy, populated purely from legacy kosherType->MAP
    else if (p.kosherType && !anyStructured && MIGRATE_MAP[p.kosherType]) staleUnenriched.push(row);
    else if (p.kosherType && !anyStructured) unmappedKosherType.push(row);
    else if (!p.kosherType && !anyStructured) trueNone.push(row);
    else categories[6].push(row); // no certifiedBy, no kosherType, but somehow structured — hand-set or drift
  } else {
    categories[6].push(row); // catch-all: should be empty if the partition above is exhaustive
  }

  // Independent cross-cut, not part of the 1-4 partition above.
  if (p.kosherLevel && !certifiedBy && !p.kosherAuthority) {
    categories[5].push(row);
  }
}

// ── C: per-field evidence tier, cross-tabulated (never collapsed) ─────────
function fieldTier(p, field) {
  const val = p[field];
  if (val === undefined || val === null) return 'absent';
  const certifiedBy = p.certifiedBy || null;
  const inReviewQueue = certifiedBy ? reviewQueueRaws.has(certifiedBy) : false;
  const alias = certifiedBy ? aliasMap.get(certifiedBy) : undefined;
  const meta = p.kosherType ? MIGRATE_MAP[p.kosherType] : undefined;
  const fromMigrateMap = meta && meta[field] !== undefined && meta[field] !== null && val === meta[field];

  if (certifiedBy && !inReviewQueue && alias && alias.authorityId && field === 'kosherAuthority' && val === alias.authorityId) {
    return 'registry-alias-match'; // exact string equality to a registered alias — highest tier we can claim
  }
  if (fromMigrateMap) {
    return inReviewQueue ? 'kosherType-map-DESPITE-reviewQueue' : 'kosherType-map-only';
  }
  return 'set-but-unexplained'; // present, but neither the registry nor the legacy map account for it — hand-edit, older script, or drift
}

const fieldTiers = { kosherAuthority: {}, kosherLevel: {}, kosherAuthorityGroup: {} };
for (const field of Object.keys(fieldTiers)) {
  for (const p of food) {
    const tier = fieldTier(p, field);
    fieldTiers[field][tier] = (fieldTiers[field][tier] ?? 0) + 1;
  }
}

// certifierId is its own field, separate rollup (not in MIGRATE_MAP at all).
const certifierIdRollup = { absent: 0, null: 0, nonNullRegistered: 0, nonNullUNREGISTERED: 0 };
for (const p of food) {
  if (!('certifierId' in p)) certifierIdRollup.absent++;
  else if (p.certifierId === null) certifierIdRollup.null++;
  else if (registeredIds.has(p.certifierId)) certifierIdRollup.nonNullRegistered++;
  else certifierIdRollup.nonNullUNREGISTERED++;
}

// Also: any place whose kosherType is a MIGRATE_MAP key that is ITSELF a
// disputed/unregistered authority literal (chatam_sofer, badatz_kehilot) —
// i.e. migrate-kosher-fields.mjs asserting an authority independent of, and
// blind to, certifiedBy/reviewQueue status entirely.
const disputedKosherTypeKeys = ['chatam_sofer', 'badatz_kehilot'];
const disputedViaKosherType = food.filter((p) => disputedKosherTypeKeys.includes(p.kosherType));

const out = {
  foodRecordTotal: food.length,
  registeredAuthorityCount: registeredIds.size,
  categoryCounts: Object.fromEntries(Object.entries(categories).map(([k, v]) => [k, v.length])),
  categorySamples: Object.fromEntries(Object.entries(categories).map(([k, v]) => [k, v.slice(0, 15)])),
  registryNullAuthorityCount: registryNullAuthority.length,
  reviewQueueCorrectlyBlankCount: reviewQueueCorrectlyBlank.length,
  noRegistryKnowledgeCorrectlyBlankCount: noRegistryKnowledgeCorrectlyBlank.length,
  unmappedKosherTypeCount: unmappedKosherType.length,
  unmappedKosherTypeSamples: unmappedKosherType.slice(0, 15),
  staleUnenrichedCount: staleUnenriched.length,
  staleUnenrichedSamples: staleUnenriched.slice(0, 15),
  trueNoneCount: trueNone.length,
  partitionCheck: categories[1].length + categories[2].length + categories[3].length + categories[4].length +
    registryNullAuthority.length + reviewQueueCorrectlyBlank.length + noRegistryKnowledgeCorrectlyBlank.length +
    unmappedKosherType.length + staleUnenriched.length + trueNone.length + categories[6].length,
  fieldTiers,
  certifierIdRollup,
  disputedKosherTypeKeys_liveCount: disputedViaKosherType.length,
  disputedKosherTypeKeys_samples: disputedViaKosherType.slice(0, 20).map((p) => ({ id: p.id, name: p.name, kosherType: p.kosherType, certifiedBy: p.certifiedBy, kosherAuthority: p.kosherAuthority })),
};

writeFileSync(resolve(root, 'scripts/reports/kashrut-pipeline-failure-mode-census.json'), JSON.stringify(out, null, 2), 'utf8');

console.log(`food records: ${food.length}`);
console.log('category counts:', out.categoryCounts);
console.log('registryNullAuthority (level-known, body-unknown, legit):', registryNullAuthority.length);
console.log('reviewQueueCorrectlyBlank:', reviewQueueCorrectlyBlank.length);
console.log('noRegistryKnowledgeCorrectlyBlank:', noRegistryKnowledgeCorrectlyBlank.length);
console.log('unmappedKosherType (kosherType present, genuinely NOT in MIGRATE_MAP, no certifiedBy):', unmappedKosherType.length, [...new Set(unmappedKosherType.map(r=>r.kosherType))]);
console.log('staleUnenriched (kosherType IS a MIGRATE_MAP key, but fields never enriched):', staleUnenriched.length, [...new Set(staleUnenriched.map(r=>r.kosherType))]);
console.log('trueNone (no kashrut signal at all):', trueNone.length);
console.log('partitionCheck (should equal foodRecordTotal):', out.partitionCheck, 'vs', food.length);
console.log('field tiers:');
console.log(JSON.stringify(fieldTiers, null, 2));
console.log('certifierId rollup:', certifierIdRollup);
console.log(`disputed kosherType keys (chatam_sofer/badatz_kehilot) live on records: ${disputedViaKosherType.length}`);
