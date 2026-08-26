// Standalone test (not jest). Run: node scripts/shared/__tests__/tzohar-stage3-verify.test.mjs
//
// Pure functions, no network, no I/O. Fixtures use real identity-blob text
// captured from real certificates during this investigation (hakosem-4.pdf,
// drayer.pdf) where noted, and constructed-but-realistic data elsewhere,
// clearly labeled either way.
import assert from 'node:assert/strict';
import { verifyIdentity, resolveCertificate } from '../../../importers/tzohar/stage3-verify.mjs';

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

console.log('stage3-verify.mjs');

// ── verifyIdentity ───────────────────────────────────────────────────────

test('REAL: hakosem\'s real identity blob (name split across two PDF lines, rejoins with a space in the middle) verifies against our record', () => {
  const our = { name: 'הקוסם', address: 'שלמה המלך 1, תל אביב' };
  const r = verifyIdentity(our, 'הקוס ם שלמה המלך 1 תל אביב - יפו'); // real captured blob
  assert.equal(r.verified, true);
  assert.equal(r.nameMatches, true);
  assert.equal(r.addressMatches, true);
});

test('REAL: drayer\'s real identity blob verifies against the matching winery record', () => {
  const our = { name: 'יקב משק דרייר', address: 'באר מילכה' };
  const r = verifyIdentity(our, "יקב משק דרייר באר - מילכה מצהיר/ה"); // real captured blob
  assert.equal(r.verified, true);
});

test('VIOLATION: an unrelated business name does not verify against a real blob it has nothing to do with', () => {
  const our = { name: 'ממלכת הפירות', address: 'שנקין 3, תל אביב' };
  const r = verifyIdentity(our, 'הקוס ם שלמה המלך 1 תל אביב - יפו');
  assert.equal(r.verified, false);
  assert.equal(r.nameMatches, false);
});

test('KNOWN, STATED LIMITATION (not a defect): a shorter name is a substring of a chain-sibling\'s longer name, so name-containment alone leniently matches a DIFFERENT branch\'s identity blob', () => {
  const our = { name: 'עוגות דה לה פה', address: 'הרצל 1, חיפה' };
  const r = verifyIdentity(our, 'עוגות דה לה פה רמת גן תובל 26 רמת גן'); // a different branch's real-shaped identity
  assert.equal(r.nameMatches, true, 'name-containment alone cannot distinguish "X" from "X רמת גן" — this is why resolveCertificate() does not treat identity verification as the ONLY protection: a genuinely wrong sibling branch would still need to independently AGREE on a validity value with the real match to affect the outcome, and disagreement resolves to AMBIGUOUS_DATE, never a silent pick. Tightening this specific check (e.g. requiring an exact or near-exact name match rather than containment) is a real future improvement, not assumed done here.');
});

test('no identity text at all (extraction found no anchor) never verifies', () => {
  assert.equal(verifyIdentity({ name: 'הקוסם' }, null).verified, false);
});

test('a record with no name cannot be verified against anything, even a real blob', () => {
  assert.equal(verifyIdentity({ name: '' }, 'הקוס ם שלמה המלך 1').verified, false);
});

test('REAL, REGRESSION: a bilingual "Hebrew - English" name (real record, אמאיה - amaia) verifies against a real cert that only prints the Hebrew half', () => {
  const our = { name: 'אמאיה - amaia', address: 'דרך בית לחם 17, ירושלים' };
  const r = verifyIdentity(our, 'העסק אמאיה - דרך בית לחם 71 ירושלים'); // real captured blob, post-fix
  assert.equal(r.verified, true, 'requiring the full bilingual string verbatim always failed here even though this genuinely is the right business — segment matching fixes it');
});

test('VIOLATION-CHECK: bilingual segment matching does not turn into "any short substring matches" — an unrelated business with a coincidentally-short different name segment still fails', () => {
  const our = { name: 'קפה - Cafe XY', address: 'somewhere' };
  const r = verifyIdentity(our, 'עסק אחר לגמרי, לא קשור בשום צורה, בכתובת שונה');
  assert.equal(r.verified, false);
});

