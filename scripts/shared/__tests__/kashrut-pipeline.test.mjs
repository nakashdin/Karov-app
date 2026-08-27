// Standalone test (not jest). Run: node scripts/shared/__tests__/kashrut-pipeline.test.mjs
//
// Guards two invariants from Item 4 Unit 3, 2026-08-27:
//
// 1. A level phrase found on a source page must never be silently dropped.
//    The original classifyBranch() branch order returned unconditionally
//    from `if (body)` before ever checking `branch.levelText`, so the ONLY
//    two greg records naming a real badatz — the two with the STRONGEST
//    evidence in the whole chain — were exactly the two that lost their
//    level phrase, while every body-less record kept it as a claim. This
//    part is checkable without knowing anything about kashrut: it only
//    asserts that levelText in implies claimedLevel out (never kosherLevel
//    — see #2).
//
// 2. Body and level are INDEPENDENT axes (owner ruling, verbatim: "לא, הם
//    כשרויות שונות" — a named certifying body and a level word are
//    different kashrut claims, not two descriptions of one thing; a body
//    never confers a level). This SUPERSEDES an earlier version of this
//    pipeline that had a third "verified level" case gated on the
//    registry's resolved.level — deleted outright, not fixed, because
//    resolved.level was found to be a pure restatement of the matched alias
//    STRING (zero exceptions across all 203 registry aliases), never a fact
//    about a body. This pipeline does not write a VERIFIED kosherLevel at
//    all, from any input — only claims.
import assert from 'node:assert/strict';
import { classifyBranch, gate0Selectivity, loadRegistry } from '../kashrut-pipeline.mjs';

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

console.log('kashrut-pipeline.mjs');

const registry = loadRegistry();
const selective = gate0Selectivity([
  { kashrutMarker: 'asserted' },
  { kashrutMarker: 'not_asserted' },
]).selective;
assert.equal(selective, true, 'sanity: the fixture branches must actually be selective, or every test below is vacuous');

function baseBranch(overrides) {
  return {
    sourceKey: 'test-branch',
    name: 'test',
    address: 'test',
    city: 'test',
    lat: null,
    lng: null,
    kashrutMarker: 'asserted',
    levelText: null,
    bodyText: null,
    sourceUrl: 'https://example.test/branch',
    raw: {},
    ...overrides,
  };
}

test('INVARIANT: a level phrase with NO body still reaches claimedLevel (case b, unchanged baseline)', () => {
  const branch = baseBranch({ levelText: 'כשר למהדרין', bodyText: null });
  const { write } = classifyBranch(branch, registry, selective);
  assert.ok(write, 'expected a write');
  assert.ok(write.claimedLevel, `levelText was set but claimedLevel is falsy — write=${JSON.stringify(write)}`);
  assert.equal(write.kosherLevel, null, 'a claim must never also be a verified level');
});

test('INVARIANT: a level phrase WITH an unresolved body still reaches claimedLevel — this is the exact bug found live (branch-order swallowed it)', () => {
  const branch = baseBranch({ levelText: 'כשר למהדרין', bodyText: 'גוף השגחה לא רשום כלשהו' });
  const { write } = classifyBranch(branch, registry, selective);
  assert.ok(write, 'expected a write');
  assert.ok(write.certifiedBy, 'expected the unresolved body to still be recorded verbatim in certifiedBy');
  assert.ok(write.claimedLevel, `levelText was set alongside a body but claimedLevel is falsy — the level was silently dropped. write=${JSON.stringify(write)}`);
  assert.equal(write.kosherLevel, null, 'an unresolved body must not fabricate a verified level');
});

