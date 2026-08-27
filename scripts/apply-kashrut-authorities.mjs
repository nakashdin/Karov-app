/**
 * Apply the canonical kashrut authority registry (scripts/reports/kashrut-registry.json)
 * to places.osm.json, resolving free-text `certifiedBy` values to a controlled
 * `certifierId` vocabulary (src/data/kashrut/authorities.ts).
 *
 * These are religious-safety rules, not style preferences:
 *
 *   a. Match `certifiedBy` to `alias.raw` by EXACT string equality. No
 *      normalization, no fuzzy matching, no trimming.
 *   b. Set `certifierId` from the alias. When `alias.authorityId` is null,
 *      set `certifierId: null` — a real, meaningful value meaning "level
 *      known, authority not identified." Never omit the field on a match.
 *   c. Set `kosherLevel` from `alias.level` ONLY when the record has no
 *      `kosherLevel` today. Never overwrite an existing level.
 *   d. Set `kosherAuthorityGroup` from the resolved authority's `group` ONLY
 *      when the record is currently 'unknown' or absent, AND `certifierId`
 *      is non-null. A level-only string leaves the group at unknown,
 *      permanently — that is correct, not a gap.
 *   e. Never touch a record whose `certifiedBy` is in `reviewQueue`.
 *   f. Never upgrade a level; never invent one not stated by the alias.
 *   g. Additive only. Never touch `certificateValidUntil` or any other field.
 *
 * Usage:
 *   node scripts/apply-kashrut-authorities.mjs                 # dry-run + report (default)
 *   node scripts/apply-kashrut-authorities.mjs --report out.json
 *   node scripts/apply-kashrut-authorities.mjs --apply         # writes certifierId/kosherLevel/kosherAuthorityGroup only
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordKashrutWrite } from './shared/kashrut-write.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLACES = resolve(root, 'src/data/generated/places.osm.json');
const REGISTRY = resolve(root, 'scripts/reports/kashrut-registry.json');

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const REPORT_PATH = argv.includes('--report') ? argv[argv.indexOf('--report') + 1] : null;

const FOOD_TYPES = new Set([
  'restaurant', 'fast_food', 'cafe', 'coffee_cart',
  'juice_bar', 'ice_cream_parlor', 'bakery', 'winery',
]);

// ── load ────────────────────────────────────────────────────────────────────

const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
const authorityIds = new Set(registry.authorities.map((a) => a.id));
const groupById = new Map(registry.authorities.map((a) => [a.id, a.group]));

/** raw → { authorityId, level } — exact-string keys only. */
const aliasMap = new Map(registry.aliases.map((a) => [a.raw, { authorityId: a.authorityId, level: a.level }]));
const reviewQueueRaws = new Set(registry.reviewQueue.map((r) => r.raw));

// Registry self-check: no alias raw is also a reviewQueue raw (would be ambiguous which rule applies).
const overlap = [...aliasMap.keys()].filter((raw) => reviewQueueRaws.has(raw));
if (overlap.length) {
  console.error(`✗ registry defect: ${overlap.length} raw value(s) appear in BOTH aliases and reviewQueue:`);
  overlap.slice(0, 10).forEach((r) => console.error(`   ${r}`));
  process.exit(1);
}

const original = JSON.parse(readFileSync(PLACES, 'utf8'));
const places = JSON.parse(readFileSync(PLACES, 'utf8')); // separate parse — never share references with `original`
const beforeIds = original.map((p) => String(p.id));
const beforeCount = original.length;

// ── apply rules, in memory, regardless of --apply ─────────────────────────

