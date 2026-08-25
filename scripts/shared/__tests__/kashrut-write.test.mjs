// Standalone test (not jest — .mjs files aren't in jest's testMatch).
// Run: node scripts/shared/__tests__/kashrut-write.test.mjs
//
// Per the Architect's instruction: every guard here gets FIRED, not read —
// each violation case actually performs the bad write and asserts it throws,
// rather than asserting on the guard's source code.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordKashrutWrite, isCertifiedByAppendOnlyViolation, basisSupportsLevelAssertion } from '../kashrut-write.mjs';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok - ${name}`);
  } catch (err) {
    console.error(`  FAIL - ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

function throws(fn, messageFragment) {
  assert.throws(fn, (err) => {
    assert.ok(err instanceof Error, 'threw a non-Error');
    if (messageFragment) assert.ok(err.message.includes(messageFragment), `error message missing "${messageFragment}": ${err.message}`);
    return true;
  });
}

console.log('kashrut-write.mjs');

// ── certifiedBy append-only: valid cases ────────────────────────────────────

test('first write from absent certifiedBy succeeds', () => {
  const place = { id: 'p1' };
  recordKashrutWrite(place, 'certifiedBy', 'הרב לנדא', { kind: 'human-review', note: 'scraped from site' });
  assert.equal(place.certifiedBy, 'הרב לנדא');
});

test('first write from empty-string certifiedBy succeeds', () => {
  const place = { id: 'p2', certifiedBy: '' };
  recordKashrutWrite(place, 'certifiedBy', 'רבנות תל אביב', { kind: 'human-review', note: 'x' });
  assert.equal(place.certifiedBy, 'רבנות תל אביב');
});

test('extension (new value contains old value) succeeds', () => {
  const place = { id: 'p3', certifiedBy: 'בד״ץ בית יוסף' };
  recordKashrutWrite(place, 'certifiedBy', 'בד״ץ בית יוסף + OK', { kind: 'human-review', note: 'second certifier found' });
  assert.equal(place.certifiedBy, 'בד״ץ בית יוסף + OK');
});

test('re-writing the identical value is a no-op success, not a violation', () => {
  const place = { id: 'p4', certifiedBy: 'תעודת רבנות' };
  recordKashrutWrite(place, 'certifiedBy', 'תעודת רבנות', { kind: 'human-review', note: 'idempotent re-run' });
  assert.equal(place.certifiedBy, 'תעודת רבנות');
});

test('incidental whitespace difference is not a violation', () => {
  const place = { id: 'p5', certifiedBy: '  הרב לנדא  ' };
  recordKashrutWrite(place, 'certifiedBy', 'הרב לנדא', { kind: 'human-review', note: 'trimmed' });
  assert.equal(place.certifiedBy, 'הרב לנדא');
});

// ── certifiedBy append-only: FIRED violations ───────────────────────────────

test('VIOLATION: overwriting with an unrelated non-empty value throws (the humus-eli-52 case)', () => {
  const place = { id: 'humuseliyahu-1', certifiedBy: 'הרב לנדא' };
  throws(
    () => recordKashrutWrite(place, 'certifiedBy', 'מהדרין', { kind: 'human-review', note: 'attempted overwrite' }),
    'refusing to overwrite evidence',
  );
  // and the place object must be left untouched by the rejected write
  assert.equal(place.certifiedBy, 'הרב לנדא');
});

test('VIOLATION: overwriting to empty string throws (deletion is not append)', () => {
  const place = { id: 'p6', certifiedBy: 'רבנות ירושלים' };
  throws(() => recordKashrutWrite(place, 'certifiedBy', '', { kind: 'human-review', note: 'clearing' }));
  assert.equal(place.certifiedBy, 'רבנות ירושלים');
});

test('VIOLATION: a gershayim/ASCII-quote normalization is treated as a content change, not an allowed extension', () => {
  const place = { id: 'p7', certifiedBy: 'בד"ץ בית יוסף' }; // ASCII quote, deliberately
  throws(() => recordKashrutWrite(place, 'certifiedBy', 'בד״ץ בית יוסף', { kind: 'human-review', note: 'gershayim fix attempt' }));
});

test('isCertifiedByAppendOnlyViolation matches recordKashrutWrite exactly (same function validate-data.mjs will call)', () => {
  assert.equal(isCertifiedByAppendOnlyViolation('הרב לנדא', 'מהדרין'), true);
  assert.equal(isCertifiedByAppendOnlyViolation('הרב לנדא', 'הרב לנדא + OK'), false);
  assert.equal(isCertifiedByAppendOnlyViolation('', 'הרב לנדא'), false);
  assert.equal(isCertifiedByAppendOnlyViolation(undefined, 'הרב לנדא'), false);
  assert.equal(isCertifiedByAppendOnlyViolation('הרב לנדא', ''), true);
});

// ── level-assertion guard: valid cases ──────────────────────────────────────

test('kosherType: mehadrin with a registry-alias basis stating mehadrin succeeds', () => {
  const place = { id: 'p8' };
  recordKashrutWrite(place, 'kosherType', 'mehadrin', { kind: 'registry-alias', alias: 'מהדרין', aliasLevel: 'mehadrin' });
  assert.equal(place.kosherType, 'mehadrin');
});

test('kosherType: rabanut_mehadrin_jerusalem with a certificate-document basis succeeds', () => {
  const place = { id: 'p9' };
  recordKashrutWrite(place, 'kosherType', 'rabanut_mehadrin_jerusalem', { kind: 'certificate-document', url: 'https://example.test/cert.pdf' });
  assert.equal(place.kosherType, 'rabanut_mehadrin_jerusalem');
});

test('kosherType: a non-level-asserting value (badatz_beit_yosef) needs no level evidence at all', () => {
  const place = { id: 'p10' };
  recordKashrutWrite(place, 'kosherType', 'badatz_beit_yosef', { kind: 'registry-alias', alias: 'בד"ץ בית יוסף', aliasLevel: null });
  assert.equal(place.kosherType, 'badatz_beit_yosef');
});

test('kosherLevel: "regular" needs no level evidence (only mehadrin is guarded)', () => {
  const place = { id: 'p11' };
  recordKashrutWrite(place, 'kosherLevel', 'regular', { kind: 'enum-inference', fromKosherType: 'rabanut' });
  assert.equal(place.kosherLevel, 'regular');
});

// ── level-assertion guard: FIRED violations ─────────────────────────────────

test('VIOLATION: kosherType mehadrin from enum-inference throws (the site-B mechanism itself)', () => {
  const place = { id: 'humus-eli-חומוס-אליהו-אשקלון' };
  throws(
    () => recordKashrutWrite(place, 'kosherType', 'mehadrin', { kind: 'enum-inference', fromKosherType: 'body-named-no-level' }),
    'exactly the site-B/site-A mechanism',
  );
  assert.equal(place.kosherType, undefined);
});

test('VIOLATION: kosherType mehadrin from a registry-alias whose aliasLevel is null throws (site A itself: body named, no level)', () => {
  const place = { id: 'p12' };
  // "בד"ץ בית יוסף" is a REAL registry alias (authorityId badatz-beit-yosef, level: null) — verified
  // against scripts/reports/kashrut-registry.json, not a made-up string.
  throws(() => recordKashrutWrite(place, 'kosherType', 'mehadrin', { kind: 'registry-alias', alias: 'בד"ץ בית יוסף', aliasLevel: null }));
});

// Reviewer's B1 predicate: {kind:'registry-alias', alias:'בד"ץ בית יוסף', aliasLevel:'mehadrin'} was
// previously ACCEPTED — the shape type-checks, but the registry itself records level: null for that exact
// alias, and nothing resolved `alias` against the registry to check the claim. This is the fix, fired for
// real against the real registry file, not asserted about the source code.
test('VIOLATION: a registry-alias basis that MISCLAIMS the registry\'s own recorded level throws (the exact gap the Reviewer found)', () => {
  const place = { id: 'p17' };
  // Ground truth, read directly from the registry so this test fails loudly if the fixture data ever moves:
  const registry = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../reports/kashrut-registry.json'), 'utf8'));
  const realEntry = registry.aliases.find((a) => a.raw === 'בד"ץ בית יוסף');
  assert.ok(realEntry, 'fixture assumption broken: "בד"ץ בית יוסף" is expected to be a real registry alias');
  assert.equal(realEntry.level, null, 'fixture assumption broken: expected the registry to record level: null for this alias');

  throws(
    () => recordKashrutWrite(place, 'kosherType', 'mehadrin', { kind: 'registry-alias', alias: 'בד"ץ בית יוסף', aliasLevel: 'mehadrin' }),
  );
  assert.equal(place.kosherType, undefined);
});

test('VIOLATION: a registry-alias basis citing an alias that does not exist in the registry throws (unverifiable, fails closed)', () => {
  const place = { id: 'p18' };
  throws(() => recordKashrutWrite(place, 'kosherType', 'mehadrin', { kind: 'registry-alias', alias: 'a string not in the registry at all', aliasLevel: 'mehadrin' }));
});

test('basisSupportsLevelAssertion resolves a real mehadrin-level alias correctly (the honest positive case)', () => {
  assert.equal(basisSupportsLevelAssertion({ kind: 'registry-alias', alias: 'מהדרין', aliasLevel: 'mehadrin' }), true);
});

test('VIOLATION: kosherLevel "mehadrin" written directly from enum-inference throws (would still catch the MAP if migrated here)', () => {
  const place = { id: 'p13' };
  throws(() => recordKashrutWrite(place, 'kosherLevel', 'mehadrin', { kind: 'enum-inference', fromKosherType: 'badatz_beit_yosef' }));
  assert.equal(place.kosherLevel, undefined);
});

test('VIOLATION: rabanut_mehadrin with no basis at all throws (basis is required, not optional)', () => {
  const place = { id: 'p14' };
  throws(() => recordKashrutWrite(place, 'kosherType', 'rabanut_mehadrin', undefined));
});

test('VIOLATION: a free-text string passed as basis throws (basis must be a shape, not a string)', () => {
  const place = { id: 'p15' };
  throws(() => recordKashrutWrite(place, 'kosherType', 'mehadrin', 'from the registry, trust me'));
});

// ── other guard: unknown field ──────────────────────────────────────────────

test('VIOLATION: writing a field outside the six kashrut fields throws', () => {
  const place = { id: 'p16' };
  throws(() => recordKashrutWrite(place, 'website', 'https://example.test', { kind: 'human-review', note: 'x' }));
});

// ── basisSupportsLevelAssertion, exported for the ratchet to reuse ─────────

test('basisSupportsLevelAssertion: exact truth table', () => {
  // 'מהדרין' and 'בד"ץ בית יוסף' are real registry aliases (verified above); a
  // registry-alias basis is judged against the real registry, not the shape alone.
  assert.equal(basisSupportsLevelAssertion({ kind: 'registry-alias', alias: 'מהדרין', aliasLevel: 'mehadrin' }), true);
  assert.equal(basisSupportsLevelAssertion({ kind: 'registry-alias', alias: 'בד"ץ בית יוסף', aliasLevel: null }), false);
  assert.equal(basisSupportsLevelAssertion({ kind: 'registry-alias', alias: 'בד"ץ בית יוסף', aliasLevel: 'mehadrin' }), false, 'claim disagrees with the registry — must be rejected, not trusted');
  assert.equal(basisSupportsLevelAssertion({ kind: 'registry-alias', alias: 'not a real alias', aliasLevel: 'mehadrin' }), false, 'unresolvable citation — fail closed');
  assert.equal(basisSupportsLevelAssertion({ kind: 'certificate-document', url: 'x' }), true);
  assert.equal(basisSupportsLevelAssertion({ kind: 'human-review', note: 'x' }), true);
  assert.equal(basisSupportsLevelAssertion({ kind: 'enum-inference', fromKosherType: 'x' }), false);
  assert.equal(basisSupportsLevelAssertion({ kind: 'backfilled-inference', method: 'x' }), false);
  assert.equal(basisSupportsLevelAssertion(undefined), false);
  assert.equal(basisSupportsLevelAssertion(null), false);
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
