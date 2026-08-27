// Standalone test (not jest). Run: node scripts/shared/__tests__/lastverifiedat-literal-guard.test.mjs
//
// This guard scans REAL repo files, not injectable fixtures — same shape as
// level-assertion-guard.test.mjs. Assertions are pinned to specific known-
// positive/known-negative files, not to a total count: the total will
// shrink as scripts get remediated, and a test asserting an exact total
// would go stale on every fix rather than staying a stable proof of the
// predicate itself.
import assert from 'node:assert/strict';
import { findLastVerifiedAtLiteralViolations, analyzeSourceForLiteralLastVerifiedAt } from '../lastverifiedat-literal-guard.mjs';

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

console.log('lastverifiedat-literal-guard.mjs');

const violations = findLastVerifiedAtLiteralViolations();
const byFile = new Map();
for (const v of violations) {
  if (!byFile.has(v.file)) byFile.set(v.file, []);
  byFile.get(v.file).push(v);
}

// Known positive: import-golda.mjs — verified by direct read before trusting
// the scan against anything else (docs/KASHRUT_FACTS.md's own §17-family
// rule: an unvalidated scan returning results is not proof it's finding the
// real thing until checked against something known to be there).
test('REAL, KNOWN POSITIVE: scripts/import-golda.mjs is flagged — lastVerifiedAt: \'2026-07-14\' is a hardcoded literal', () => {
  const vs = byFile.get('scripts/import-golda.mjs');
  assert.ok(vs && vs.length >= 1, 'expected at least one violation');
  assert.equal(vs[0].date, '2026-07-14');
});

// Known positive, the const-indirection form: a date literal one level
// removed from the lastVerifiedAt assignment site, via a named constant.
// Found only because the guard's second pass (CONST_DATE_DECL_RE) exists —
// the direct-literal pass alone (LITERAL_DATE_RE) does not see this shape
// at all, since there is no quoted string at the assignment site itself.
test('REAL, KNOWN POSITIVE, indirect form: scripts/import-kiriat-meir-chains.mjs is flagged via its VERIFIED const, not a direct literal at the assignment site', () => {
  const vs = byFile.get('scripts/import-kiriat-meir-chains.mjs');
  assert.ok(vs && vs.length >= 1, 'expected at least one violation');
  assert.equal(vs[0].date, '2026-08-02');
  assert.equal(vs[0].viaConst, 'VERIFIED');
});

// Known negatives — fixed in the same pass that found this guard's
// motivating case. Their absence here is live proof the fix held, not
// something to silently assume.
const KNOWN_NEGATIVES = [
  'importers/tzohar/import-food.mjs', // fixed: three call sites now use localDateISO()
  'scripts/import-rebar.mjs', // fixed earlier (0d97a80): RUN_DATE = localDateISO()
  'scripts/shared/kashrut-pipeline.mjs', // fixed earlier: runDate = localDateISO()
];
for (const file of KNOWN_NEGATIVES) {
  test(`REAL, KNOWN NEGATIVE: ${file} is NOT flagged — already fixed to use a computed date`, () => {
    assert.ok(!byFile.has(file), `expected no violations in ${file}, found ${JSON.stringify(byFile.get(file))}`);
  });
}

// Deliberately excluded, not overlooked: remediate-rebar-55.mjs is the
// frozen historical record of what commit 880e48d actually shipped.
// Rewriting it to use a computed date would make it lie about its own
// history — its exclusion from this guard must hold, and this test proves
// it holds by name rather than by omission.
test('scripts/remediate-rebar-55.mjs is deliberately excluded (frozen historical record, not a live writer)', () => {
  assert.ok(!byFile.has('scripts/remediate-rebar-55.mjs'), 'remediate-rebar-55.mjs must stay excluded from this scan');
});

// This guard's own file is excluded from its own scan — see the file's
// own header for why (a real bug in the shared stripComments scanner,
// triggered by a regex literal containing a quoted character class).
test('scripts/shared/lastverifiedat-literal-guard.mjs does not flag itself', () => {
  assert.ok(!byFile.has('scripts/shared/lastverifiedat-literal-guard.mjs'), 'this guard must not flag its own source');
});

// ── Sanity check: at least one violation exists in the live repo today.
// Guards against the exact §17-family failure mode this whole file exists
// to avoid — a scan returning zero looks identical to "nothing to find"
// and to "the scan is broken." As of 2026-08-27 there are 56 known files
// with this defect; asserting > 0 (not the exact count, which will shrink
// as files get remediated) keeps this test meaningful without going stale.
test('sanity: at least one violation found in the real repo — a scan returning zero here would be indistinguishable from a broken scan', () => {
  assert.ok(violations.length > 0, 'expected at least one real violation; if this is genuinely zero, verify manually before trusting it');
});

// ── Pure-function tests against synthetic source, proving the two detection
// passes independently, not only against real files.

test('direct literal form is detected: existing.lastVerifiedAt = \'2026-08-10\'', () => {
  const src = `existing.lastVerifiedAt = '2026-08-10';`;
  const vs = analyzeSourceForLiteralLastVerifiedAt(src);
  assert.equal(vs.length, 1);
  assert.equal(vs[0].date, '2026-08-10');
});

test('object-literal shorthand form is detected: { lastVerifiedAt: \'2026-08-10\' }', () => {
  const src = `const place = { name: 'x', lastVerifiedAt: '2026-08-10' };`;
  const vs = analyzeSourceForLiteralLastVerifiedAt(src);
  assert.equal(vs.length, 1);
  assert.equal(vs[0].date, '2026-08-10');
});

test('computed form is NOT flagged: lastVerifiedAt: localDateISO()', () => {
  const src = `const place = { lastVerifiedAt: localDateISO() };`;
  const vs = analyzeSourceForLiteralLastVerifiedAt(src);
  assert.equal(vs.length, 0);
});

test('computed form is NOT flagged: lastVerifiedAt: RUN_DATE (a variable, not a quoted literal)', () => {
  const src = `const place = { lastVerifiedAt: RUN_DATE };`;
  const vs = analyzeSourceForLiteralLastVerifiedAt(src);
  assert.equal(vs.length, 0);
});

test('a literal date INSIDE A COMMENT is not flagged — only real code matters', () => {
  const src = `// old code used to say lastVerifiedAt: '2026-07-14'\nconst place = { lastVerifiedAt: localDateISO() };`;
  const vs = analyzeSourceForLiteralLastVerifiedAt(src);
  assert.equal(vs.length, 0);
});

test('const-indirection form is detected: const VERIFIED = \'2026-08-02\'; ... lastVerifiedAt: VERIFIED', () => {
  const src = `const VERIFIED = '2026-08-02';\nconst place = { lastVerifiedAt: VERIFIED };`;
  const vs = analyzeSourceForLiteralLastVerifiedAt(src);
  assert.equal(vs.length, 1);
  assert.equal(vs[0].date, '2026-08-02');
  assert.equal(vs[0].viaConst, 'VERIFIED');
});

test('a date-shaped const that is NEVER used for lastVerifiedAt is not flagged', () => {
  const src = `const CERT_EXPIRY = '2026-09-11';\nconst x = { certificateValidUntil: CERT_EXPIRY };`;
  const vs = analyzeSourceForLiteralLastVerifiedAt(src);
  assert.equal(vs.length, 0);
});

console.log(`${passed} passed`);
if (process.exitCode) {
  console.error('lastverifiedat-literal-guard.mjs: FAILED');
} else {
  console.log('lastverifiedat-literal-guard.mjs: all tests passed');
}