// ── resolveCertificate ───────────────────────────────────────────────────

const OUR = { name: 'הקוסם', address: 'שלמה המלך 1, תל אביב', certificateValidUntil: '2026-09-11' };
const HAKOSEM_BLOB = 'הקוס ם שלמה המלך 1 תל אביב - יפו';

test('NOT_FOUND: zero candidates (Stage 2 found nothing)', () => {
  const r = resolveCertificate(OUR, [], { today: '2026-08-26' });
  assert.equal(r.kind, 'NOT_FOUND');
});

test('UNREACHABLE: every candidate failed to fetch', () => {
  const r = resolveCertificate(OUR, [{ tzoharId: '1', certUrl: 'x', fetchStatus: 'unreachable' }], { today: '2026-08-26' });
  assert.equal(r.kind, 'UNREACHABLE');
});

test('WRONG_BUSINESS: fetched fine, identity WAS extracted, and it does not match our record', () => {
  const r = resolveCertificate(OUR, [{ tzoharId: '1', certUrl: 'x', fetchStatus: 'ok', identityBlob: 'עסק אחר לגמרי כתובת אחרת', validity: { kind: 'expiry-date', value: '2026-09-11' } }], { today: '2026-08-26' });
  assert.equal(r.kind, 'WRONG_BUSINESS');
});

test('REAL, REGRESSION (the amaia-1.pdf bug before the fix): identity extraction finding NOTHING to check is UNREADABLE, never WRONG_BUSINESS — a parsing gap is not an identity accusation', () => {
  const r = resolveCertificate(OUR, [{ tzoharId: '1', certUrl: 'x', fetchStatus: 'ok', identityBlob: null, validity: { kind: 'expiry-date', value: '2026-04-01' } }], { today: '2026-08-26' });
  assert.equal(r.kind, 'UNREADABLE');
  assert.notEqual(r.kind, 'WRONG_BUSINESS', 'the original bug: this exact shape (identityBlob: null) was reported as WRONG_BUSINESS on a real record before this distinction existed');
});

test('mixed candidates: one with no extractable identity, one with a genuinely non-matching identity -> WRONG_BUSINESS, since at least one candidate DID have readable identity content to judge', () => {
  const r = resolveCertificate(OUR, [
    { tzoharId: '1', certUrl: 'x', fetchStatus: 'ok', identityBlob: null, validity: { kind: 'unknown', value: null } },
    { tzoharId: '2', certUrl: 'y', fetchStatus: 'ok', identityBlob: 'עסק אחר לגמרי', validity: { kind: 'expiry-date', value: '2026-04-01' } },
  ], { today: '2026-08-26' });
  assert.equal(r.kind, 'WRONG_BUSINESS');
});

test('UNREADABLE: identity verifies, but no candidate yields a parseable date/vintage', () => {
  const r = resolveCertificate(OUR, [{ tzoharId: '1', certUrl: 'x', fetchStatus: 'ok', identityBlob: HAKOSEM_BLOB, validity: { kind: 'unknown', value: null } }], { today: '2026-08-26' });
  assert.equal(r.kind, 'UNREADABLE');
});

test('VERIFIED, unchanged: identity verifies, value matches what we already have, and it is not in the past', () => {
  const r = resolveCertificate(OUR, [{ tzoharId: '1', certUrl: 'x', fetchStatus: 'ok', identityBlob: HAKOSEM_BLOB, validity: { kind: 'expiry-date', value: '2026-09-11' } }], { today: '2026-08-26' });
  assert.equal(r.kind, 'VERIFIED');
  assert.equal(r.changed, false);
});

test('VERIFIED, renewed: identity verifies, value is NEWER than on record', () => {
  const r = resolveCertificate(OUR, [{ tzoharId: '1', certUrl: 'x', fetchStatus: 'ok', identityBlob: HAKOSEM_BLOB, validity: { kind: 'expiry-date', value: '2027-01-01' } }], { today: '2026-08-26' });
  assert.equal(r.kind, 'VERIFIED');
  assert.equal(r.changed, true);
  assert.equal(r.value, '2027-01-01');
});

