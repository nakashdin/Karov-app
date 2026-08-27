// Standalone test (not jest — .mjs files aren't in jest's testMatch).
// Run: node scripts/shared/__tests__/tzohar-identity-match.test.mjs
//
// Pure functions, no network, no I/O — every fixture below is either a real
// record from our own dataset or a real entry independently fetched from
// Tzohar's store_search feed (2026-08-26, Tel Aviv sweep), not invented, so
// the "matched"/"ambiguous" cases below are grounded in what the feed
// actually returns, not a convenient story.
import assert from 'node:assert/strict';
import {
  nameScore,
  haversineKm,
  distanceScore,
  phoneScore,
  scoreCandidate,
  matchTzoharRecord,
} from '../tzohar-identity-match.mjs';

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

console.log('tzohar-identity-match.mjs');

// ── nameScore ────────────────────────────────────────────────────────────

test('nameScore: identical names score 1', () => {
  assert.equal(nameScore('הקוסם', 'הקוסם'), 1);
});
test('nameScore: gershayim/quote noise does not depress an otherwise-identical name (real pair: צ\'יטה)', () => {
  assert.equal(nameScore('יקב צ\'יטה', 'יקב צ׳יטה'), 1);
});
test('nameScore: one name containing the other gets a high floor (chain branch naming, real pair)', () => {
  const s = nameScore('עוגות דה לה פה', 'עוגות דה לה פה רמת גן');
  assert.ok(s >= 0.85, `expected >= 0.85, got ${s}`);
});
test('nameScore: unrelated names score low', () => {
  const s = nameScore('הקוסם', 'ממלכת הפירות');
  assert.ok(s < 0.3, `expected < 0.3, got ${s}`);
});
test('nameScore: empty on either side scores 0, not a crash', () => {
  assert.equal(nameScore('', 'הקוסם'), 0);
  assert.equal(nameScore('הקוסם', undefined), 0);
});

// ── haversineKm / distanceScore ─────────────────────────────────────────

test('haversineKm: two real near-identical coordinates (our hakosem record vs the live feed entry) are under 20 meters apart', () => {
  const km = haversineKm(32.07638931274414, 34.77668380737305, 32.076406, 34.776712);
  assert.ok(km < 0.02, `expected < 0.02km, got ${km}`);
});
test('haversineKm: missing coordinates return null, not NaN or a crash', () => {
  assert.equal(haversineKm(null, 34.7, 32.1, 34.8), null);
  assert.equal(haversineKm(32.1, 34.7, undefined, 34.8), null);
});
test('distanceScore: null distance (no coordinates) is null, distinct from "far" (0)', () => {
  assert.equal(distanceScore(null), null);
  assert.equal(distanceScore(50), 0);
  assert.equal(distanceScore(0.1), 1);
});

// ── phoneScore ───────────────────────────────────────────────────────────

test('phoneScore: matching numbers in different formats (dashes, leading 972) score 1', () => {
  assert.equal(phoneScore('03-9470111', '039470111'), 1);
  assert.equal(phoneScore('+972-3-9470111', '03-9470111'), 1);
});
test('phoneScore: genuinely different numbers score 0 (real negative signal)', () => {
  assert.equal(phoneScore('03-9470111', '02-5020320'), 0);
});
test('phoneScore: absent on either side is null (no signal), never a penalty', () => {
  assert.equal(phoneScore('', '03-9470111'), null);
  assert.equal(phoneScore('03-9470111', null), null);
});

// ── scoreCandidate: filenames are never inspected ───────────────────────

test('VIOLATION-CHECK: scoreCandidate never receives or uses a certificate URL/filename (Tzohar filenames are proven unreliable: dikkkkknter.pdf for יקב דיקנטר)', () => {
  const our = { name: 'יקב דיקנטר', location: { latitude: 32.5, longitude: 35.0 }, phone: null };
  const live = { store: 'יקב דיקנטר', lat: 32.5, lng: 35.0, phone: null, certUrl: 'https://www.tzohar.org.il/wp-content/uploads/dikkkkknter.pdf' };
  // scoreCandidate's signature takes no url/certUrl parameter at all — this
  // asserts the function still scores purely on name+distance+phone even
  // when a wildly mismatched filename is present on the object, proving the
  // filename field is structurally unreachable by the scoring logic, not
  // merely unused by convention.
  const r = scoreCandidate(our, live);
  assert.ok(r.score > 0.9, `expected a strong match ignoring the nonsense filename, got ${r.score}`);
});