let matchedAlias = 0;
let certifierIdNonNull = 0;
let certifierIdNull = 0;
let kosherLevelSet = 0;
let kosherAuthorityGroupSet = 0;
let reviewQueueSkipped = 0;
let noCertifiedBy = 0;
let noAliasMatch = 0;
const noAliasMatchSamples = [];
// Every write below routes through the B1.4 choke point instead of a direct
// `p.field =` assignment — this was the one path apply-kashrut-authorities.mjs
// still bypassed after Batch B1, and it is the script that will perform the
// actual Batch B dataset write, so it is the one bypass that matters most to
// close first (KASHRUT_FACTS §16). basis: 'registry-alias' for all three
// fields, citing the SAME alias entry this script already resolved from the
// registry — recordKashrutWrite re-verifies aliasLevel against the registry
// itself (not just this script's own copy of it) before allowing a
// level-asserting kosherLevel write through. A thrown violation here is
// treated as a problem, not a crash: it is recorded and the run refuses to
// write, exactly like every other check in this file's verification pass.
const helperViolations = [];

for (const p of places) {
  if (!p.certifiedBy) {
    noCertifiedBy++;
    continue;
  }
  if (reviewQueueRaws.has(p.certifiedBy)) {
    reviewQueueSkipped++;
    continue;
  }
  const alias = aliasMap.get(p.certifiedBy);
  if (!alias) {
    noAliasMatch++;
    if (noAliasMatchSamples.length < 20) noAliasMatchSamples.push({ id: p.id, certifiedBy: p.certifiedBy });
    continue;
  }

  const basis = { kind: 'registry-alias', alias: p.certifiedBy, aliasLevel: alias.level };
  try {
    matchedAlias++;
    recordKashrutWrite(p, 'certifierId', alias.authorityId, basis); // rule b — set even when null

    if (alias.authorityId === null) certifierIdNull++;
    else certifierIdNonNull++;

    if (alias.level && !p.kosherLevel) {
      recordKashrutWrite(p, 'kosherLevel', alias.level, basis); // rule c
      kosherLevelSet++;
    }

    if (alias.authorityId !== null) {
      const group = groupById.get(alias.authorityId);
      if (group && (p.kosherAuthorityGroup === undefined || p.kosherAuthorityGroup === 'unknown')) {
        recordKashrutWrite(p, 'kosherAuthorityGroup', group, basis); // rule d
        kosherAuthorityGroupSet++;
      }
    }
  } catch (err) {
    helperViolations.push(`${p.id}: recordKashrutWrite refused a write — ${err.message}`);
  }
}

// ── verification (runs on the in-memory proposed state, dry-run or not) ────

const problems = [...helperViolations];

if (places.length !== beforeCount) {
  problems.push(`record count changed: ${beforeCount} → ${places.length}`);
}

const afterIds = places.map((p) => String(p.id));
if (afterIds.length !== beforeIds.length || afterIds.some((id, i) => id !== beforeIds[i])) {
  problems.push('id list changed (order or membership) — must be byte-identical');
}

const origById = new Map(original.map((p) => [String(p.id), p]));
const ALLOWED_DIFF_FIELDS = new Set(['certifierId', 'kosherLevel', 'kosherAuthorityGroup']);

let reviewQueueTouched = 0;
let nullCertifierGroupChanged = 0;
let unregisteredCertifierId = 0;
let levelUpgraded = 0;
let certEvidenceMoved = 0;
const CRITICAL = []; // level-upgrade violations — surfaced separately, refuses the write on their own

