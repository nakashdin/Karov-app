// Standalone test (not jest). Run: node scripts/shared/__tests__/import-rebar-exitcode.test.mjs
//
// Two DIFFERENT regressions, needing two DIFFERENT kinds of test — conflating
// them was tried first and was wrong (see the note before SECTION 2 below).
//
//   1. import-rebar.mjs used to call process.exit(0) on its success paths,
//      which tears the process down before the fetch's keep-alive socket
//      finishes closing — libuv aborts with "Assertion failed:
//      !(handle->flags & UV_HANDLE_CLOSING)" and the process exits 127 on a
//      completely successful run. This depends on a REAL open socket — a
//      mocked fetch never leaves one, so only a real network call can
//      exercise or guard this specific failure mode. SECTION 1 below
//      deliberately makes a real network call for exactly this reason,
//      unlike every other test in this repo.
//
//   2. Separately: the OBVIOUS fix for (1) — "set process.exitCode and
//      return" — applied naively to the script's THEN structure would have
//      deleted the ONLY thing preventing a dry run from reaching the
//      backup+write code (that structure had no independent
//      `if (APPLY) {...}` gate around the write itself). Fixed by an
//      explicit if/else-if/else where the write is reachable only inside
//      the branch requiring APPLY true. SECTION 2 below tests THIS
//      property with an injected synthetic feed (no network dependency,
//      deterministic, sabotage-fireable) — and the Architect's own
//      sharpest finding while building this: a first version of that test
//      PASSED even with the entire dry-run guard deleted, because the
//      synthetic feed used had zero genuinely-new stores, so
//      "nothing to add" took over regardless of whether the guard existed.
//      A test that passes whether or not the guard exists is not a test.
//      Fixed by injecting a feed with a genuinely NEW store (matches no
//      existing rebar-* record), making the write path actually live —
//      fired directly below by sabotaging the guard and confirming this
//      exact test goes red before trusting it.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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

console.log('import-rebar.mjs — exit code and dry-run write safety');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SCRIPT = resolve(ROOT, 'scripts', 'import-rebar.mjs');
const PLACES_PATH = resolve(ROOT, 'src/data/generated/places.osm.json');
const RESTAURANTS_PATH = resolve(ROOT, 'src/data/generated/restaurants.osm.json');
const BACKUP_DIR = resolve(ROOT, 'data-backups', 'import-rebar');

// ── SECTION 1: the real-network exit-code regression ────────────────────
// Deliberately makes a real network call — see module header for why a
// mock cannot exercise this failure mode. Found live, 2026-08-27 (Reviewer's
// matrix, fired against 3fe80b9 with the real process.exit(0) regression
// reintroduced): a fixture, a local keep-alive HTTP server, and a blanket
// try/catch around this whole section ALL return exit 0 whether or not the
// regression is present — none of them can distinguish "the endpoint
// refused us" from "the process.exit(0) teardown bug is back." A skip that
// is not keyed on the SPECIFIC shape of a fetch-layer rejection has exactly
// that defect: it would convert exit 127 (the actual regression) into a
// silent, celebrated "SKIPPED" alongside a genuine 403. So the discriminator
// below is not "did the run fail" — it's "does stderr contain the EXACT
// message shape fetchRebarStores' own `throw` produces
// (scripts/shared/rebar-feed.mjs:167, `HTTP ${res.status}`) or a fetch-layer
// network error (ECONNREFUSED/ETIMEDOUT/ENOTFOUND/EAI_AGAIN) — the only two
// shapes that mean 'the endpoint or network refused us,' as opposed to any
// other way this process can end non-zero.
//
// Every branch below emits a GitHub Actions workflow command (`::error::`
// or `::warning::`) naming what happened — found live, same day: this job's
// log requires admin rights this session doesn't have (confirmed 403,
// repeatedly), so anything that only reaches stdout is invisible outside
// the job. A workflow command becomes a public check-run annotation.
//
// NOT CONFIRMED, stated plainly: whether CI's actual failures are
// rebar.co.il rejecting the request is a hypothesis this change is built to
// answer, not one it assumes. Also recorded live, same day
// (docs/KASHRUT_FACTS.md §39): rebar.co.il returns 403 to ANY non-browser
// User-Agent from inside Israel too (curl, python-requests, empty UA) — the
// Chrome UA this script already sends gets 200 from here. So a 403 in CI
// would not by itself prove geo-blocking is the mechanism; it would prove
// the endpoint refused THIS request, which is exactly and only what this
// change is built to surface, nothing more.
const REBAR_FILE = 'scripts/shared/__tests__/import-rebar-exitcode.test.mjs';
// import-rebar.mjs's catch block prints exactly one of two shapes (see its
// own comment, added alongside this fix): fetchRebarStores' own HTTP-status
// throw puts the status directly in the message ("fetchRebarStores: HTTP
// 403"), or a connection-level failure appends the undici cause CODE in
// parens ("fetch failed (ECONNREFUSED)") — found live, 2026-08-27: Node's
// native fetch puts connection failures on err.cause.code, NOT in
// err.message, so a regex expecting the code to appear inline in the
// message text could never match what the code actually prints, until this
// same fix added the cause code to the printed line. No `s`/dotAll flag
// needed — both shapes are on ONE line, deliberately (a multi-line message
// here was an earlier draft's bug: `.*?` doesn't cross newlines by default,
// so a wrapped multi-line stderr message would silently never match).
const FETCH_REJECTION_RE = /✗ fetch failed: (fetchRebarStores: HTTP (\d+)|fetch failed \((ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN)\))/;