test('INVARIANT: a level phrase WITH a REAL, resolved registry body reaches BOTH certifiedBy AND claimedLevel, independently — the live greg מגדל העמק / גן העיר אשדוד shape', () => {
  // "בד"צ בית יוסף" is a real, registered alias, resolves to a real
  // authority (badatz group). Under the owner's ruling a body never
  // confers a level, so this must NOT become a verified kosherLevel no
  // matter how well-resolved the body is — it must still land as a claim,
  // recorded ALONGSIDE the body, not instead of it.
  const branch = baseBranch({ levelText: 'כשר למהדרין', bodyText: 'בד"צ בית יוסף' });
  const { write, outcome } = classifyBranch(branch, registry, selective);
  assert.ok(write, 'expected a write');
  assert.ok(write.certifiedBy, 'expected the real, resolved body to be recorded in certifiedBy');
  assert.equal(write.kosherAuthorityGroup, 'badatz', 'expected the resolved authority\'s real group, not "unknown"');
  assert.ok(write.claimedLevel, `levelText was set alongside a REAL resolved body but claimedLevel is falsy — this is the exact live defect (greg-77bb14f6 / greg-9ddc70b3). write=${JSON.stringify(write)}`);
  assert.equal(write.claimedLevelText, 'כשר למהדרין');
  assert.equal(write.claimedLevelSource, branch.sourceUrl);
  assert.equal(write.kosherLevel, null, 'a body must never promote a claim to a verified level — this pipeline writes no kosherLevel at all, from any input (owner ruling: a body does not confer a level)');
  assert.equal(outcome, 'SOURCE_STATES_CLAIMED_LEVEL', 'the outcome name describes what happened to the LEVEL, not whether a body was also recorded');
});

test('INVARIANT: this pipeline never writes a non-null kosherLevel, for ANY branch shape — case (c) "verified by a supporting body" is deleted, not merely unreached', () => {
  const shapes = [
    baseBranch({ levelText: 'כשר למהדרין', bodyText: null }),
    baseBranch({ levelText: 'כשר למהדרין', bodyText: 'בד"צ בית יוסף' }),
    baseBranch({ levelText: null, bodyText: 'בד"צ בית יוסף' }),
    baseBranch({ levelText: null, bodyText: null }),
  ];
  for (const branch of shapes) {
    const { write } = classifyBranch(branch, registry, selective);
    assert.equal(write.kosherLevel, null, `kosherLevel must always be null — got ${JSON.stringify(write.kosherLevel)} for levelText=${JSON.stringify(branch.levelText)} bodyText=${JSON.stringify(branch.bodyText)}`);
  }
});

test('a body with NO level phrase records certifiedBy and carries no claim fields at all (unchanged baseline — no phrase exists to preserve)', () => {
  const branch = baseBranch({ levelText: null, bodyText: 'בד"צ בית יוסף' });
  const { write } = classifyBranch(branch, registry, selective);
  assert.ok(write.certifiedBy, 'expected certifiedBy to be recorded');
  assert.equal('claimedLevel' in write, false, 'no level phrase existed — there must be nothing to claim');
});

test('GENERAL FORM of the invariant, run against every branch shape above: branch.levelText truthy implies write.kosherLevel or write.claimedLevel is populated', () => {
  const shapes = [
    baseBranch({ levelText: 'כשר למהדרין', bodyText: null }),
    baseBranch({ levelText: 'כשר למהדרין', bodyText: 'גוף השגחה לא רשום כלשהו' }),
    baseBranch({ levelText: 'כשר למהדרין', bodyText: 'בד"צ בית יוסף' }),
    baseBranch({ levelText: 'כשר גלאט', bodyText: 'בד"צ בית יוסף' }),
  ];
  for (const branch of shapes) {
    const { write } = classifyBranch(branch, registry, selective);
    assert.ok(
      write && (write.kosherLevel != null || write.claimedLevel != null),
      `branch.levelText=${JSON.stringify(branch.levelText)} bodyText=${JSON.stringify(branch.bodyText)} produced a write with neither kosherLevel nor claimedLevel set — the level phrase was silently dropped. write=${JSON.stringify(write)}`,
    );
  }
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
