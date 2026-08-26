// Standalone test (not jest). Run: node scripts/shared/__tests__/ratchet-corrections.test.mjs
//
// Guards validate-data.mjs's RATCHET_CORRECTIONS mechanism (Item 4 Unit 3,
// 2026-08-27) — the only sanctioned way for a quality ratchet to move
// upward: a correction that removes a fabrication and thereby increases
// honest ignorance. The guard itself was found defective TWICE before this
// file existed, both times by the Reviewer, both times in the same review:
//   1. A first draft listed only `entering` (3 ids) against a claimed net
//      movement of +1 — the gross count of one direction, not the net of
//      both directions. Fixed by requiring BOTH entering and leaving, with
//      the guard computing the net itself rather than trusting a hand-typed
//      number.
//   2. The guard checked `ids.length` against the delta but never verified
//      the ids actually satisfy the ratchet's predicate — "the form of
//      verification wrapped around a length check," the exact shape this
//      project keeps finding, now inside the mechanism built to catch it.
//      Fixed by re-running the SAME predicate function the main counting
//      loop uses against every entering/leaving id, live.
// These three tests are the guard for the guard: each names one way this
// mechanism could silently do nothing while looking like it works.
import assert from 'node:assert/strict';
import { isKashrutAuthorityUnknown, isFreeTextCertifierUnmapped, verifyRatchetCorrection } from '../ratchet-corrections.mjs';

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

console.log('ratchet-corrections.mjs');

// A minimal fixture: 3 "entering" records that genuinely satisfy
// isKashrutAuthorityUnknown (food type, no group / group unknown), and 2
// "leaving" records that genuinely do NOT (a real resolved group).
//
// `overrides` REPLACES a record wholesale (not a shallow merge-patch) — a
// merge would let the base's kosherAuthorityGroup survive underneath a
// caller's override that omits it, exactly the mistake this comment now
// documents because it happened here: a first version of this helper
// spread `{...base.get(id), ...patch}`, so a caller passing `{ type:
// 'restaurant' }` to strip a group never actually stripped anything — the
// base's `kosherAuthorityGroup: 'badatz'` silently survived the "override",
// and a test meant to prove the guard catches a still-resolved leaving
// record instead exercised a record that was never actually changed.
function placesById(overrides = {}) {
  const base = new Map([
    ['enter-1', { id: 'enter-1', type: 'restaurant' }], // no kosherAuthorityGroup -> unknown -> satisfies
    ['enter-2', { id: 'enter-2', type: 'restaurant', kosherAuthorityGroup: 'unknown' }],
    ['enter-3', { id: 'enter-3', type: 'restaurant' }],
    ['leave-1', { id: 'leave-1', type: 'restaurant', kosherAuthorityGroup: 'badatz' }], // resolved -> does NOT satisfy
    ['leave-2', { id: 'leave-2', type: 'restaurant', kosherAuthorityGroup: 'rabbinate' }],
  ]);
  for (const [id, replacement] of Object.entries(overrides)) {
    base.set(id, replacement);
  }
  return base;
}

function validEntry(overrides = {}) {
  return {
    key: 'kashrutAuthorityUnknown',
    from: 100,
    to: 101, // entering(3) - leaving(2) = 1 = 101 - 100
    entering: ['enter-1', 'enter-2', 'enter-3'],
    leaving: ['leave-1', 'leave-2'],
    reason: 'test fixture: 3 fabricated rabbinate values corrected to unknown, 2 unrelated records resolved a real body.',
    ...overrides,
  };
}

test('sanity: isKashrutAuthorityUnknown correctly distinguishes the fixture\'s entering/leaving records (or every test below is vacuous)', () => {
  assert.equal(isKashrutAuthorityUnknown({ id: 'x', type: 'restaurant' }), true);
  assert.equal(isKashrutAuthorityUnknown({ id: 'x', type: 'restaurant', kosherAuthorityGroup: 'unknown' }), true);
  assert.equal(isKashrutAuthorityUnknown({ id: 'x', type: 'restaurant', kosherAuthorityGroup: 'badatz' }), false);
  assert.equal(isKashrutAuthorityUnknown({ id: 'x', type: 'restaurant', kosherAuthorityGroup: 'rabbinate' }), false);
});