const realRun = spawnSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
const rejectionMatch = FETCH_REJECTION_RE.exec(realRun.stderr ?? '');

if (realRun.status !== 0 && rejectionMatch) {
  // The endpoint or network itself refused the request — not a regression
  // in our own code, and the ONLY thing this branch is permitted to treat
  // as non-fatal. Reported, not silently passed: this line becomes a
  // public annotation naming the exact status, so the next CI run answers
  // "is it really 403" without anyone needing a job-log token.
  console.log(
    `::warning file=${REBAR_FILE}::SECTION 1 SKIPPED — rebar.co.il refused the request: ${rejectionMatch[0].replace('✗ fetch failed: ', '')}. ` +
      'Not counted as a failure of this test (the endpoint refusing us is not a regression in our own code) — ' +
      'this line is the confirmation the rebar hypothesis needs, whatever it says.',
  );
  test('SECTION 1 real-network assertions skipped — see the ::warning:: annotation above for why', () => {
    // Intentionally empty: the precondition (a reachable endpoint) did not
    // hold, so the exit-0/127 distinction this section exists to test
    // cannot be exercised either way. Counted as passed so a legitimate
    // skip does not fail the suite — the annotation above is what carries
    // the signal, not this test's pass/fail.
  });
} else {
  test('a completely successful REAL dry run (real network fetch) exits 0, not 127 — the exact regression: process.exit(0) tore the process down before the fetch\'s keep-alive socket finished closing', () => {
    if (realRun.status !== 0) {
      console.log(`::error file=${REBAR_FILE}::SECTION 1 failed with a NON-rejection error (not a recognized "endpoint refused us" shape) — exit ${realRun.status}. stderr: ${(realRun.stderr ?? '').slice(0, 500).replace(/\n/g, ' | ')}`);
    }
    assert.equal(realRun.status, 0, `expected exit 0, got ${realRun.status}. stderr: ${realRun.stderr?.slice(0, 500)}`);
  });

  test('the real dry run\'s own stdout confirms it actually ran (not a silently-empty success)', () => {
    assert.match(realRun.stdout, /Rebar import — DRY RUN/);
    assert.match(realRun.stdout, /dry run — nothing written/);
  });

  test('no libuv teardown assertion in stderr', () => {
    if (/UV_HANDLE_CLOSING/.test(realRun.stderr ?? '')) {
      console.log(`::error file=${REBAR_FILE}::THE REGRESSION IS BACK — libuv UV_HANDLE_CLOSING assertion in stderr, exit ${realRun.status}. This is the exact process.exit(0)-tears-down-open-socket bug SECTION 1 exists to catch.`);
    }
    assert.doesNotMatch(realRun.stderr ?? '', /UV_HANDLE_CLOSING/);
  });
}

// ── SECTION 2: dry-run write safety, via an injected synthetic feed ─────
// No network dependency — REBAR_TEST_FETCH_TEXT (import-rebar.mjs's
// test-only seam) substitutes this text for the real fetch response.

