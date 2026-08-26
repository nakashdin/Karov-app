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
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findLevelAssertionViolations, analyzeSource, stripComments } from '../level-assertion-guard.mjs';
import { LEVEL_ASSERTING_KOSHER_TYPES as CANONICAL } from '../kashrut-conflict-resolution.mjs';

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

// ── The differential probe matrix (docs/KASHRUT_FACTS.md §24/§25) — four
// synthetic source strings, no two fixed by the same mechanism. Verified
// against analyzeSource() directly (not real repo files) so each shape is
// isolated and doesn't depend on which real script happens to still exhibit
// it. Positive control FIRST: the Architect's own methodology note — a
// negative-case probe means nothing until a positive control proves the
// probe is reachable at all (this exact project was burned by an
// unreachable probe silently returning "not flagged" for both cases when
// its own files never reached the scanner).

const PROBE_POSITIVE_CONTROL = `const obj = {
  id: 'x',
  kosherType: 'mehadrin',
  certifiedBy: 'הרב לנדא',
};`;

const PROBE_TOP_OF_FILE_PROSE = `/**
 * This describes kosherType: 'mehadrin' as something we used to do.
 */
const y = 5;`;

// Isolates the null-enclosing-block rule specifically from stripComments:
// this is a real STRING VALUE (not a comment), so stripComments correctly
// leaves it untouched, and the match has genuinely no enclosing `{...}`.
// The top-of-file-prose probe above does NOT actually exercise this rule in
// isolation — stripComments already removes that text before the null-block
// check would ever matter, so a sabotage of the null-block rule alone does
// not fail that probe. This one does.
const PROBE_NO_ENCLOSING_BLOCK_AT_ALL = `const historicalNote = "See: kosherType: 'mehadrin' for the old behavior.";`;

const PROBE_BLOCK_COMMENT_INSIDE_LITERAL = `const obj2 = {
  id: 'y',
  /* Historically this claimed kosherType:'mehadrin' */
  someOtherField: 'z',
};`;

const PROBE_LINE_COMMENT_INSIDE_LITERAL = `const obj3 = {
  id: 'z',
  // Historically this claimed kosherType: 'mehadrin'.
  certifiedBy: 'רבנות תל אביב',
};`;

test('PROBE, positive control: a real violation in an ordinary object literal IS flagged — proves the probe methodology is reachable before any negative case is trusted', () => {
  const vs = analyzeSource(PROBE_POSITIVE_CONTROL);
  assert.equal(vs.length, 1);
  assert.equal(vs[0].certifiedBy, 'הרב לנדא');
});

test('PROBE, top-of-file prose: a JSDoc block mentioning the literal in prose, with no real object literal using it, is NOT flagged (in this case via stripComments — see the next test for the null-block rule isolated from it)', () => {
  assert.deepEqual(analyzeSource(PROBE_TOP_OF_FILE_PROSE), []);
});

test('the null-enclosing-block rule, isolated from stripComments: a real string value (not a comment) containing the literal pattern, with no enclosing object literal at all, is NOT flagged as a violation with no evidence', () => {
  assert.deepEqual(analyzeSource(PROBE_NO_ENCLOSING_BLOCK_AT_ALL), []);
});

test('PROBE, block comment INSIDE a real object literal: prose sitting between two real properties (a genuine enclosing block, so the null-block rule alone does NOT save this case) is NOT flagged — only correct string-aware comment stripping catches this', () => {
  assert.deepEqual(analyzeSource(PROBE_BLOCK_COMMENT_INSIDE_LITERAL), []);
});

test('PROBE, line comment INSIDE a real object literal — the nastier shape: an unstripped scan would pick up the REAL sibling certifiedBy property as if it were the prose\'s own evidence and report a plausible-looking violation ("mehadrin certified by רבנות תל אביב") that investigates to nothing. Correctly NOT flagged.', () => {
  assert.deepEqual(analyzeSource(PROBE_LINE_COMMENT_INSIDE_LITERAL), []);
});

test('stripComments: a `//` inside a real string value (e.g. a URL) is not mistaken for a comment start', () => {
  const src = `const website = 'https://rebar.co.il';`;
  assert.equal(stripComments(src), src);
});

test('stripComments: a `/*`-looking sequence inside a string value is not mistaken for a block-comment start', () => {
  const src = `const note = 'contains /* not a real comment */ text';`;
  assert.equal(stripComments(src), src);
});

test('stripComments: a backslash-escaped quote inside a string does not end the string early, which would otherwise expose the rest of the string as if it were a real line comment', () => {
  const src = `const s = 'it\\'s // still one string';`;
  assert.equal(stripComments(src), src);
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

// ── Drift check: the three non-canonical copies of LEVEL_ASSERTING_KOSHER_
// TYPES/LEVEL_BEARING_TYPES (kashrut-write.mjs, validate-data.mjs,
// audit-358-level-removal.mjs) must still equal the canonical export this
// file imports. Not consolidated here — each of those three has its own
// ratchet/enforcement role and changing them is a separate, separately-
// reviewed change — but a header comment claiming "kept in sync" is not
// itself a check, and this repo has been burned by exactly that shape
// before (§17 face 3). Reads each declaration from its OWN source text
// (they're unexported module-private consts, so there is nothing to
// import) rather than re-typing the expected value a fifth time, which
// would just be a fifth copy to drift.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function extractSetLiteral(filePath, constName) {
  const src = readFileSync(resolve(ROOT, filePath), 'utf8');
  const re = new RegExp(`const ${constName}\\s*=\\s*new Set\\(\\[([^\\]]*)\\]\\)`);
  const m = src.match(re);
  if (!m) return null;
  return new Set(m[1].split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.slice(1, -1)));
}

const DRIFT_TARGETS = [
  { file: 'scripts/shared/kashrut-write.mjs', constName: 'LEVEL_ASSERTING_KOSHER_TYPES' },
  { file: 'scripts/validate-data.mjs', constName: 'LEVEL_ASSERTING_KOSHER_TYPES' },
  { file: 'scripts/reports/audit-358-level-removal.mjs', constName: 'LEVEL_BEARING_TYPES' },
];

for (const { file, constName } of DRIFT_TARGETS) {
  test(`DRIFT CHECK: ${file}'s ${constName} still equals the canonical export (kashrut-conflict-resolution.mjs) — not consolidated, just watched`, () => {
    const found = extractSetLiteral(file, constName);
    assert.ok(found, `could not find "const ${constName} = new Set([...])" in ${file} — either it moved/renamed (update this test's target) or the extraction regex needs to change`);
    assert.deepEqual([...found].sort(), [...CANONICAL].sort(), `${file}'s ${constName} has drifted from the canonical export`);
  });
}

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
