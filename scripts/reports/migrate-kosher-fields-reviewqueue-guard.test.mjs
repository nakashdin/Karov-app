/**
 * Regression test for the reviewQueue guard APPLIED to
 * scripts/migrate-kosher-fields.mjs (Phase 2 change E). Supersedes
 * migrate-kosher-fields-reviewqueue-fix.proposed-test.mjs, which tested this
 * before it was applied — that file documents the proposal's history and is
 * left in place, but this is the test for the real, current script.
 *
 * `enrichOne` below is a verbatim copy of migrate-kosher-fields.mjs's actual
 * map-and-guard logic (same MAP table, same reviewQueue check, same
 * enrichment), kept in sync by hand — this repo's jest config only matches
 * `.test.[jt]s?(x)`, not `.mjs`, so a real script can't be `import`ed into a
 * jest test directly without a build step this repo doesn't have. Does not
 * touch src/data/generated/places.osm.json, does not run the real script.
 *
 * Usage: node scripts/reports/migrate-kosher-fields-reviewqueue-guard.test.mjs
 */
import assert from 'node:assert/strict';

// Exact copy of scripts/migrate-kosher-fields.mjs's MAP.
const MAP = {
  rabanut:                    { kosherLevel: 'regular',  kosherAuthorityGroup: 'rabbinate',   kosherAuthority: null },
  rabanut_mekomi:             { kosherLevel: 'regular',  kosherAuthorityGroup: 'rabbinate',   kosherAuthority: null },
  rabanut_tel_aviv:           { kosherLevel: 'regular',  kosherAuthorityGroup: 'rabbinate',   kosherAuthority: 'rabbinate_tel_aviv' },
  rabanut_mehadrin:           { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'rabbinate',   kosherAuthority: null },
  rabanut_mehadrin_jerusalem: { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'rabbinate',   kosherAuthority: 'rabbinate_jerusalem' },
  kosher:                     { kosherLevel: 'regular',  kosherAuthorityGroup: 'unknown',     kosherAuthority: null },
  mehadrin:                   { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'unknown',     kosherAuthority: null },
  badatz_beit_yosef:          { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz',      kosherAuthority: 'badatz_beit_yosef' },
  badatz_edah:                { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz',      kosherAuthority: 'badatz_edah_hachareidis' },
  badatz_kehilot:             { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz',      kosherAuthority: 'badatz_kehilot' },
  badatz_rubin:               { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz',      kosherAuthority: 'badatz_rubin' },
  rav_machpud:                { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz',      kosherAuthority: 'yoreh_deah_mahfoud' },
  chatam_sofer:                { kosherLevel: 'mehadrin', kosherAuthorityGroup: 'badatz',      kosherAuthority: 'chatam_sofer' },
  tzohar:                     { kosherLevel: 'regular',  kosherAuthorityGroup: 'independent', kosherAuthority: 'tzohar' },
};

/** Verbatim copy of the applied enrichment logic (the places.map() body). */
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

test('a reviewQueue-deferred record is left byte-identical — all three derived fields untouched, not just kosherAuthority', () => {
  const reviewQueueRaws = new Set(['בד"ץ מהדרין ירושלים']);
  const place = { id: 'x1', certifiedBy: 'בד"ץ מהדרין ירושלים', kosherType: 'mehadrin' };
  const counts = freshCounts();
  const out = enrichOne(place, reviewQueueRaws, counts);
  assert.strictEqual(out, place, 'must return the exact same object reference — no new fields, no clone');
  assert.strictEqual(out.kosherLevel, undefined);
  assert.strictEqual(out.kosherAuthorityGroup, undefined);
  assert.strictEqual(out.kosherAuthority, undefined);
  assert.strictEqual(counts.reviewQueueSkipped, 1);
  assert.strictEqual(counts.enriched, 0);
});

test('reproduces the exact real-world case this guard targets: 3 disputed chatam_sofer/badatz_kehilot-adjacent records stay unenriched', () => {
  const reviewQueueRaws = new Set(['חוג חתם סופר', 'בד"ץ קהילות']);
  for (const [certifiedBy, kosherType] of [['חוג חתם סופר', 'chatam_sofer'], ['בד"ץ קהילות', 'badatz_kehilot']]) {
    const counts = freshCounts();
    const out = enrichOne({ id: 'y', certifiedBy, kosherType }, reviewQueueRaws, counts);
    assert.strictEqual(out.kosherAuthority, undefined, `${certifiedBy}: kosherAuthority must stay unset`);
    assert.strictEqual(out.kosherLevel, undefined, `${certifiedBy}: kosherLevel must stay unset`);
    assert.strictEqual(out.kosherAuthorityGroup, undefined, `${certifiedBy}: kosherAuthorityGroup must stay unset`);
  }
});

test('a record with no certifiedBy at all is never treated as reviewQueue-matched, and still enriches normally', () => {
  const reviewQueueRaws = new Set(['בד"ץ מהדרין ירושלים']);
  const place = { id: 'x3', kosherType: 'rabanut' };
  const counts = freshCounts();
  const out = enrichOne(place, reviewQueueRaws, counts);
  assert.strictEqual(out.kosherAuthorityGroup, 'rabbinate');
  assert.strictEqual(out.kosherLevel, 'regular');
  assert.strictEqual(out.kosherAuthority, null);
  assert.strictEqual(counts.reviewQueueSkipped, 0);
  assert.strictEqual(counts.enriched, 1);
});

test('non-reviewQueue records enrich exactly as before the guard was added — no behavior change for the unaffected majority', () => {
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

test('no kosherType at all is still just skipped as noKosherType, not miscounted as reviewQueue', () => {
  const reviewQueueRaws = new Set();
  const place = { id: 'x4', certifiedBy: 'משהו' };
  const counts = freshCounts();
  const out = enrichOne(place, reviewQueueRaws, counts);
  assert.strictEqual(out, place);
  assert.strictEqual(counts.noKosherType, 1);
  assert.strictEqual(counts.reviewQueueSkipped, 0);
});

console.log(`\n${passed}/5 passed`);
