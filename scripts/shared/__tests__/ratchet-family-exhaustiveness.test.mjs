// Standalone test (not jest). Run: node scripts/shared/__tests__/ratchet-family-exhaustiveness.test.mjs
//
// Guards RATCHET_KEYS_SPEC in validate-data.mjs (Reviewer finding, 2026-08-27:
// two parallel key arrays means the key list exists twice, and the failure
// mode is a key silently absent from both — see docs/KASHRUT_FACTS.md §32/§33
// area). The fix keeps ONE list with a family tag per key, and this test is
// the exhaustiveness check that buys: every declared key must carry a valid
// family ('served' or 'unread'), enforced by static analysis of the source
// text rather than importing validate-data.mjs directly — that file has no
// entry-point guard, reads real dataset files, and can call process.exit() at
// module-load time, exactly why ratchet-corrections.mjs was split out as its
// own importable module in the first place (see that file's own header).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

console.log('ratchet-family-exhaustiveness (validate-data.mjs RATCHET_KEYS_SPEC)');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SOURCE_PATH = resolve(ROOT, 'scripts', 'validate-data.mjs');
const source = readFileSync(SOURCE_PATH, 'utf8');

const specMatch = /const RATCHET_KEYS_SPEC = \[([\s\S]*?)\n\];/.exec(source);

test('RATCHET_KEYS_SPEC array literal is found in validate-data.mjs (fails loudly if the declaration is renamed or reshaped, rather than silently checking nothing)', () => {
  assert.ok(specMatch, 'could not locate "const RATCHET_KEYS_SPEC = [ ... ];" in validate-data.mjs — this test needs updating alongside that rename/reshape, not silently passing on zero entries');
});

const entries = [...(specMatch?.[1] ?? '').matchAll(/\{\s*key:\s*'([^']+)',\s*family:\s*'([^']*)'\s*\}/g)]
  .map((m) => ({ key: m[1], family: m[2] }));

test('at least one entry parsed — a regex that silently matches zero entries is indistinguishable from "all keys are exhaustive" and must not pass', () => {
  assert.ok(entries.length > 0, 'parsed zero {key, family} entries from RATCHET_KEYS_SPEC — the parsing regex above no longer matches the real shape');
});

test('every RATCHET_KEYS_SPEC entry has family "served" or "unread" — no key silently unclassified', () => {
  const bad = entries.filter((e) => e.family !== 'served' && e.family !== 'unread');
  assert.deepEqual(bad, [], `entries with an invalid family: ${JSON.stringify(bad)}`);
});

test('no duplicate keys in RATCHET_KEYS_SPEC', () => {
  const seen = new Set();
  const dupes = [];
  for (const e of entries) {
    if (seen.has(e.key)) dupes.push(e.key);
    seen.add(e.key);
  }
  assert.deepEqual(dupes, [], `duplicate keys: ${JSON.stringify(dupes)}`);
});

test('every restaurants*-prefixed key is family "unread", and no non-restaurants key is family "unread" — the naming convention and the classification must agree, since a mismatch here is exactly the kind of silent drift this test exists to catch', () => {
  const mismatches = entries.filter((e) => e.key.startsWith('restaurants') !== (e.family === 'unread'));
  assert.deepEqual(mismatches, [], `key/family mismatches: ${JSON.stringify(mismatches)}`);
});

console.log(`${passed} passed`);
if (process.exitCode) {
  console.error('ratchet-family-exhaustiveness: FAILED');
} else {
  console.log('ratchet-family-exhaustiveness: all tests passed');
}