// ── matchTzoharRecord: real fixtures from our dataset + a real feed sweep ──

const TLV_FEED = [
  { tzoharId: '62458', store: "מאנצ'יט", address: 'אבן גבירול 113', city: 'תל אביב - יפו', lat: 32.08701, lng: 34.781944, phone: null },
  { tzoharId: '27222', store: 'טורטה דה לה נונה', address: 'מלכי ישראל 13', city: 'תל אביב', lat: 32.080595, lng: 34.779724, phone: null },
  { tzoharId: '39912', store: 'הקוסם', address: 'שלמה המלך 1', city: 'תל אביב יפו', lat: 32.076406, lng: 34.776712, phone: null },
  { tzoharId: '58153', store: 'עוגות דה לה פה רמת גן', address: 'תובל 26', city: 'רמת גן', lat: 32.086829, lng: 34.803118, phone: null },
  { tzoharId: '35594', store: 'עוגות דה לה פה', address: 'תובל 26', city: 'רמת גן', lat: 32.086835, lng: 34.803187, phone: null },
];

test('REAL: our hakosem record matches the live הקוסם entry — clear winner, name+distance both strong', () => {
  const our = { name: 'הקוסם', location: { latitude: 32.07638931274414, longitude: 34.77668380737305 }, phone: null };
  const r = matchTzoharRecord(our, TLV_FEED);
  assert.equal(r.status, 'matched');
  assert.equal(r.matchedEntry.tzoharId, '39912');
});

test('REAL: an unrelated business name against this feed is unmatched, not force-fit to the nearest name', () => {
  const our = { name: 'פיצה שמש', location: { latitude: 31.7, longitude: 35.0 }, phone: null }; // far away, name absent from feed
  const r = matchTzoharRecord(our, TLV_FEED);
  assert.equal(r.status, 'unmatched');
});

test('REAL, THE AMBIGUOUS CASE FROM THE ACTUAL FEED: "עוגות דה לה פה" (Ramat Gan) has two live candidates ~7 meters apart with near-identical names — not auto-resolved to either', () => {
  const our = { name: 'עוגות דה לה פה', location: { latitude: 32.08683, longitude: 34.80315 }, phone: null };
  const r = matchTzoharRecord(our, TLV_FEED);
  // Confirmed empirically (margin 0.09 vs the 0.15 floor) before this assertion was
  // tightened to a single expected status — an earlier version of this test accepted
  // 'ambiguous' OR 'matched', which meant disabling the margin check entirely still
  // passed it. Found by firing that exact sabotage, not by re-reading the assertion.
  assert.equal(r.status, 'ambiguous', 'two near-identical real candidates must not be silently resolved to either one');
  const ids = r.candidates.slice(0, 2).map((c) => c.entry.tzoharId).sort();
  assert.deepEqual(ids, ['35594', '58153']);
});

test('phone-match-override: an exact phone match wins even when name/distance alone would not have cleared the bar', () => {
  const our = { name: 'חומוס כספי - סניף החדש', location: { latitude: 30.0, longitude: 35.5 }, phone: '03-9470111' }; // far away, name only partially overlaps
  const live = [{ tzoharId: '999', store: 'חומוס כספי', address: 'יעל רום 8', city: 'פתח תקווה', lat: 32.0987, lng: 34.8816, phone: '039470111' }];
  const r = matchTzoharRecord(our, live);
  assert.equal(r.status, 'matched');
  assert.equal(r.breakdown.breakdown, 'phone-match-override');
});

test('VIOLATION: an exact-name, DIFFERENT-phone candidate is penalized, not treated as a clean match (real negative signal, not neutral)', () => {
  const our = { name: 'ארומה', location: { latitude: 32.08, longitude: 34.78 }, phone: '03-1111111' };
  const live = [{ tzoharId: '1', store: 'ארומה', address: 'somewhere', city: 'תל אביב', lat: 32.08, lng: 34.78, phone: '03-2222222' }];
  const withoutPhone = scoreCandidate({ ...our, phone: null }, { ...live[0], phone: null });
  const withMismatchedPhone = scoreCandidate(our, live[0]);
  assert.ok(withMismatchedPhone.score < withoutPhone.score, `mismatched phone (${withMismatchedPhone.score}) should score lower than no phone signal at all (${withoutPhone.score})`);
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