test('LISTED_BUT_DOCUMENT_STALE, not VERIFIED: identity verifies, the agreed value is in the past — the Architect\'s exact new outcome', () => {
  const stillExpiredOur = { ...OUR, certificateValidUntil: '2026-04-01' };
  const r = resolveCertificate(stillExpiredOur, [{ tzoharId: '1', certUrl: 'x', fetchStatus: 'ok', identityBlob: HAKOSEM_BLOB, validity: { kind: 'expiry-date', value: '2026-04-01' } }], { today: '2026-08-26' });
  assert.equal(r.kind, 'LISTED_BUT_DOCUMENT_STALE');
  assert.notEqual(r.kind, 'VERIFIED', 'a stale-but-agreed date must never read as VERIFIED');
});

test('THE CORE RULE, fired directly: two identity-verified candidates that DISAGREE produce AMBIGUOUS_DATE, never a blind max of the two', () => {
  const candidates = [
    { tzoharId: '1', certUrl: 'a', fetchStatus: 'ok', identityBlob: HAKOSEM_BLOB, validity: { kind: 'expiry-date', value: '2026-04-01' } },
    { tzoharId: '2', certUrl: 'b', fetchStatus: 'ok', identityBlob: HAKOSEM_BLOB, validity: { kind: 'expiry-date', value: '2026-09-11' } }, // later date
  ];
  const r = resolveCertificate(OUR, candidates, { today: '2026-08-26' });
  assert.equal(r.kind, 'AMBIGUOUS_DATE', 'must not silently prefer the later date — that IS the blind max the Architect forbade');
});

test('THE CLUSTER-AWARE RULE, fired directly: a cluster-mate that does NOT pass identity is excluded even if it has a later, tempting date', () => {
  const candidates = [
    { tzoharId: '1', certUrl: 'a', fetchStatus: 'ok', identityBlob: HAKOSEM_BLOB, validity: { kind: 'expiry-date', value: '2026-09-11' } }, // us, agrees with our record
    { tzoharId: '2', certUrl: 'b', fetchStatus: 'ok', identityBlob: 'עסק שכן לגמרי לא קשור', validity: { kind: 'expiry-date', value: '2030-01-01' } }, // a neighbour with an unrelated identity and a much later date
  ];
  const r = resolveCertificate(OUR, candidates, { today: '2026-08-26' });
  assert.equal(r.kind, 'VERIFIED');
  assert.equal(r.value, '2026-09-11', 'the neighbour\'s 2030 date must never be picked just because it is later — it failed identity, so it is not a candidate at all');
});

test('a candidate with a failed fetch alongside a successful, identity-verified one still resolves normally (one failure does not sink the whole record)', () => {
  const candidates = [
    { tzoharId: '1', certUrl: 'a', fetchStatus: 'unreachable' },
    { tzoharId: '2', certUrl: 'b', fetchStatus: 'ok', identityBlob: HAKOSEM_BLOB, validity: { kind: 'expiry-date', value: '2026-09-11' } },
  ];
  const r = resolveCertificate(OUR, candidates, { today: '2026-08-26' });
  assert.equal(r.kind, 'VERIFIED');
});

test('vintage-year VERIFIED does not compare against certificateValidUntil at all (no "expired" semantic exists for wineries yet)', () => {
  const wineryOur = { name: 'יקב משק דרייר', address: 'באר מילכה', certificateValidUntil: undefined };
  const r = resolveCertificate(wineryOur, [{ tzoharId: '1', certUrl: 'x', fetchStatus: 'ok', identityBlob: "יקב משק דרייר באר - מילכה", validity: { kind: 'vintage-year', value: '2024' } }], { today: '2026-08-26' });
  assert.equal(r.kind, 'VERIFIED');
  assert.equal(r.value, '2024');
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
