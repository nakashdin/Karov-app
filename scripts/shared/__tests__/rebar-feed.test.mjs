// Standalone test (not jest). Run: node scripts/shared/__tests__/rebar-feed.test.mjs
//
// parseRebarStores fixtures are REAL captured text (rebar.co.il/our-stores/,
// fetched 2026-08-26) — not synthetic. matchExistingRebar fixtures are
// constructed-but-realistic (labeled where used) since that function's logic
// (haversine distance against a threshold) doesn't depend on the feed's real
// text shape at all.
import assert from 'node:assert/strict';
import { parseRebarStores, matchExistingRebar, MATCH_RADIUS_KM } from '../rebar-feed.mjs';

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

console.log('rebar-feed.mjs');

// Real raw text captured from rebar.co.il/our-stores/ — a Next.js App Router
// page whose RSC payload backslash-escapes each store object's JSON once
// inside a streamed string literal. Three real, distinct cases: a
// dash-separated branch name with kosher:true, a dash-separated branch name
// with kosher:false, and a bare-city name (no dash) with kosher:true —
// confirming the regex doesn't depend on the "City- Branch" naming shape.
const FIXTURE_MAROM_NAVE = "e},{\\\"name\\\":\\\"רמת גן- מרום נווה\\\",\\\"address\\\":\\\"לנדאו חיים 7\\\",\\\"city\\\":\\\"רמת גן\\\",\\\"active\\\":true,\\\"latitude\\\":32.07153,\\\"longitude\\\":34.828277,\\\"hasDelivery\\\":true,\\\"hasPickup\\\":true,\\\"kosher\\\":true,\\\"weekDaysOpeningHour\\\":\\\"08:30:00\\\",\\\"weekDaysClosingHour\\\":\\\"21:30:00\\\",\\\"fridayOpeningHour\\\":\\\"08:30:00\\\",\\\"fridayClosingHour\\\":\\\"15:00:00\\\",\\\"saturdayOpeningHour\\\":\\\"04:30:00\\\",\\\"saturdayClosingHour\\\":\\\"11:00:00\\\",\\\"accessibleParking\\\":true,\\\"accessibleRestroom\\\":true,\\\"accessi";
const FIXTURE_KFAR_SABA_FALSE = "e},{\\\"name\\\":\\\"כפר סבא- מתחם G\\\",\\\"address\\\":\\\"ויצמן 207\\\",\\\"city\\\":\\\"כפר סבא\\\",\\\"active\\\":true,\\\"latitude\\\":32.1720743,\\\"longitude\\\":34.9284373,\\\"hasDelivery\\\":true,\\\"hasPickup\\\":true,\\\"kosher\\\":false,\\\"weekDaysOpeningHour\\\":\\\"09:00:00\\\",\\\"weekDaysClosingHour\\\":\\\"22:00:00\\\",\\\"fridayOpeningHour\\\":\\\"08:45:00\\\",\\\"fridayClosingHour\\\":\\\"14:45:00\\\",\\\"saturdayOpeningHour\\\":\\\"10:30:00\\\",\\\"saturdayClosingHour\\\":\\\"22:30:00\\\",\\\"accessibleParking\\\":true,\\\"accessibleRestroom\\\":true";
const FIXTURE_GANEI_TIKVA = "e},{\\\"name\\\":\\\"גני תקווה\\\",\\\"address\\\":\\\"ההדרים 7\\\",\\\"city\\\":\\\"גני תקווה\\\",\\\"active\\\":true,\\\"latitude\\\":32.0656967,\\\"longitude\\\":34.8757546,\\\"hasDelivery\\\":true,\\\"hasPickup\\\":true,\\\"kosher\\\":true,\\\"weekDaysOpeningHour\\\":\\\"08:30:00\\\",\\\"weekDaysClosingHour\\\":\\\"22:30:00\\\",\\\"fridayOpeningHour\\\":\\\"08:30:00\\\",\\\"fridayClosingHour\\\":\\\"16:00:00\\\",\\\"saturdayOpeningHour\\\":\\\"20:15:00\\\",\\\"saturdayClosingHour\\\":\\\"22:30:00\\\",\\\"accessib";

// ── parseRebarStores ─────────────────────────────────────────────────────

test('REAL: dash-separated branch name, kosher:true — full field extraction', () => {
  const [s] = parseRebarStores(FIXTURE_MAROM_NAVE);
  assert.equal(s.name, 'רמת גן- מרום נווה');
  assert.equal(s.address, 'לנדאו חיים 7');
  assert.equal(s.city, 'רמת גן');
  assert.equal(s.active, true);
  assert.equal(s.lat, 32.07153);
  assert.equal(s.lng, 34.828277);
  assert.equal(s.kosher, true);
});

test('REAL: dash-separated branch name, kosher:false — the boolean is read correctly in both directions, not assumed true', () => {
  const [s] = parseRebarStores(FIXTURE_KFAR_SABA_FALSE);
  assert.equal(s.name, 'כפר סבא- מתחם G');
  assert.equal(s.kosher, false);
});

test('REAL: a bare city name with no dash-separated branch qualifier still parses — the regex does not depend on the "City- Branch" shape', () => {
  const [s] = parseRebarStores(FIXTURE_GANEI_TIKVA);
  assert.equal(s.name, 'גני תקווה');
  assert.equal(s.kosher, true);
});