for (const p of places) {
  const o = origById.get(String(p.id));
  if (!o) {
    problems.push(`${p.id}: not present before`);
    continue;
  }

  const allKeys = new Set([...Object.keys(o), ...Object.keys(p)]);
  for (const k of allKeys) {
    const same = JSON.stringify(o[k]) === JSON.stringify(p[k]);
    if (!same && !ALLOWED_DIFF_FIELDS.has(k)) {
      problems.push(`${p.id}: field "${k}" changed but is not in the allowed set (certifierId/kosherLevel/kosherAuthorityGroup)`);
    }
  }

  if (o.certifiedBy && reviewQueueRaws.has(o.certifiedBy)) {
    const changed = [...allKeys].some((k) => JSON.stringify(o[k]) !== JSON.stringify(p[k]));
    if (changed) {
      reviewQueueTouched++;
      problems.push(`${p.id}: certifiedBy is in reviewQueue ("${o.certifiedBy}") but the record was modified`);
    }
  }

  if (p.certifierId === null && JSON.stringify(o.kosherAuthorityGroup) !== JSON.stringify(p.kosherAuthorityGroup)) {
    nullCertifierGroupChanged++;
    problems.push(`${p.id}: certifierId is null but kosherAuthorityGroup changed (${JSON.stringify(o.kosherAuthorityGroup)} → ${JSON.stringify(p.kosherAuthorityGroup)})`);
  }

  if (p.certifierId != null && !authorityIds.has(p.certifierId)) {
    unregisteredCertifierId++;
    problems.push(`${p.id}: certifierId "${p.certifierId}" does not exist in the registry`);
  }

  // CHECK 7 — no level upgrade. Rules (c)/(f) only ever set kosherLevel when it
  // was absent, so this should be an emergent impossibility; assert it directly
  // anyway, because an inflated kashrut level shipped to a user is unfixable harm.
  if (o.kosherLevel && p.kosherLevel !== o.kosherLevel) {
    levelUpgraded++;
    const msg = `${p.id}: CRITICAL — kosherLevel changed from an existing value "${o.kosherLevel}" to "${p.kosherLevel}"`;
    CRITICAL.push(msg);
    problems.push(msg);
  }

  // CHECK 8 — certificate evidence untouched. certifiedBy is the raw evidence
  // the whole mapping derives from; certificateValidUntil belongs to kosher-app-38.
  if (JSON.stringify(o.certifiedBy) !== JSON.stringify(p.certifiedBy) ||
      JSON.stringify(o.certificateValidUntil) !== JSON.stringify(p.certificateValidUntil)) {
    certEvidenceMoved++;
    problems.push(`${p.id}: certifiedBy or certificateValidUntil moved — must be byte-identical before/after`);
  }
}

// ── report ──────────────────────────────────────────────────────────────────

const foodTotal = places.filter((p) => FOOD_TYPES.has(p.type)).length;

console.log('\n=== kashrut authority apply — ' + (APPLY ? 'APPLY' : 'DRY RUN') + ' ===\n');
console.log(`  records total          : ${beforeCount}`);
console.log(`  food records           : ${foodTotal}`);
console.log(`  records with certifiedBy: ${beforeCount - noCertifiedBy}`);
console.log('');
console.log(`  matched an alias       : ${matchedAlias}`);
console.log(`    → certifierId set (authority known) : ${certifierIdNonNull}`);
console.log(`    → certifierId set to null (level-only or no-info) : ${certifierIdNull}`);
console.log(`  kosherLevel newly set  : ${kosherLevelSet}`);
console.log(`  kosherAuthorityGroup newly set : ${kosherAuthorityGroupSet}`);
console.log('');
console.log(`  skipped — reviewQueue  : ${reviewQueueSkipped}  (left exactly as-is)`);
console.log(`  skipped — no certifiedBy: ${noCertifiedBy}`);
console.log(`  skipped — no exact alias match : ${noAliasMatch}  (should be 0 — registry claims full coverage of distinct raws)`);
if (noAliasMatchSamples.length) {
  console.log('    samples:');
  noAliasMatchSamples.forEach((s) => console.log(`      ${s.id}: "${s.certifiedBy}"`));
}

