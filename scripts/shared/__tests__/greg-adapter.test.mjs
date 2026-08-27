// Standalone test (not jest). Run: node scripts/shared/__tests__/greg-adapter.test.mjs
//
// Pins findLevelText's document-order-first behavior (leftmost match wins).
// On the real סניף דיזנגוף סנטר page, the only level phrase present is "כשר
// מהדרין" (ל absent, in the opening-hours block) — checked directly,
// 2026-08-27 (Reviewer): that page does NOT contain "כשר למהדרין" anywhere,
// and 0 of 59 captured greg pages carry a "branches near you" / footer
// block naming sibling locations. So the sibling-branch-collision scenario
// below is a HYPOTHETICAL this rule guards against, not something observed
// on any real page — `.exec()` on a non-global regex already returns the
// leftmost match, which is why this has been correct, but nobody had
// chosen leftmost-wins deliberately until it was stated as a rule (see
// greg-adapter.mjs's header on findLevelText). This test exists so a future
// change (switching to a global regex, taking the last match, reordering
// snippets before matching) fails here by name instead of silently
// inverting the precedence, whether or not the hypothetical is ever
// realized on a real page.
import assert from 'node:assert/strict';
import { findLevelText } from '../adapters/greg-adapter.mjs';

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

console.log('greg-adapter.mjs');

test('DIZENGOFF: own body-text mention (no ל) wins over a later sibling badge-style mention (with ל)', () => {
  // Reconstructs the real page shape: Dizengoff's own statement about itself
  // appears first, in body text, in the opening-hours block; a "branches
  // near you" style block naming a different branch's badge text appears
  // later in the same tag-stripped page.
  const plainText =
    'סניף דיזנגוף סנטר תל אביב-יפו שעות פתיחה א-ה 09:00-22:00 כשר מהדרין ' +
    'ו 09:00-15:00 סניפים נוספים באזור סניף רמת גן כשר למהדרין';
  assert.equal(findLevelText(plainText), 'כשר מהדרין');
});

test('sabotage check: if the sibling mention came FIRST, it would win instead — proving the rule is document-order, not "prefer no-ל"', () => {
  const plainText = 'סניף רמת גן כשר למהדרין סניפים נוספים דיזנגוף סנטר כשר מהדרין';
  assert.equal(findLevelText(plainText), 'כשר למהדרין');
});

test('badge shape alone (ל present) still matches', () => {
  assert.equal(findLevelText('לפני ההזמנה שימו לב: כשר למהדרין'), 'כשר למהדרין');
});

test('no level phrase present returns null', () => {
  assert.equal(findLevelText('סניף רגיל בלי אזכור כשרות בעמוד'), null);
});

console.log(`${passed} passed`);
if (process.exitCode) {
  console.error('greg-adapter.mjs: FAILED');
} else {
  console.log('greg-adapter.mjs: all tests passed');
}
