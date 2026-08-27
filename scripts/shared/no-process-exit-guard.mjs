/**
 * Static guard: neither import-rebar.mjs nor its shared fetch/parse module
 * calls `process.exit(` in live code.
 *
 * SUPPLEMENT, NOT A REPLACEMENT for import-rebar-exitcode.test.mjs's SECTION
 * 1 (the real-network dry run). This catches the KNOWN SHAPE of that
 * regression — a literal `process.exit(` call reappearing in the two files
 * involved — not the class of bugs SECTION 1 guards (any way a script's
 * process teardown could interact badly with an open handle, which a static
 * scan of one call form cannot see). A future regression that reintroduces
 * the same failure through a different mechanism (e.g. an early return that
 * skips socket cleanup some other way) would pass this guard and still need
 * SECTION 1's real-network exercise to catch it. Both guards stay; neither
 * one is redundant with the other.
 *
 * SCOPED TO GUARDED_FILES BELOW, DELIBERATELY NOT ALL OF scripts/ — checked
 * while building this: a repo-wide scan finds 10 pre-existing, unrelated
 * `process.exit(` calls (validate-data.mjs, dedupe-places.mjs, and others)
 * that were never part of this regression and were not in scope for this
 * fix. A guard built to prove out one specific regression's known shape
 * should not silently expand into an unauthorized audit of everything else
 * in scripts/ that happens to share a call form — that decision (allowlist
 * vs. ratchet vs. fix) belongs to whoever actually reviews those 10 files,
 * not to this commit. If this guard's scope should widen later, that is a
 * deliberate choice for GUARDED_FILES to make explicit, not a side effect.
 *
 * Why `process.exit(` specifically: found live, 2026-08-27 —
 * import-rebar.mjs used to call `process.exit(0)` on its success path,
 * which tears the process down before a fetch's keep-alive socket finishes
 * closing (libuv then aborts with `UV_HANDLE_CLOSING`, exit 127 on a fully
 * successful run). Fixed by routing exit through `process.exitCode = ...` +
 * `return` instead — this guard keeps that fix from silently regressing.
 *
 * Comment-AND-string-aware — NOT the shared stripComments
 * (level-assertion-guard.mjs), and this is deliberate, not an oversight.
 * stripComments preserves string-literal CONTENT unchanged by design (its
 * real consumers need to read values like `certifiedBy: '...'` back out
 * afterward). That is wrong for THIS guard: found live while building
 * this, 2026-08-27 — import-rebar-exitcode.test.mjs's own test-name
 * strings and console.log template literals describe the regression in
 * prose ("the exact regression: process.exit(0) tore the process down..."),
 * and stripComments alone left that text matchable, producing a false
 * positive on a file that calls no such thing. stripCommentsAndStrings
 * below extends the same state machine one step further: in the 'string'
 * state, characters are DROPPED instead of kept (only the delimiter quotes
 * themselves pass through), so `process.exit(` appearing as prose inside a
 * string can never match, while `process.exit(0)` written as actual code
 * still can. Also has the regex-literal caveat stripComments has
 * (docs/KASHRUT_FACTS.md §36: a regex literal containing a character class
 * with both quote characters corrupts the string-tracking state) — checked,
 * this file's own source contains no such regex (PROCESS_EXIT_RE below uses
 * no quote characters at all), confirmed by running the scan against this
 * file itself in the guard's own test suite.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Same state machine as level-assertion-guard.mjs's stripComments, except
 * string-literal CHARACTERS are dropped (not kept) — only the opening and
 * closing quote pass through. This means a real code call like
 * `process.exit(0)` (never inside quotes) still matches PROCESS_EXIT_RE
 * afterward, while the identical text appearing as prose inside a string
 * literal is erased down to empty quotes and cannot match.
 */
function stripCommentsAndStrings(src) {
  let out = '';
  let state = 'code'; // 'code' | 'string' | 'line' | 'block'
  let quote = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const c2 = src[i + 1];
    if (state === 'code') {
      if (c === '/' && c2 === '/') { state = 'line'; i++; continue; }
      if (c === '/' && c2 === '*') { state = 'block'; i++; continue; }
      if (c === '"' || c === "'" || c === '`') { state = 'string'; quote = c; out += c; continue; }
      out += c;
    } else if (state === 'string') {
      if (c === '\\') { i++; continue; } // drop the escaped character too
      if (c === quote) { state = 'code'; quote = null; out += c; continue; }
      // string content itself is dropped — the one difference from stripComments
    } else if (state === 'line') {
      if (c === '\n') { state = 'code'; out += c; }
    } else if (state === 'block') {
      if (c === '*' && c2 === '/') { state = 'code'; i++; }
    }
  }
  return out;
}

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPTS_ROOT = resolve(REPO_ROOT, 'scripts');

const PROCESS_EXIT_RE = /\bprocess\.exit\(/;

/**
 * The two files actually involved in the regression this guard exists to
 * catch — import-rebar.mjs itself, and the shared fetch/parse module it
 * calls into. NOT all of scripts/ — see the file header for why a wider
 * scope was checked and deliberately rejected for this commit.
 */
const GUARDED_FILES = [
  'import-rebar.mjs',
  'shared/rebar-feed.mjs',
];

export function findProcessExitViolations() {
  const violations = [];
  for (const relPath of GUARDED_FILES) {
    const file = resolve(SCRIPTS_ROOT, relPath);
    const src = readFileSync(file, 'utf8');
    const stripped = stripCommentsAndStrings(src);
    if (PROCESS_EXIT_RE.test(stripped)) {
      violations.push(relPath);
    }
  }
  return violations;
}

/** Repo-wide scan, exported separately for the test suite only — proves
 * the 10-violation-elsewhere claim above is a real, checked number, not an
 * assertion. Not used by findProcessExitViolations() and not what gates
 * anything; scoping the actual guard is GUARDED_FILES's job, not this. */
export function findProcessExitViolationsRepoWide() {
  function listFiles(dir, out = []) {
    for (const entry of readdirSync(dir)) {
      const full = resolve(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) listFiles(full, out);
      else if (/\.mjs$/.test(entry)) out.push(full);
    }
    return out;
  }
  const violations = [];
  for (const file of listFiles(SCRIPTS_ROOT)) {
    const relPath = relative(SCRIPTS_ROOT, file).replace(new RegExp('\\' + sep, 'g'), '/');
    const src = readFileSync(file, 'utf8');
    const stripped = stripCommentsAndStrings(src);
    if (PROCESS_EXIT_RE.test(stripped)) {
      violations.push(relPath);
    }
  }
  return violations;
}

// Exported for the test suite — proving the string-dropping behavior
// directly, not just observing it as a side effect of a repo-wide scan.
export { stripCommentsAndStrings };