console.log('\n  --- ACCEPTANCE CHECKS ---');
console.log(`  record count unchanged        : ${places.length === beforeCount ? 'OK' : 'FAIL'} (${beforeCount} → ${places.length})`);
console.log(`  id list byte-identical, in order: ${afterIds.length === beforeIds.length && afterIds.every((id, i) => id === beforeIds[i]) ? 'OK' : 'FAIL'}`);
console.log(`  only certifierId/kosherLevel/kosherAuthorityGroup differ : ${problems.filter((m) => m.includes('is not in the allowed set')).length === 0 ? 'OK' : 'FAIL'}`);
console.log(`  0 reviewQueue records modified : ${reviewQueueTouched === 0 ? 'OK' : `FAIL (${reviewQueueTouched})`}`);
console.log(`  0 null-certifierId records had group changed : ${nullCertifierGroupChanged === 0 ? 'OK' : `FAIL (${nullCertifierGroupChanged})`}`);
console.log(`  every non-null certifierId exists in registry : ${unregisteredCertifierId === 0 ? 'OK' : `FAIL (${unregisteredCertifierId})`}`);
console.log(`  NO LEVEL UPGRADE (regular→mehadrin or any change to an existing level) : ${levelUpgraded === 0 ? 'OK' : `CRITICAL FAIL (${levelUpgraded})`}`);
console.log(`  certifiedBy / certificateValidUntil byte-identical : ${certEvidenceMoved === 0 ? 'OK' : `FAIL (${certEvidenceMoved})`}`);
console.log(`  0 recordKashrutWrite refusals : ${helperViolations.length === 0 ? 'OK' : `FAIL (${helperViolations.length})`}`);

if (CRITICAL.length) {
  console.error('\n  ⚠ CRITICAL — level upgrade detected, refusing regardless of --apply:');
  CRITICAL.forEach((m) => console.error('    ' + m));
}

const report = {
  mode: APPLY ? 'APPLY' : 'DRY RUN',
  totals: {
    records: beforeCount,
    foodRecords: foodTotal,
    withCertifiedBy: beforeCount - noCertifiedBy,
    matchedAlias,
    certifierIdNonNull,
    certifierIdNull,
    kosherLevelSet,
    kosherAuthorityGroupSet,
    reviewQueueSkipped,
    noCertifiedBy,
    noAliasMatch,
  },
  noAliasMatchSamples,
  acceptance: {
    recordCountUnchanged: places.length === beforeCount,
    idListByteIdentical: afterIds.length === beforeIds.length && afterIds.every((id, i) => id === beforeIds[i]),
    onlyAllowedFieldsDiffer: problems.filter((m) => m.includes('is not in the allowed set')).length === 0,
    reviewQueueUntouched: reviewQueueTouched === 0,
    nullCertifierGroupUnchanged: nullCertifierGroupChanged === 0,
    allCertifierIdsRegistered: unregisteredCertifierId === 0,
    noLevelUpgrade: levelUpgraded === 0,
    certEvidenceUntouched: certEvidenceMoved === 0,
    noHelperViolations: helperViolations.length === 0,
  },
  critical: CRITICAL,
  problems: problems.slice(0, 200),
  problemCount: problems.length,
};

if (REPORT_PATH) {
  mkdirSync(dirname(resolve(root, REPORT_PATH)), { recursive: true });
  writeFileSync(resolve(root, REPORT_PATH), JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n  report → ${REPORT_PATH}`);
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} verification problem(s) — see report for full list. Refusing to write.`);
}

// ── apply ───────────────────────────────────────────────────────────────────

if (!APPLY) {
  console.log('\n(dry run — nothing written. Re-run with --apply to write certifierId/kosherLevel/kosherAuthorityGroup.)\n');
  process.exit(problems.length ? 1 : 0);
}

if (problems.length) {
  console.error('\n✗ REFUSING TO WRITE — verification failed.\n');
  process.exit(1);
}

const backupDir = join(root, 'data-backups', 'kashrut-authorities');
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = join(backupDir, `places.osm.${stamp}.json`);
copyFileSync(PLACES, backupPath);

writeFileSync(PLACES, JSON.stringify(places), 'utf8');
console.log(`\n✓ wrote certifierId/kosherLevel/kosherAuthorityGroup on ${matchedAlias} records.`);
console.log(`  verification: ${beforeCount} records in, ${places.length} out; id list identical; only the three allowed fields changed.`);
console.log(`  backup: ${backupPath}\n`);
