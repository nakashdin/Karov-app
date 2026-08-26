// Standalone test (not jest). Run: node scripts/shared/__tests__/rebar-feed.test.mjs
//
// parseRebarStores fixtures are REAL captured text (rebar.co.il/our-stores/,
// fetched 2026-08-26) — not synthetic. matchRebarStores fixtures use real
// coordinates/addresses for the three genuine ambiguity cases (labeled),
// plus constructed-but-realistic cases for the shape checks (also labeled).
import assert from 'node:assert/strict';
import { parseRebarStores, countStoreAnchors, countLatitudeAnchors, matchRebarStores, fetchRebarStores } from '../rebar-feed.mjs';

let passed = 0;
const queue = [];
// Queued, not run immediately: some tests below are async (fetchRebarStores
// with an injected fetchImpl). Running them fire-and-forget would let the
// final summary print before they resolve; queuing and awaiting each in
// order at the bottom keeps output order and the pass count both correct
// for sync and async tests alike.
function test(name, fn) {
  queue.push({ name, fn });
}
async function runQueued() {
  for (const { name, fn } of queue) {
    try {
      await fn();
      passed++;
      console.log(`  ok - ${name}`);
    } catch (err) {
      console.error(`  FAIL - ${name}`);
      console.error(`    ${err.stack ?? err.message}`);
      process.exitCode = 1;
    }
  }
}

console.log('rebar-feed.mjs');

// Real raw text captured from rebar.co.il/our-stores/ — a Next.js App Router
// page whose RSC payload double-escapes the store array (see module header:
// a structural quote carries one backslash, a quote INSIDE a value — the
// standard Hebrew abbreviation form, e.g. רמב"ם — carries three, because it
// went through both the inner JSON.stringify AND the outer RSC wrapping).
const FIXTURE_RAMBAM = "e},{\\\"name\\\":\\\"חיפה- רמב\\\\\\\"ם\\\",\\\"address\\\":\\\"העלייה השנייה 8\\\",\\\"city\\\":\\\"חיפה\\\",\\\"active\\\":true,\\\"latitude\\\":32.8329875,\\\"longitude\\\":34.9857066,\\\"hasDelivery\\\":false,\\\"hasPickup\\\":true,\\\"kosher\\\":true,\\\"weekDaysOpeningHour\\\":\\\"08:00:00\\\",\\\"weekDaysClo";
const FIXTURE_HASDELIVERY_NULL = "e},{\\\"name\\\":\\\"פרדס חנה- ביג\\\",\\\"address\\\":\\\"תדהר 1\\\",\\\"city\\\":\\\"פרדס חנה\\\",\\\"active\\\":true,\\\"latitude\\\":32.4880285,\\\"longitude\\\":34.9700611,\\\"hasDelivery\\\":null,\\\"hasPickup\\\":true,\\\"kosher\\\":null,\\\"weekDaysOpeningHour\\\":\\\"09:00:00\\\",\\\"weekDaysClosingHou";
const FIXTURE_MAROM_NAVE = "e},{\\\"name\\\":\\\"רמת גן- מרום נווה\\\",\\\"address\\\":\\\"לנדאו חיים 7\\\",\\\"city\\\":\\\"רמת גן\\\",\\\"active\\\":true,\\\"latitude\\\":32.07153,\\\"longitude\\\":34.828277,\\\"hasDelivery\\\":true,\\\"hasPickup\\\":true,\\\"kosher\\\":true,\\\"weekDaysOpeningHour\\\":\\\"08:30:00\\\",\\\"weekDaysClosingHour\\\":\\\"21:30:00\\\",\\\"fridayOpeningHour\\\":\\\"08:30:00\\\",\\\"fridayClosingHour\\\":\\\"15:00:00\\\",\\\"saturdayOpeningHour\\\":\\\"04:30:00\\\",\\\"saturdayClosingHour\\\":\\\"11:00:00\\\",\\\"accessibleParking\\\":true,\\\"accessibleRestroom\\\":true,\\\"accessi";
const FIXTURE_KFAR_SABA_FALSE = "e},{\\\"name\\\":\\\"כפר סבא- מתחם G\\\",\\\"address\\\":\\\"ויצמן 207\\\",\\\"city\\\":\\\"כפר סבא\\\",\\\"active\\\":true,\\\"latitude\\\":32.1720743,\\\"longitude\\\":34.9284373,\\\"hasDelivery\\\":true,\\\"hasPickup\\\":true,\\\"kosher\\\":false,\\\"weekDaysOpeningHour\\\":\\\"09:00:00\\\",\\\"weekDaysClosingHour\\\":\\\"22:00:00\\\",\\\"fridayOpeningHour\\\":\\\"08:45:00\\\",\\\"fridayClosingHour\\\":\\\"14:45:00\\\",\\\"saturdayOpeningHour\\\":\\\"10:30:00\\\",\\\"saturdayClosingHour\\\":\\\"22:30:00\\\",\\\"accessibleParking\\\":true,\\\"accessibleRestroom\\\":true";
const FIXTURE_GANEI_TIKVA = "e},{\\\"name\\\":\\\"גני תקווה\\\",\\\"address\\\":\\\"ההדרים 7\\\",\\\"city\\\":\\\"גני תקווה\\\",\\\"active\\\":true,\\\"latitude\\\":32.0656967,\\\"longitude\\\":34.8757546,\\\"hasDelivery\\\":true,\\\"hasPickup\\\":true,\\\"kosher\\\":true,\\\"weekDaysOpeningHour\\\":\\\"08:30:00\\\",\\\"weekDaysClosingHour\\\":\\\"22:30:00\\\",\\\"fridayOpeningHour\\\":\\\"08:30:00\\\",\\\"fridayClosingHour\\\":\\\"16:00:00\\\",\\\"saturdayOpeningHour\\\":\\\"20:15:00\\\",\\\"saturdayClosingHour\\\":\\\"22:30:00\\\",\\\"accessib";