test('REAL, REGRESSION: three real store objects concatenated parse into exactly three separate results, in order — this is the actual regression test for the over-consumption bug (the first attempt at this regex produced 1 giant match instead of 107 on the real page; fired directly by reverting STORE_RE to the original loose capture group and confirming this exact assertion drops from 3 to 1)', () => {
  const combined = FIXTURE_MAROM_NAVE + FIXTURE_KFAR_SABA_FALSE + FIXTURE_GANEI_TIKVA;
  const stores = parseRebarStores(combined);
  assert.equal(stores.length, 3);
  assert.deepEqual(stores.map((s) => s.name), ['רמת גן- מרום נווה', 'כפר סבא- מתחם G', 'גני תקווה']);
});

test('no store-shaped content at all -> empty array, not a guess', () => {
  assert.deepEqual(parseRebarStores('totally unrelated text with no store objects'), []);
});

// ── matchExistingRebar ───────────────────────────────────────────────────
// Constructed-but-realistic: this function's logic is pure geo-distance
// math and doesn't depend on the feed's real text shape.

const RAMAT_GAN_STORE = { name: 'test', lat: 32.0720, lng: 34.8290 };

test('a feed store within MATCH_RADIUS_KM of an existing record matches it', () => {
  const existing = [{ id: 'rebar-existing1', location: { latitude: 32.0715, longitude: 34.8285 } }];
  const r = matchExistingRebar(RAMAT_GAN_STORE, existing);
  assert.ok(r, 'expected a match');
  assert.equal(r.matched.id, 'rebar-existing1');
});

test('a feed store far from every existing record matches nothing', () => {
  const existing = [{ id: 'rebar-far', location: { latitude: 31.2, longitude: 34.8 } }]; // Beer Sheva, ~90km away
  const r = matchExistingRebar(RAMAT_GAN_STORE, existing);
  assert.equal(r, null);
});

test('VIOLATION-CHECK: a record just outside MATCH_RADIUS_KM does not match — the threshold is a real boundary, not decorative', () => {
  // ~0.6km north — outside the 0.5km radius.
  const existing = [{ id: 'rebar-justoutside', location: { latitude: 32.0720 + 0.0054, longitude: 34.8290 } }];
  const r = matchExistingRebar(RAMAT_GAN_STORE, existing);
  assert.equal(r, null, `expected no match just outside ${MATCH_RADIUS_KM}km`);
});

test('picks the NEAREST existing record when multiple are within radius, not just the first in the array', () => {
  const existing = [
    { id: 'rebar-farther', location: { latitude: 32.0730, longitude: 34.8300 } },
    { id: 'rebar-nearest', location: { latitude: 32.0721, longitude: 34.8291 } },
  ];
  const r = matchExistingRebar(RAMAT_GAN_STORE, existing);
  assert.equal(r.matched.id, 'rebar-nearest');
});

test('a record with no location is silently skipped, not a crash', () => {
  const existing = [{ id: 'rebar-nolocation' }, { id: 'rebar-close', location: { latitude: 32.0721, longitude: 34.8291 } }];
  const r = matchExistingRebar(RAMAT_GAN_STORE, existing);
  assert.equal(r.matched.id, 'rebar-close');
});

test('REAL, REGRESSION: address containment recovers a stale-coordinate existing record that distance alone misses — the real rebar-8b7c4c33 case (found by running the importer dry-run against the live dataset, not by reasoning about it): its stored coordinate is 1.2km from the feed\'s own coordinate for the exact same address, which the 0.5km radius alone would call "no match -> new record", creating a duplicate of a branch that already exists', () => {
  const store = { name: 'גני תקווה', address: 'ההדרים 7', city: 'גני תקווה', lat: 32.0656967, lng: 34.8757546, kosher: true };
  const existing = [{ id: 'rebar-8b7c4c33', address: 'ההדרים 7, גני תקווה', location: { latitude: 32.05616760253906, longitude: 34.882259368896484 } }];
  const r = matchExistingRebar(store, existing);
  assert.ok(r, 'address containment must recover this match even though distance alone (1.2km, outside the 0.5km radius) does not');
  assert.equal(r.matched.id, 'rebar-8b7c4c33');
  assert.equal(r.via, 'address');
});

test('REAL, REGRESSION: the second real stale-coordinate case (rebar-ca53bc00, never geocoded since the original 2026-07 hand-typed estimate — 2.9km from the feed\'s own coordinate)', () => {
  const store = { name: 'קריית אונו', address: 'הקריה האקדמית אונו', city: 'קריית אונו', lat: 32.0369113, lng: 34.8657244, kosher: true };
  const existing = [{ id: 'rebar-ca53bc00', address: 'הקריה האקדמית אונו', location: { latitude: 32.062, longitude: 34.856 } }];
  const r = matchExistingRebar(store, existing);
  assert.ok(r);
  assert.equal(r.matched.id, 'rebar-ca53bc00');
  assert.equal(r.via, 'address');
});

test('VIOLATION-CHECK: address containment does not turn into "any short address matches" — a genuinely different branch with an unrelated address, far away, still matches nothing', () => {
  const store = { name: 'Somewhere else entirely', address: 'רחוב אחר לגמרי 99', city: 'עיר אחרת', lat: 33.5, lng: 35.5 };
  const existing = [{ id: 'rebar-unrelated', address: 'ההדרים 7, גני תקווה', location: { latitude: 32.056, longitude: 34.882 } }];
  const r = matchExistingRebar(store, existing);
  assert.equal(r, null);
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