test('sanity: isFreeTextCertifierUnmapped correctly distinguishes mapped from unmapped certifiedBy', () => {
  assert.equal(isFreeTextCertifierUnmapped({ id: 'x', type: 'restaurant', certifiedBy: 'text' }), true);
  assert.equal(isFreeTextCertifierUnmapped({ id: 'x', type: 'restaurant', certifiedBy: 'text', certifierId: 'real-id' }), false);
  assert.equal(isFreeTextCertifierUnmapped({ id: 'x', type: 'restaurant', certifiedBy: 'text', certifierId: null }), false, 'certifierId:null is a deliberately resolved state, not unmapped');
  assert.equal(isFreeTextCertifierUnmapped({ id: 'x', type: 'restaurant' }), false, 'no certifiedBy at all is not "unmapped free text"');
});

test('BASELINE: a correctly-formed entry (arithmetic reconciles, all ids verified) passes — returns null', () => {
  const result = verifyRatchetCorrection(validEntry(), placesById(), isKashrutAuthorityUnknown);
  assert.equal(result, null);
});

// ── VIOLATION 1: empty reason ────────────────────────────────────────────
test('VIOLATION: an entry with an empty reason fails', () => {
  const result = verifyRatchetCorrection(validEntry({ reason: '' }), placesById(), isKashrutAuthorityUnknown);
  assert.ok(result, 'expected a failure string, got null');
  assert.match(result, /no reason/);
});
test('VIOLATION: an entry with a whitespace-only reason fails (not just literally empty)', () => {
  const result = verifyRatchetCorrection(validEntry({ reason: '   ' }), placesById(), isKashrutAuthorityUnknown);
  assert.ok(result, 'expected a failure string, got null');
  assert.match(result, /no reason/);
});

// ── VIOLATION 2: ids don't satisfy the predicate — THE defect found live ──
test('VIOLATION: an entering id that does NOT satisfy the predicate fails — this is the exact defect the Reviewer found (a length check with no real verification)', () => {
  // enter-1 is swapped to a record that does NOT satisfy isKashrutAuthorityUnknown,
  // while the entry still claims it as "entering" — a naive length-only
  // guard would pass this; the real guard must not.
  const badPlaces = placesById({ 'enter-1': { id: 'enter-1', type: 'restaurant', kosherAuthorityGroup: 'badatz' } });
  const result = verifyRatchetCorrection(validEntry(), badPlaces, isKashrutAuthorityUnknown);
  assert.ok(result, 'expected a failure string, got null');
  assert.match(result, /enter-1/);
  assert.match(result, /does not currently satisfy/);
});
test('VIOLATION: a leaving id that STILL satisfies the predicate fails', () => {
  const badPlaces = placesById({ 'leave-1': { id: 'leave-1', type: 'restaurant' } }); // no group -> satisfies again
  const result = verifyRatchetCorrection(validEntry(), badPlaces, isKashrutAuthorityUnknown);
  assert.ok(result, 'expected a failure string, got null');
  assert.match(result, /leave-1/);
  assert.match(result, /STILL satisfies/);
});
test('VIOLATION: an entering id that does not exist in the dataset at all fails', () => {
  const result = verifyRatchetCorrection(validEntry({ entering: ['enter-1', 'enter-2', 'no-such-id'] }), placesById(), isKashrutAuthorityUnknown);
  assert.ok(result, 'expected a failure string, got null');
  assert.match(result, /no-such-id/);
  assert.match(result, /does not exist/);
});

// ── VIOLATION 3: arithmetic does not reconcile — the FIRST defect found ──
test('VIOLATION: entering-only (no leaving), net movement mismatched — the exact shape of the first draft this mechanism replaced (3 entering ids claimed against a net of +1)', () => {
  const entry = validEntry({ entering: ['enter-1', 'enter-2', 'enter-3'], leaving: [], to: 101 }); // 3 - 0 = 3, but to-from = 1
  const result = verifyRatchetCorrection(entry, placesById(), isKashrutAuthorityUnknown);
  assert.ok(result, 'expected a failure string, got null');
  assert.match(result, /do not reconcile/);
});
test('VIOLATION: entering/leaving counts correct in isolation but the claimed to/from delta is wrong', () => {
  const entry = validEntry({ to: 105 }); // entering(3)-leaving(2)=1, but to-from=5
  const result = verifyRatchetCorrection(entry, placesById(), isKashrutAuthorityUnknown);
  assert.ok(result, 'expected a failure string, got null');
  assert.match(result, /do not reconcile/);
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