// ── parseRebarStores ─────────────────────────────────────────────────────

test('REAL, REGRESSION (the escape-depth bug — the serious one, found by the Architect independently re-deriving this module): a name containing a literal internal quote (חיפה- רמב"ם, the standard Hebrew abbreviation form) parses correctly and the quote survives as ONE real character, not the 4-byte escaped sequence and not truncated', () => {
  const [s] = parseRebarStores(FIXTURE_RAMBAM);
  assert.ok(s, 'the store must be found at all — this exact case silently vanished from two earlier extraction attempts (107, then 115 parsed entries) with no error');
  assert.equal(s.name, 'חיפה- רמב"ם');
  assert.equal([...s.name].length, 11, 'exactly one real quote character between ב and ם, not the 4-char escaped sequence still embedded');
  assert.equal(s.address, 'העלייה השנייה 8');
  assert.equal(s.city, 'חיפה');
  assert.equal(s.lat, 32.8329875);
  assert.equal(s.lng, 34.9857066);
  assert.equal(s.kosher, true);
});

test('REAL: hasDelivery:null (not always boolean — real feed entries carry it) does not block parsing; the anchor tolerates true/false/null without caring which', () => {
  const [s] = parseRebarStores(FIXTURE_HASDELIVERY_NULL);
  assert.ok(s, 'a null hasDelivery value must not prevent the store from parsing at all');
  assert.equal(s.name, 'פרדס חנה- ביג');
  assert.equal(s.kosher, null, 'this same real entry also has kosher:null — genuinely ambiguous in the source, not a parser artifact');
});

