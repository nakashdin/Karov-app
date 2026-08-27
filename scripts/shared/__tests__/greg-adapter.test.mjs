// Standalone test (not jest). Run: node scripts/shared/__tests__/greg-adapter.test.mjs
//
// Pins findLevelText's document-order-first behavior (Reviewer finding,
// Item 4 Unit 3 follow-up, 2026-08-27): for the real סניף דיזנגוף סנטר page,
// the correct level text ("כשר מהדרין", ל absent) is the FIRST occurrence of
// LEVEL_PHRASE_RE in the tag-stripped page text — it lives in the opening-
// hours block, not a badge. A later position in the same page can carry a
// DIFFERENT branch's badge-style phrasing ("כשר למהדרין", ל present),
// surfaced by shared page chrome (e.g. a "branches near you" block). Taking
// the last match instead of the first would silently attribute a sibling
// branch's level wording to Dizengoff. `.exec()` on a non-global regex
// already returns the leftmost match, which is why this has been correct —
// this test exists so a future change (switching to a global regex, taking
// the last match, reordering snippets before matching) fails here by name
// instead of silently inverting the precedence.
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
