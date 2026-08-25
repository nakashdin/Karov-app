/**
 * Regression tests for the PROPOSED migrate-kosher-fields.mjs fix (Part 5 of
 * scripts/reports/kashrut-data-model-inspection-round2.md).
 *
 * These test the extracted pure logic in isolation against fixture data —
 * they do NOT touch src/data/generated/places.osm.json, do NOT run the real
 * script, and do NOT write anything. `enrichOne` below is a direct copy of
 * the proposed diff's new enrichment logic, kept here so the fix's behavior
 * is provable before anyone applies it to the real script. This repo's jest
 * config only matches `.test.[jt]s?(x)`, not `.mjs`, so this runs as a plain
 * Node script with `assert` rather than fighting that config for a
 * proposal-only file.
 *
 * Usage: node scripts/reports/migrate-kosher-fields-reviewqueue-fix.proposed-test.mjs
 */
import assert from 'node:assert/strict';

const MAP = {
  rabanut: { kosherLevel: 'regular', kosherAuthorityGroup: 'rabbinate', kosherAuthority: null },
  badatz_beit_yosef: { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz', kosherAuthority: 'badatz_beit_yosef' },
};

/** Exact copy of the proposed new enrichOne() — see the diff in the report. */
function enrichOne(place, reviewQueueRaws, counts) {
  if (place.certifiedBy && reviewQueueRaws.has(place.certifiedBy)) {
    counts.reviewQueueSkipped++;
    return place;
  }
  if (!place.kosherType) {
    counts.noKosherType++;
    return place;
  }
  const meta = MAP[place.kosherType];
  if (!meta) {
    counts.unmapped++;
    return place;
  }
  counts.enriched++;
  return { ...place, kosherLevel: meta.kosherLevel, kosherAuthorityGroup: meta.kosherAuthorityGroup, kosherAuthority: meta.kosherAuthority };
}

const freshCounts = () => ({ enriched: 0, noKosherType: 0, unmapped: 0, reviewQueueSkipped: 0 });
let passed = 0;

function test(name, fn) {
  fn();
  passed++;
  console.log('  ✓', name);
}

test('does not overwrite a record whose certifiedBy is reviewQueue-listed, even with a mapped kosherType', () => {
  const reviewQueueRaws = new Set(['בד"ץ מהדרין ירושלים']);
  const place = { id: 'x1', certifiedBy: 'בד"ץ מהדרין ירושלים', kosherType: 'rabanut', kosherLevel: 'mehadrin' };
  const counts = freshCounts();
  const out = enrichOne(place, reviewQueueRaws, counts);
  assert.strictEqual(out, place);
  assert.strictEqual(out.kosherAuthority, undefined);
  assert.strictEqual(out.kosherAuthorityGroup, undefined);
  assert.strictEqual(out.kosherLevel, 'mehadrin');
  assert.strictEqual(counts.reviewQueueSkipped, 1);
  assert.strictEqual(counts.enriched, 0);
});

test('reproduces the exact real-world bug this fix targets: golda-ff986d68-shaped record (חלב ישראל)', () => {
  const reviewQueueRaws = new Set(['חלב ישראל']);
  const place = { id: 'golda-ff986d68', certifiedBy: 'חלב ישראל', kosherType: 'rabanut' };
  const counts = freshCounts();
  const out = enrichOne(place, reviewQueueRaws, counts);
  assert.strictEqual(out.kosherAuthorityGroup, undefined);
  assert.strictEqual(out.kosherAuthority, undefined);
  assert.strictEqual(out.kosherLevel, undefined);
});

test('leaves existing correct behavior on non-reviewQueue records unaffected', () => {
  const reviewQueueRaws = new Set(['בד"ץ מהדרין ירושלים']);
  const place = { id: 'x2', certifiedBy: 'רבנות תל אביב', kosherType: 'badatz_beit_yosef' };
  const counts = freshCounts();
  const out = enrichOne(place, reviewQueueRaws, counts);
  assert.strictEqual(out.kosherLevel, 'mehadrin');
  assert.strictEqual(out.kosherAuthorityGroup, 'badatz');
  assert.strictEqual(out.kosherAuthority, 'badatz_beit_yosef');
  assert.strictEqual(counts.enriched, 1);
  assert.strictEqual(counts.reviewQueueSkipped, 0);
});

test('a record with no certifiedBy at all is never treated as reviewQueue-matched', () => {
  const reviewQueueRaws = new Set(['בד"ץ מהדרין ירושלים']);
  const place = { id: 'x3', kosherType: 'rabanut' };
  const counts = freshCounts();
  const out = enrichOne(place, reviewQueueRaws, counts);
  assert.strictEqual(out.kosherAuthorityGroup, 'rabbinate');
  assert.strictEqual(counts.reviewQueueSkipped, 0);
  assert.strictEqual(counts.enriched, 1);
});

test('unchanged pre-existing behavior: no kosherType at all is still just skipped, not counted as reviewQueue', () => {
  const reviewQueueRaws = new Set();
  const place = { id: 'x4', certifiedBy: 'משהו' };
  const counts = freshCounts();
  const out = enrichOne(place, reviewQueueRaws, counts);
  assert.strictEqual(out, place);
  assert.strictEqual(counts.noKosherType, 1);
  assert.strictEqual(counts.reviewQueueSkipped, 0);
});

console.log(`\n${passed}/5 passed`);