// One store far from every real rebar-* record (fictional address/
// coordinates) — matches no existing record by distance or address, so it
// is genuinely NEW and the write path is actually reachable; a store that
// happened to match an existing record would take the "nothing to add"
// branch regardless of whether the dry-run guard exists at all, which is
// exactly the shape that let a broken guard pass silently the first time.
const SYNTHETIC_FEED_WITH_NEW_STORE =
  '\\"name\\":\\"עיר בדיקה- סניף בדיקה\\",\\"address\\":\\"רחוב הבדיקה 1\\",\\"city\\":\\"עיר בדיקה\\",' +
  '\\"active\\":true,\\"latitude\\":32.9123456,\\"longitude\\":35.9123456,' +
  '\\"hasDelivery\\":true,\\"hasPickup\\":true,\\"kosher\\":true,';

// Run ONCE, asserted by two separate tests below — reachability first, then
// the outcome. Per the Architect's finding on the first version of this
// test: the synthetic store not matching any existing record is a property
// of the FIXTURE, and fixtures drift. If it ever starts matching, newStores
// silently returns to 0, "nothing to add" takes over, and a test that only
// checks the dataset is unchanged would pass for the ORIGINAL wrong
// reason — indistinguishable from the guard actually working. Both tests
// below re-assert reachability from the same run's stdout, so neither can
// pass on a drifted, no-longer-live fixture — one fails loudly with a
// message that says why, instead of both passing silently.
const before = { places: readFileSync(PLACES_PATH), restaurants: readFileSync(RESTAURANTS_PATH) };
const backupCountBefore = existsSync(BACKUP_DIR) ? readdirSync(BACKUP_DIR).length : 0;
const syntheticRun = spawnSync(process.execPath, [SCRIPT], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 30000,
  env: { ...process.env, REBAR_TEST_FETCH_TEXT: SYNTHETIC_FEED_WITH_NEW_STORE },
});
const after = { places: readFileSync(PLACES_PATH), restaurants: readFileSync(RESTAURANTS_PATH) };
const backupCountAfter = existsSync(BACKUP_DIR) ? readdirSync(BACKUP_DIR).length : 0;

function assertProbeIsLive() {
  assert.match(
    syntheticRun.stdout,
    /NEW records \(kosher:true, zero candidate existing records\)/,
    'the synthetic store did not reach the "new" bucket — the fixture has drifted into matching an existing record (or something else changed), so newStores is back to 0 and the write path below is NOT actually live. This precondition must hold BEFORE the dataset-unchanged assertion means anything; without it, a broken guard and a working one are indistinguishable.',
  );
}

test('PRECONDITION, asserted first: the synthetic feed store is genuinely reachable as NEW (matches no existing record) — the write path is actually live for the test below, not skipped by "nothing to add"', () => {
  assertProbeIsLive();
});

test('REGRESSION-PROOF: given the write path is live (re-asserted above), a dry run against it still writes NOTHING — both dataset files byte-identical before/after, no backup file created', () => {
  assertProbeIsLive();
  assert.equal(syntheticRun.status, 0, `expected exit 0, got ${syntheticRun.status}. stderr: ${syntheticRun.stderr?.slice(0, 500)}`);
  assert.ok(before.places.equals(after.places), 'places.osm.json changed during a dry run');
  assert.ok(before.restaurants.equals(after.restaurants), 'restaurants.osm.json changed during a dry run');
  assert.equal(backupCountAfter, backupCountBefore, 'a dry run must never create a backup file either');
});

// ── SECTION 3: the fetch-failure path, under the NEW exit mechanism ─────
// The committed version yielded exit 1 on fetch failure via process.exit(1)
// — but that worked only because a failed fetch leaves no live handle open,
// incidental to the fix, not proof of it. The mechanism changed (process.
// exitCode = 1 + return); this asserts the OBSERVABLE behavior explicitly
// under the new code, not carried over from the old.

const failRun = spawnSync(process.execPath, [SCRIPT], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 30000,
  env: { ...process.env, REBAR_TEST_FETCH_FAIL: '1' },
});

test('a fetch failure exits 1 — not 0 (silently swallowed) and not 127 (the original teardown bug) — under the new process.exitCode + return mechanism', () => {
  assert.equal(failRun.status, 1, `expected exit 1, got ${failRun.status}. stdout: ${failRun.stdout?.slice(0, 300)} stderr: ${failRun.stderr?.slice(0, 300)}`);
  assert.match(failRun.stderr, /fetch failed/);
});

test('the fetch-failure run also writes nothing to the dataset', () => {
  assert.ok(before.places.equals(readFileSync(PLACES_PATH)), 'places.osm.json changed on a fetch-failure run');
  assert.ok(before.restaurants.equals(readFileSync(RESTAURANTS_PATH)), 'restaurants.osm.json changed on a fetch-failure run');
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
