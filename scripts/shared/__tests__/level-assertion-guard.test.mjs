// Standalone test (not jest). Run: node scripts/shared/__tests__/level-assertion-guard.test.mjs
//
// This guard scans REAL repo files, not injectable fixtures — same shape as
// kashrut-write-completeness.test.mjs. Assertions are pinned to the specific
// known-positive/known-negative files the Architect and Reviewer verified
// the predicate against (docs/KASHRUT_FACTS.md §22/§23), not to a total
// count: the total will shrink as Item 4 Unit 3 remediates more scripts,
// and a test asserting an exact total would go stale on every remediation
// rather than staying a stable proof of the predicate itself.
import assert from 'node:assert/strict';
import { findLevelAssertionViolations } from '../level-assertion-guard.mjs';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok - ${name}`);
  } catch (err) {
    console.error(`  FAIL - ${name}`);
    console.error(`    ${err.stack ?? err.message}`);
    process.exitCode = 1;
  }
}

console.log('level-assertion-guard.mjs');

const violations = findLevelAssertionViolations();
const byFile = new Map();
for (const v of violations) {
  if (!byFile.has(v.file)) byFile.set(v.file, []);
  byFile.get(v.file).push(v);
}

// ── Known positives — the six from the Architect's first brief, PLUS the
// two the Reviewer added when the "names a body" scoping axis turned out to
// be wrong (patch-shemesh-missed.mjs, update-pizza-story-hours.mjs). Seven
// listed here, not eight: scripts/import-rebar.mjs was the eighth, and Item
// 4 Unit 1 already rewrote it to route through recordKashrutWrite() — its
// own absence from this guard's output (asserted separately below) is
// itself live proof that fix held, not something to re-list as a positive.

const KNOWN_POSITIVES = [
  'scripts/import-arcaffe.mjs',
  'scripts/import-lechembasar.mjs',
  'scripts/import-bardichev.mjs',
  'scripts/import-cafe-nimrod.mjs',
  'scripts/fix-hummus-eliyahu-full.mjs',
  'scripts/patch-shemesh-missed.mjs',
  'scripts/update-pizza-story-hours.mjs',
];

for (const file of KNOWN_POSITIVES) {
  test(`REAL, KNOWN POSITIVE: ${file} is flagged — a mehadrin-family literal with no evidence-supported basis`, () => {
    const vs = byFile.get(file);
    assert.ok(vs && vs.length >= 1, `expected at least one violation in ${file}`);
  });
}

test('REAL, KNOWN POSITIVE detail: patch-shemesh-missed.mjs — rabanut_mehadrin + certifiedBy "הרב רובין", which the registry resolves to level null (a private badatz named alongside a rabbinate-tier kosherType — internally incoherent evidence, and level:null either way)', () => {
  const [v] = byFile.get('scripts/patch-shemesh-missed.mjs');
  assert.equal(v.field, 'kosherType');
  assert.equal(v.value, 'rabanut_mehadrin');
  assert.equal(v.certifiedBy, 'הרב רובין');
});

test('REAL, KNOWN POSITIVE detail: update-pizza-story-hours.mjs — mehadrin + certifiedBy "הרב לנדא" (the comment on that line literally says "official site says לנדא" — the source names a body; the very next line still asserts a level the text never states)', () => {
  const [v] = byFile.get('scripts/update-pizza-story-hours.mjs');
  assert.equal(v.certifiedBy, 'הרב לנדא');
});

// ── Known negative — the one case that must NOT be flagged.

test('REAL, KNOWN NEGATIVE: fix-nagisa-official.mjs (manual-nagisa-lod) is NOT flagged — certifiedBy "כשר למהדרין" is itself a registered mehadrin alias, so the source text states the level directly', () => {
  assert.ok(!byFile.has('scripts/fix-nagisa-official.mjs'), 'the one correctly-evidenced mehadrin claim in this population must never be flagged');
});

// ── Proof that Unit 1's fix holds, via this guard rather than by rereading the file.

test('REAL, REGRESSION-PROOF: scripts/import-rebar.mjs (Item 4 Unit 1) is NOT flagged — it was one of the original eight positives; its own explanatory comment mentions the old kosherType:\'mehadrin\' literal in prose, which a comment-blind scan would misflag', () => {
  assert.ok(!byFile.has('scripts/import-rebar.mjs'), 'a comment-stripping bug would make the importer\'s own JSDoc history note register as a live violation');
});

// ── Shape checks.

test('every violation carries a non-empty, actionable reason string', () => {
  assert.ok(violations.length > 0, 'sanity: the scan must find something on a repo with real known positives');
  for (const v of violations) {
    assert.equal(typeof v.reason, 'string');
    assert.ok(v.reason.length > 20, `reason too short to be actionable: ${JSON.stringify(v.reason)}`);
  }
});

test('a violation with no certifiedBy at all states that plainly, not a registry-lookup message', () => {
  const noEvidence = violations.find((v) => v.certifiedBy === null);
  assert.ok(noEvidence, 'expected at least one no-certifiedBy-at-all case (most of the import-*.mjs population)');
  assert.match(noEvidence.reason, /no certifiedBy literal/);
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