test('REAL: dash-separated branch name, kosher:true — full field extraction (a name with no embedded quote, the common case)', () => {
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

test('REAL, REGRESSION: five real store objects concatenated (including the rambam quote case and the hasDelivery:null case) parse into exactly five separate results, in order — fired directly by reverting VALUE to the original [^\\\\"]* class and confirming this drops', () => {
  const combined = FIXTURE_RAMBAM + FIXTURE_HASDELIVERY_NULL + FIXTURE_MAROM_NAVE + FIXTURE_KFAR_SABA_FALSE + FIXTURE_GANEI_TIKVA;
  const stores = parseRebarStores(combined);
  assert.equal(stores.length, 5);
  assert.deepEqual(stores.map((s) => s.name), ['חיפה- רמב"ם', 'פרדס חנה- ביג', 'רמת גן- מרום נווה', 'כפר סבא- מתחם G', 'גני תקווה']);
});

test('no store-shaped content at all -> empty array, not a guess', () => {
  assert.deepEqual(parseRebarStores('totally unrelated text with no store objects'), []);
});

// ── countStoreAnchors ────────────────────────────────────────────────────

test('countStoreAnchors counts one per store regardless of what is inside name/address/city — the exact countermeasure the module promises ("compare against a known-good count") and the one earlier attempts named but never built', () => {
  const combined = FIXTURE_RAMBAM + FIXTURE_HASDELIVERY_NULL + FIXTURE_MAROM_NAVE + FIXTURE_KFAR_SABA_FALSE + FIXTURE_GANEI_TIKVA;
  assert.equal(countStoreAnchors(combined), 5);
  assert.equal(countStoreAnchors(combined), parseRebarStores(combined).length, 'anchor count and parsed count must agree on real, fully-formed fixtures');
});

test('countStoreAnchors is immune to the exact bug that dropped a store: even if parsing failed and returned fewer stores, the anchor count on the same raw text stays correct, which is what lets a caller detect the shortfall', () => {
  // The anchor scans for "kosher": literally, independent of name/address/city content — confirmed by counting on text a broken parser would mis-parse.
  assert.equal(countStoreAnchors(FIXTURE_RAMBAM), 1);
});

// ── fetchRebarStores (the end-to-end shortfall guard) ───────────────────

function fakeFetch(text, ok = true, status = 200) {
  return async () => ({ ok, status, text: async () => text });
}

test('fetchRebarStores throws when the parsed count is LOWER than the anchor count — the actual end-to-end version of the countermeasure that would have caught the missing רמב"ם', async () => {
  // Two real "kosher" anchors AND two real "latitude" anchors (so the
  // cross-key check passes and does not fire first), but the second store
  // is deliberately malformed (missing "city"/"active") so only one parses.
  const twoAnchorsOneParses = FIXTURE_MAROM_NAVE + '\\"name\\":\\"Broken\\",\\"address\\":\\"x\\",\\"latitude\\":1,\\"kosher\\":true,';
  await assert.rejects(
    () => fetchRebarStores(fakeFetch(twoAnchorsOneParses)),
    /parsed 1 stores but the raw text has 2/,
  );
});

test('fetchRebarStores throws when the "kosher" and "latitude" anchor counts disagree — a whole store object missing its kosher key entirely, invisible to the parsed-vs-kosher-anchor check alone since both drop together', async () => {
  // One real store (1 kosher anchor, 1 latitude anchor) plus a second store
  // object that has a latitude but genuinely no "kosher" key at all.
  const mismatched = FIXTURE_MAROM_NAVE + '\\"name\\":\\"NoKosherKey\\",\\"address\\":\\"x\\",\\"city\\":\\"y\\",\\"active\\":true,\\"latitude\\":2,\\"longitude\\":2,';
  await assert.rejects(
    () => fetchRebarStores(fakeFetch(mismatched)),
    /"kosher": 1 vs "latitude": 2.*"kosher" key is short/s,
  );
});

test('fetchRebarStores throws when "latitude" is the short key (the symmetric direction) — a store object with a kosher value but missing its latitude field entirely', async () => {
  const mismatched = FIXTURE_MAROM_NAVE + '\\"name\\":\\"NoLatitudeKey\\",\\"address\\":\\"x\\",\\"city\\":\\"y\\",\\"active\\":true,\\"kosher\\":true,';
  await assert.rejects(
    () => fetchRebarStores(fakeFetch(mismatched)),
    /"kosher": 2 vs "latitude": 1.*"latitude" key is short/s,
  );
});

test('countLatitudeAnchors counts independently of countStoreAnchors — both read 2 on a real two-store control', () => {
  const combined = FIXTURE_MAROM_NAVE + FIXTURE_RAMBAM;
  assert.equal(countStoreAnchors(combined), 2);
  assert.equal(countLatitudeAnchors(combined), 2);
});

test('fetchRebarStores does NOT throw when the parsed count matches the anchor count exactly', async () => {
  const stores = await fetchRebarStores(fakeFetch(FIXTURE_MAROM_NAVE + FIXTURE_RAMBAM));
  assert.equal(stores.length, 2);
});

test('fetchRebarStores throws on a non-ok HTTP response, distinctly from a parsing shortfall', async () => {
  await assert.rejects(() => fetchRebarStores(fakeFetch('', false, 503)), /HTTP 503/);
});

// ── matchRebarStores ─────────────────────────────────────────────────────
// Three REAL ambiguity cases (found by the Architect checking every existing
// record for 2+ candidates, not just trusting "nearest" — real coordinates
// and addresses, not constructed).

const REAL_EXISTING = [
  { id: 'rebar-02629c63', name: 'רי בר rebar שער הצפון', address: 'דרך חיפה 52, שער הצפון', location: { latitude: 32.808658599853516, longitude: 35.0755500793457 } },
  { id: 'rebar-dc59d466', name: 'רי בר rebar קניון הנגב', address: 'שדרות יצחק רגר 2, קניון הנגב, באר שבע', location: { latitude: 31.24372673034668, longitude: 34.794456481933594 } },
  { id: 'rebar-bs-central-station', name: 'רי בר rebar באר שבע תחנה מרכזית', address: 'תחנת אגד, באר שבע', location: { latitude: 31.242630004882812, longitude: 34.7978630065918 } },
];
const REAL_STORES = [
  { name: 'קרית אתא- שער הצפון', address: 'דרך חיפה 52', city: 'קרית אתא', lat: 32.8087188, lng: 35.0754627, kosher: true },
  { name: 'חיפה- ביג קריות', address: 'שדרות ההסתדרות 248', city: 'חיפה', lat: 32.8099025, lng: 35.0729685, kosher: false },
  { name: 'באר שבע- קניון הנגב', address: 'שדרות יצחק רגר 2', city: 'באר שבע', lat: 31.243726, lng: 34.7946189, kosher: true },
  { name: 'באר שבע- תחנה מרכזית', address: 'תחנה אגד באר שבע', city: 'באר שבע', lat: 31.243017, lng: 34.796741, kosher: true },
];

test('REAL, REGRESSION: rebar-02629c63 ("שער הצפון") has TWO candidates within radius — one kosher:true, one kosher:false — and is reported AMBIGUOUS, never resolved to the nearer one', () => {
  const { ambiguousRecords, confirmed } = matchRebarStores(REAL_STORES, REAL_EXISTING);
  const hit = ambiguousRecords.find((a) => a.record.id === 'rebar-02629c63');
  assert.ok(hit, 'expected rebar-02629c63 to be reported ambiguous');
  assert.equal(hit.candidates.length, 2);
  assert.ok(!confirmed.some((c) => c.record.id === 'rebar-02629c63'), 'must never appear in confirmed — a contradictory pair must not be silently resolved by distance');
});

test('REAL, REGRESSION (the dangerous one — both candidates kosher:true, so nothing LOOKS wrong): rebar-dc59d466 ("קניון הנגב") and rebar-bs-central-station ("תחנה מרכזית") mutually cross-claim the SAME two real Beer Sheva feed stores — both reported ambiguous, neither resolved by nearest-wins', () => {
  const { ambiguousRecords, confirmed } = matchRebarStores(REAL_STORES, REAL_EXISTING);
  const ids = ambiguousRecords.map((a) => a.record.id);
  assert.ok(ids.includes('rebar-dc59d466'), 'expected rebar-dc59d466 ambiguous');
  assert.ok(ids.includes('rebar-bs-central-station'), 'expected rebar-bs-central-station ambiguous — this is one of the two original branches this entire effort started from');
  assert.ok(!confirmed.some((c) => c.record.id === 'rebar-dc59d466' || c.record.id === 'rebar-bs-central-station'));
});

test('REAL: with only ONE existing record and its one true unambiguous match present, the pairing IS confirmed — ambiguity comes from the crowded real population above, not from the matcher being unable to ever confirm anything', () => {
  const store = { name: 'רמת גן- מרום נווה', address: 'לנדאו חיים 7', city: 'רמת גן', lat: 32.07153, lng: 34.828277, kosher: true };
  const existing = [{ id: 'rebar-a28c1ea4', name: 'רי בר rebar רמת אפעל', address: 'דרך שיבא 14, רמת גן', location: { latitude: 32.0513916015625, longitude: 34.83946228027344 } }];
  // This existing record is NOT near the store at all — sanity: confirms a genuinely isolated pair resolves cleanly when it's the only candidate.
  const isolatedExisting = [{ id: 'rebar-marom', name: 'רי בר rebar מרום נווה', address: 'לנדאו חיים 7, רמת גן', location: { latitude: 32.07153, longitude: 34.828277 } }];
  const { confirmed, ambiguousRecords } = matchRebarStores([store], isolatedExisting);
  assert.equal(ambiguousRecords.length, 0);
  assert.equal(confirmed.length, 1);
  assert.equal(confirmed[0].record.id, 'rebar-marom');
});

test('VIOLATION-CHECK: a record with zero candidates at all is neither confirmed nor ambiguous — it is noMatchRecords', () => {
  const existing = [{ id: 'rebar-nowhere', name: 'x', address: 'רחוב שלא קיים בשום מקום 999', location: { latitude: 0, longitude: 0 } }];
  const { confirmed, ambiguousRecords, noMatchRecords } = matchRebarStores(REAL_STORES, existing);
  assert.equal(confirmed.length, 0);
  assert.equal(ambiguousRecords.length, 0);
  assert.equal(noMatchRecords.length, 1);
});

test('a kosher:true store with zero candidate existing records is reported as NEW', () => {
  const store = { name: 'Totally New Branch', address: 'כתובת חדשה 1', city: 'עיר חדשה', lat: 29.0, lng: 35.0, kosher: true };
  const { newStores } = matchRebarStores([store], []);
  assert.equal(newStores.length, 1);
  assert.equal(newStores[0].name, 'Totally New Branch');
});

test('a kosher:false store with zero candidates is NOT reported as new — only kosher:true stores are import candidates', () => {
  const store = { name: 'Somewhere not kosher', address: 'כתובת 1', city: 'עיר', lat: 29.0, lng: 35.0, kosher: false };
  const { newStores } = matchRebarStores([store], []);
  assert.equal(newStores.length, 0);
});

test('a store that is itself part of an ambiguous pairing is never ALSO counted as new, even though it technically has zero "confirmed" record', () => {
  // Two existing records both close to one store: the store has 2 candidate records (ambiguous from both sides), must not leak into newStores.
  const store = { name: 'shared', address: 'shared address', city: 'x', lat: 32.0, lng: 34.8, kosher: true };
  const existing = [
    { id: 'rebar-a', address: 'shared address', location: { latitude: 32.0001, longitude: 34.8001 } },
    { id: 'rebar-b', address: 'shared address', location: { latitude: 32.0002, longitude: 34.8002 } },
  ];
  const { newStores, ambiguousRecords } = matchRebarStores([store], existing);
  assert.equal(ambiguousRecords.length, 2, 'both existing records see 1 candidate each here, but that candidate (the store) itself is claimed by 2 records, so both must be ambiguous');
  assert.equal(newStores.length, 0, 'a store already implicated in an ambiguity must never also be offered as a fresh "new" candidate');
});

await runQueued();
console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
