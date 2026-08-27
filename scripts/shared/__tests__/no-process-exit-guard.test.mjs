// Standalone test (not jest). Run: node scripts/shared/__tests__/no-process-exit-guard.test.mjs
//
// Guards the guard: proves findProcessExitViolations() actually detects a
// real process.exit( call in the two files it watches, does NOT false-
// positive on prose describing process.exit( inside a string or comment,
// and that the string-content-dropping behavior (the fix for the false
// positive found live while building this — see no-process-exit-guard.mjs's
// own header) is real, not assumed.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findProcessExitViolations, findProcessExitViolationsRepoWide, stripCommentsAndStrings } from '../no-process-exit-guard.mjs';

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

console.log('no-process-exit-guard.mjs');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const REBAR_SCRIPT = resolve(ROOT, 'scripts', 'import-rebar.mjs');

test('stripCommentsAndStrings drops string CONTENT but keeps the delimiters and real code', () => {
  const src = 'const x = "process.exit(0) in a string"; // process.exit( in a comment\nreal.code();';
  const stripped = stripCommentsAndStrings(src);
  assert.doesNotMatch(stripped, /process\.exit\(/, 'string and comment content should both be gone');
  assert.match(stripped, /real\.code\(\);/, 'real code outside strings/comments must survive untouched');
});

test('stripCommentsAndStrings does NOT strip a real process.exit( call written as actual code', () => {
  const src = 'if (x) {\n  process.exit(1);\n}';
  const stripped = stripCommentsAndStrings(src);
  assert.match(stripped, /process\.exit\(1\)/);
});

test('sanity: findProcessExitViolations() runs and returns an array — a scan that throws is not a scan that passed', () => {
  const result = findProcessExitViolations();
  assert.ok(Array.isArray(result));
});

test('REAL, KNOWN NEGATIVE: import-rebar.mjs and rebar-feed.mjs currently have ZERO real process.exit( calls (both were fixed to use process.exitCode + return)', () => {
  assert.deepEqual(findProcessExitViolations(), []);
});

test('sanity: the repo-wide scan (test-only, not what gates anything) finds MORE than zero elsewhere — proves the scan mechanism itself can find a real positive, not just report an empty scoped list', () => {
  const repoWide = findProcessExitViolationsRepoWide();
  assert.ok(repoWide.length > 0, 'a repo-wide scan finding nothing would be indistinguishable from a broken scan');
  assert.ok(!repoWide.includes('import-rebar.mjs'), 'import-rebar.mjs itself must not be in the repo-wide list either — it has no real process.exit( call today');
});

// ── Sabotage-fire: activate the guard, not just read it ──────────────────
// A real process.exit( call is temporarily written into import-rebar.mjs
// (a scoped GUARDED_FILES member), the scoped scan is re-run, the violation
// is confirmed caught by name, then the file is restored byte-for-byte and
// the restoration itself is verified before this test declares success.
test('ACTIVATED: injecting a real process.exit( into import-rebar.mjs is caught by name, and the file is restored after', () => {
  const original = readFileSync(REBAR_SCRIPT, 'utf8');
  try {
    const sabotaged = original.replace(
      'console.log(`Feed entries parsed: ${stores.length}\\n`);',
      'console.log(`Feed entries parsed: ${stores.length}\\n`);\n  process.exit(0); // SABOTAGE_PROOF',
    );
    assert.notEqual(sabotaged, original, 'the replace() must have actually matched something, or this proves nothing');
    writeFileSync(REBAR_SCRIPT, sabotaged);
    const violations = findProcessExitViolations();
    assert.deepEqual(violations, ['import-rebar.mjs'], 'the injected process.exit( must be caught, named exactly');
  } finally {
    writeFileSync(REBAR_SCRIPT, original);
    const restored = readFileSync(REBAR_SCRIPT, 'utf8');
    assert.equal(restored, original, 'restoration must be byte-for-byte — a partial restore would corrupt the real script');
  }
});

test('after restoration, the scan is clean again — the sabotage did not leave a residue', () => {
  assert.deepEqual(findProcessExitViolations(), []);
});

console.log(`${passed} passed${process.exitCode ? ', with failures' : ''}`);
