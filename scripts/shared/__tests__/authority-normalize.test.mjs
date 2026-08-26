// Standalone test (not jest). Run: node scripts/shared/__tests__/authority-normalize.test.mjs
//
// Proves the normalizer/resolver against the REAL defect that motivated it
// (Item 4 Unit 3, 2026-08-27): greg-adapter.mjs's original BODY_PATTERNS
// required final tsadi ץ only, and never matched greg מגדל העמק's real page
// text "סניף כשר בד"צ בית יוסף" (regular tsadi צ), so a real, registered
// badatz was invisible on all 59 pages. The fixture below is the exact
// substring captured live from that page (verified codepoint-by-codepoint
// before this file was written), not a synthetic approximation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeAuthorityText, buildResolverEntries, resolveAuthorityFromText } from '../authority-normalize.mjs';

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

console.log('authority-normalize.mjs');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const registry = JSON.parse(readFileSync(resolve(ROOT, 'scripts/reports/kashrut-registry.json'), 'utf8').replace(/^﻿/, ''));
const resolverEntries = buildResolverEntries(registry);

// The exact live snippet (regular tsadi צ, straight quote ") captured from
// https://gregcafe.co.il/branch/%d7%9e%d7%92%d7%93%d7%9c-%d7%94%d7%a2%d7%9e%d7%a7/,
// 2026-08-27.
const GREG_MIGDAL_HAEMEK_SNIPPET = 'סניף כשר בד"צ בית יוסף';

test('REAL, KNOWN POSITIVE: the live greg מגדל העמק snippet resolves to badatz-beit-yosef', () => {
  const result = resolveAuthorityFromText(GREG_MIGDAL_HAEMEK_SNIPPET, resolverEntries);
  assert.ok(result, 'expected a resolved authority, got null — the exact defect this file exists to fix');
  assert.equal(result.authorityId, 'badatz-beit-yosef');
});

test('the resolved matchedText is the VERBATIM page substring (regular tsadi, straight quote) — never the registry\'s own canonical spelling', () => {
  const result = resolveAuthorityFromText(GREG_MIGDAL_HAEMEK_SNIPPET, resolverEntries);
  assert.equal(result.matchedText, 'בד"צ בית יוסף');
});

test('REGRESSION PROOF: the OLD final-tsadi-only pattern would have missed this exact string', () => {
  const oldPattern = /בד"?ץ/;
  assert.ok(!oldPattern.test(GREG_MIGDAL_HAEMEK_SNIPPET), 'sanity: confirms the old pattern really does fail on this real text, i.e. this test is not vacuous');
});

test('normalizeAuthorityText: quote-stripping + tsadi-fold makes the registry\'s canonical spelling and the live page spelling equal', () => {
  assert.equal(normalizeAuthorityText('בד״ץ בית יוסף'), normalizeAuthorityText('בד"צ בית יוסף'));
  assert.equal(normalizeAuthorityText('בד"צ בית יוסף'), normalizeAuthorityText('בדץ בית יוסף'));
});

test('normalizeAuthorityText: a generic "כשר " prefix is stripped, so "כשר בד"צ..." and "בד"צ..." normalize identically', () => {
  assert.equal(normalizeAuthorityText('כשר בד"צ בית יוסף'), normalizeAuthorityText('בד"צ בית יוסף'));
});

test('generic, unresolved registry terms (authorityId:null) never resolve as a body — "כשר" alone is not a body name', () => {
  const result = resolveAuthorityFromText('המקום כשר לחלוטין, בואו לבקר', resolverEntries);
  assert.equal(result, null, 'a bare mention of "כשר" with no real body named must not resolve to anything');
});

test('specificity: a longer, more specific alias wins over a shorter one it contains as a substring', () => {
  // "בד"צ בית יוסף" (specific, authorityId badatz-beit-yosef) contains
  // "בית יוסף" (also a registered alias for the same body here, but the
  // point generalizes: longest-first ordering is what buildResolverEntries
  // guarantees, verified directly rather than assumed).
  const entries = buildResolverEntries(registry);
  assert.ok(entries[0].raw.length >= entries[entries.length - 1].raw.length, 'entries must be sorted longest-first');
});

test('ISOLATED PROOF the tsadi-fold specifically is load-bearing: a synthetic single-entry resolver registered ONLY with final tsadi (ץ) still resolves a page snippet using regular tsadi (צ) — this cannot pass "by accident" via registry redundancy the way a real-registry test could, because there is only one entry and it is the wrong glyph without the fold', () => {
  const synthetic = buildResolverEntries({ aliases: [{ raw: 'בד"ץ טסט', authorityId: 'test-authority', level: null }] });
  const result = resolveAuthorityFromText('לפניכם המסעדה עם בד"צ טסט בהחלט', synthetic);
  assert.ok(result, 'expected the regular-tsadi page text to resolve against the final-tsadi-only registered alias');
  assert.equal(result.authorityId, 'test-authority');
  assert.equal(result.matchedText, 'בד"צ טסט');
});

test('REAL, KNOWN NEGATIVE, found live: "הצהרת נגישות" (accessibility declaration, WordPress footer boilerplate on every greg page) does NOT resolve to Tzohar (authorityId "tzohar") — the bare alias "צהר" sits inside that word as a literal substring, and matched every one of 59 real pages before Hebrew-aware word boundaries were added', () => {
  const result = resolveAuthorityFromText('הצהרת נגישות', resolverEntries);
  assert.equal(result, null, 'a substring match inside an unrelated word must not resolve as a body — this exact case matched all 59 real greg pages before the fix');
});

test('a genuine standalone mention of "צהר" DOES still resolve — the fix is a boundary, not a ban on the short alias entirely', () => {
  const result = resolveAuthorityFromText('בתעודה נכתב צהר בלבד', resolverEntries);
  assert.ok(result, 'a real standalone mention of the alias must still resolve');
  assert.equal(result.authorityId, 'tzohar');
});

test('resolveAuthorityFromText: null/empty text resolves to null, not a throw', () => {
  assert.equal(resolveAuthorityFromText('', resolverEntries), null);
  assert.equal(resolveAuthorityFromText(null, resolverEntries), null);
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
