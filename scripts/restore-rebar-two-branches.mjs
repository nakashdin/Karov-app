/**
 * Item 4 (Architect-approved restoration, 2026-08-26). Restores kashrut
 * evidence for the two Rebar branches whose only kashrut field (kosherType:
 * "regular") was silently stripped by commit c4775dd ("ListScreen refactor
 * — לאכול tabs, FilterSheet ≡ with dynamic kashrut, no location mode"), which
 * bundled a disclosed-but-unreviewed "349 kosherType:regular entries removed"
 * data deletion inside an otherwise UI-only commit. Root cause, full commit
 * bisection, and evidence chain reported to the Architect; not reproduced
 * here — see the cross-session report.
 *
 * The two records: rebar-bs-central-station, rebar-ramat-gan-marom-nave.
 *
 * Evidence: rebar.co.il/our-stores/ embeds the chain's own store-locator
 * feed — one JSON object per branch, including a genuinely differentiated
 * boolean `kosher` field (53 true / 53 false across the feed, confirmed by
 * the Architect). Both target branches match a `kosher:true` feed entry by
 * name + address + coordinates (~120m). The feed's complete key set has NO
 * level field and NO authority field — confirmed by the Architect against
 * the full key union. That is the evidence ceiling: "kosher, level and
 * authority both unknown" — not "regular" (an affirmative, evidence-requiring
 * claim per src/types/place.ts's own documented semantics) and not any
 * specific authority or mehadrin claim (the other 53 rebar records already
 * carry a fabricated, sourceless mehadrin claim — FACTS §5b; this must not
 * repeat that mistake from a different wrong source).
 *
 * kosherLevel: null is NOT the documented case for this field ("authority
 * named, level not stated" — src/types/place.ts). Here neither is named.
 * The schema has no state for "kosher established, level and authority both
 * unknown"; null is the closest fit and is written deliberately, not
 * silently, per the Architect's explicit instruction — flagged here rather
 * than resolved, since redefining schema semantics is out of this script's
 * scope.
 *
 * Usage:
 *   node scripts/restore-rebar-two-branches.mjs           # dry-run + report
 *   node scripts/restore-rebar-two-branches.mjs --apply    # writes, with backup
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordKashrutWrite } from './shared/kashrut-write.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLACES = resolve(root, 'src/data/generated/places.osm.json');

const APPLY = process.argv.slice(2).includes('--apply');

const TODAY = '2026-08-26';
const SOURCE_URL = 'https://rebar.co.il/our-stores/';
const BASIS = {
  kind: 'human-review',
  note: 'rebar.co.il/our-stores/ store-locator feed confirms kosher:true for this branch by ' +
    'name+address+coordinate match (~120m). Feed has no level/authority field — verified against ' +
    'the full key union across all 106 feed entries. No specific authority or level is stated by any ' +
    'primary source found; none is asserted here.',
};

const TARGET_IDS = ['rebar-bs-central-station', 'rebar-ramat-gan-marom-nave'];

// Fields this script may ever write. kosherLevel is the field the choke
// point normally gates on 'mehadrin' only — here it is explicitly null, so
// that gate never fires; recordKashrutWrite still requires a basis, which is
// honest about what was actually checked.
const KASHRUT_FIELDS_TO_SET = [
  ['kosherType', 'kosher'],
  ['kosherLevel', null],
  ['kosherAuthorityGroup', 'unknown'],
  ['kosherAuthority', null],
];

const original = JSON.parse(readFileSync(PLACES, 'utf8'));
const places = JSON.parse(readFileSync(PLACES, 'utf8')); // separate parse — never share references with `original`
const beforeIds = original.map((p) => String(p.id));

const problems = [];
const beforeAfter = [];

for (const id of TARGET_IDS) {
  const p = places.find((r) => String(r.id) === id);
  if (!p) {
    problems.push(`${id}: record not found`);
    continue;
  }

  const before = { ...p };

  // Precondition — every field this script is about to set must currently
  // be absent. If any of them already carry a value, something changed
  // since the Architect's spec was written against this record's state;
  // refuse rather than silently overwrite.
  const alreadySet = ['kosherType', 'kosherLevel', 'kosherAuthorityGroup', 'kosherAuthority', 'certifiedBy', 'sourceUrl']
    .filter((f) => p[f] !== undefined);
  if (alreadySet.length) {
    problems.push(`${id}: precondition failed — already has a value for: ${alreadySet.join(', ')}. Refusing to overwrite; re-check the spec against current state.`);
    continue;
  }

  try {
    for (const [field, value] of KASHRUT_FIELDS_TO_SET) {
      recordKashrutWrite(p, field, value, BASIS);
    }
  } catch (err) {
    problems.push(`${id}: recordKashrutWrite refused — ${err.message}`);
    continue;
  }

  // Provenance fields — not covered by the KASHRUT_FIELDS choke point.
  p.sourceUrl = SOURCE_URL;
  p.lastVerifiedAt = TODAY;
  // certifiedBy: deliberately NOT written — the source names no certifying body.

  beforeAfter.push({ id, before, after: { ...p } });
}

// ── verification (runs on the in-memory proposed state, dry-run or not) ────

if (places.length !== original.length) {
  problems.push(`record count changed: ${original.length} → ${places.length}`);
}

const afterIds = places.map((p) => String(p.id));
if (afterIds.length !== beforeIds.length || afterIds.some((id, i) => id !== beforeIds[i])) {
  problems.push('id list changed (order or membership) — must be byte-identical');
}

const origById = new Map(original.map((p) => [String(p.id), p]));
const ALLOWED_DIFF_FIELDS = new Set(['kosherType', 'kosherLevel', 'kosherAuthorityGroup', 'kosherAuthority', 'sourceUrl', 'lastVerifiedAt']);
const TARGET_ID_SET = new Set(TARGET_IDS);

for (const p of places) {
  const o = origById.get(String(p.id));
  if (!o) {
    problems.push(`${p.id}: not present before`);
    continue;
  }
  const allKeys = new Set([...Object.keys(o), ...Object.keys(p)]);
  for (const k of allKeys) {
    const same = JSON.stringify(o[k]) === JSON.stringify(p[k]);
    if (same) continue;
    if (!TARGET_ID_SET.has(String(p.id))) {
      problems.push(`${p.id}: field "${k}" changed on a record outside the two-record scope`);
    } else if (!ALLOWED_DIFF_FIELDS.has(k)) {
      problems.push(`${p.id}: field "${k}" changed but is not in the allowed set (${[...ALLOWED_DIFF_FIELDS].join('/')})`);
    }
  }
}

// certifiedBy must be byte-identical (untouched, still absent) on both targets.
for (const id of TARGET_IDS) {
  const o = origById.get(id);
  const p = places.find((r) => String(r.id) === id);
  if (o && p && JSON.stringify(o.certifiedBy) !== JSON.stringify(p.certifiedBy)) {
    problems.push(`${id}: certifiedBy changed — must stay untouched (source names no body)`);
  }
}

// ── report ──────────────────────────────────────────────────────────────

console.log('\n=== Rebar two-branch kashrut restoration — ' + (APPLY ? 'APPLY' : 'DRY RUN') + ' ===\n');
for (const { id, before, after } of beforeAfter) {
  console.log(`  ${id}:`);
  for (const f of ['kosherType', 'kosherLevel', 'kosherAuthorityGroup', 'kosherAuthority', 'certifiedBy', 'sourceUrl', 'lastVerifiedAt']) {
    console.log(`    ${f.padEnd(20)} ${JSON.stringify(before[f])} -> ${JSON.stringify(after[f])}`);
  }
}

console.log('\n  --- ACCEPTANCE CHECKS ---');
console.log(`  record count unchanged           : ${places.length === original.length ? 'OK' : 'FAIL'} (${original.length} → ${places.length})`);
console.log(`  id list byte-identical, in order  : ${afterIds.length === beforeIds.length && afterIds.every((id, i) => id === beforeIds[i]) ? 'OK' : 'FAIL'}`);
console.log(`  both target records found & written: ${beforeAfter.length === TARGET_IDS.length ? 'OK' : `FAIL (${beforeAfter.length}/${TARGET_IDS.length})`}`);
console.log(`  no field changed outside the allowed set / outside the two records: ${problems.length === 0 ? 'OK' : 'FAIL'}`);

if (problems.length) {
  console.error(`\n✗ ${problems.length} verification problem(s):`);
  problems.forEach((p) => console.error('    ' + p));
}

if (!APPLY) {
  console.log('\n(dry run — nothing written. Re-run with --apply to write.)\n');
  process.exit(problems.length ? 1 : 0);
}

if (problems.length) {
  console.error('\n✗ REFUSING TO WRITE — verification failed.\n');
  process.exit(1);
}

const backupDir = join(root, 'data-backups', 'restore-rebar-two-branches');
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = join(backupDir, `places.osm.${stamp}.json`);
copyFileSync(PLACES, backupPath);

writeFileSync(PLACES, JSON.stringify(places, null, 2), 'utf8');
console.log(`\n✓ wrote kashrut fields on ${beforeAfter.length} record(s): ${TARGET_IDS.join(', ')}`);
console.log(`  backup: ${backupPath}\n`);
