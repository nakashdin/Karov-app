// Standalone test (not jest — .mjs files aren't in jest's testMatch).
// Run: node scripts/shared/__tests__/tzohar-store-search.test.mjs
//
// No live network calls in this suite — fetchStoreSearch()/sweepIsrael()
// take an injectable fetchImpl specifically so this can be tested
// deterministically and without hammering a third party's production
// server on every CI run. The response fixture below is a real sample
// independently captured from the live endpoint on 2026-08-26 (Tel Aviv,
// lat=32.0853 lng=34.7818), trimmed to two entries — not invented.
import assert from 'node:assert/strict';
import { fetchStoreSearch, israelGrid, sweepIsrael, ISRAEL_BBOX } from '../../../importers/tzohar/store-search.mjs';

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
async function testAsync(name, fn) {
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

console.log('tzohar-store-search.mjs');

// Real fixture, captured 2026-08-26 from a live Tel Aviv sweep — includes
// the exact HTML-entity-encoded apostrophe form Tzohar's feed actually uses.
const REAL_SAMPLE_RESPONSE = [
  {
    address: 'אבן גבירול 113', store: "מאנצ&#039;יט", thumb: '', id: '62458', distance: 0.2,
    address2: 'https://www.tzohar.org.il/wp-content/uploads/mantz.pdf', city: 'תל אביב - יפו',
    state: '', zip: '', country: 'ישראל', lat: '32.08701', lng: '34.781944',
    phone: '', fax: '', email: '', hours: '', url: '',
    terms: [{ name: 'חלבי', slug: 'milk', term_id: 832 }],
  },
  {
    address: 'תושיה 6', store: 'פיקה &#8211; Fika', thumb: '', id: '53695', distance: 1.1,
    address2: 'https://www.tzohar.org.il/wp-content/uploads/fika.pdf', city: 'תל אביב - יפו',
    state: '', zip: '', country: 'ישראל', lat: '32.066634', lng: '34.788253',
    phone: '', fax: '', email: '', hours: '', url: '',
    terms: [{ name: 'חלבי', slug: 'milk', term_id: 832 }],
  },
];

function fakeFetch(responsesByCall) {
  let call = 0;
  return async (url) => {
    const body = responsesByCall[call++] ?? [];
    return { ok: true, json: async () => body, _url: url };
  };
}

await testAsync('fetchStoreSearch: decodes HTML entities in name/address (real fixture, gershayim + dash entity)', async () => {
  const fetchImpl = fakeFetch([REAL_SAMPLE_RESPONSE]);
  const results = await fetchStoreSearch({ lat: 32.0853, lng: 34.7818, fetchImpl });
  assert.equal(results.length, 2);
  assert.equal(results[0].store, "מאנצ'יט");
  assert.equal(results[1].store, 'פיקה – Fika');
});

await testAsync('fetchStoreSearch: address2 is exposed as certUrl, never as a second address field', async () => {
  const fetchImpl = fakeFetch([REAL_SAMPLE_RESPONSE]);
  const results = await fetchStoreSearch({ lat: 32.0853, lng: 34.7818, fetchImpl });
  assert.equal(results[0].certUrl, 'https://www.tzohar.org.il/wp-content/uploads/mantz.pdf');
  assert.equal(results[0].address, 'אבן גבירול 113');
});

await testAsync('fetchStoreSearch: builds the exact confirmed request shape (GET, correct action/params)', async () => {
  let capturedUrl;
  const fetchImpl = async (url) => { capturedUrl = url; return { ok: true, json: async () => [] }; };
  await fetchStoreSearch({ lat: 32.1, lng: 34.9, radius: 50, maxResults: 200, fetchImpl });
  const u = new URL(capturedUrl);
  assert.equal(u.origin + u.pathname, 'https://www.tzohar.org.il/wp-admin/admin-ajax.php');
  assert.equal(u.searchParams.get('action'), 'store_search');
  assert.equal(u.searchParams.get('lat'), '32.1');
  assert.equal(u.searchParams.get('lng'), '34.9');
  assert.equal(u.searchParams.get('search_radius'), '50');
  assert.equal(u.searchParams.get('max_results'), '200');
  assert.equal(u.searchParams.get('autoload'), '1');
});

await testAsync('VIOLATION: a non-ok HTTP response throws rather than silently returning an empty result', async () => {
  const fetchImpl = async () => ({ ok: false, status: 500, json: async () => ({}) });
  await assert.rejects(() => fetchStoreSearch({ lat: 1, lng: 1, fetchImpl }), /HTTP 500/);
});

await testAsync('VIOLATION: a non-array JSON response throws rather than being silently coerced', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ error: 'not an array' }) });
  await assert.rejects(() => fetchStoreSearch({ lat: 1, lng: 1, fetchImpl }), /non-array/);
});

test('israelGrid: every point is inside ISRAEL_BBOX, and the grid is non-trivial in size', () => {
  const points = israelGrid(0.25);
  assert.ok(points.length > 50, `expected a real grid, got ${points.length} points`);
  for (const p of points) {
    assert.ok(p.lat >= ISRAEL_BBOX.minLat && p.lat <= ISRAEL_BBOX.maxLat + 0.25);
    assert.ok(p.lng >= ISRAEL_BBOX.minLng && p.lng <= ISRAEL_BBOX.maxLng + 0.25);
  }
});

await testAsync('sweepIsrael: dedupes by tzoharId across overlapping grid calls, and makes exactly one call per grid point', async () => {
  const points = israelGrid(2); // coarse grid for a small, fast test
  const sameEntryEveryCall = [REAL_SAMPLE_RESPONSE[0]]; // simulate full overlap: every call "sees" the same business
  let calls = 0;
  const fetchImpl = async () => { calls++; return { ok: true, json: async () => sameEntryEveryCall }; };
  const result = await sweepIsrael({ stepDeg: 2, delayMs: 0, fetchImpl });
  assert.equal(calls, points.length, 'must call once per grid point, not skip or double-call');
  assert.equal(result.length, 1, 'the same tzoharId returned by every overlapping call must be deduped to one entry');
  assert.equal(result[0].store, "מאנצ'יט");
});

await testAsync('sweepIsrael: reports progress via onProgress without altering the result', async () => {
  const fetchImpl = fakeFetch(Array(9999).fill(REAL_SAMPLE_RESPONSE));
  const progressCalls = [];
  const result = await sweepIsrael({ stepDeg: 2, delayMs: 0, fetchImpl, onProgress: (p) => progressCalls.push(p) });
  assert.ok(progressCalls.length > 0);
  assert.equal(progressCalls[progressCalls.length - 1].index, progressCalls.length - 1);
  assert.equal(result.length, 2); // still just the 2 distinct tzoharIds in the fixture, regardless of grid size
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
