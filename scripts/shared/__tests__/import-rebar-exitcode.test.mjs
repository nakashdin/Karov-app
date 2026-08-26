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
// mock cannot exercise this failure mode.

const realRun = spawnSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });

test('a completely successful REAL dry run (real network fetch) exits 0, not 127 — the exact regression: process.exit(0) tore the process down before the fetch\'s keep-alive socket finished closing', () => {
  assert.equal(realRun.status, 0, `expected exit 0, got ${realRun.status}. stderr: ${realRun.stderr?.slice(0, 500)}`);
});

test('the real dry run\'s own stdout confirms it actually ran (not a silently-empty success)', () => {
  assert.match(realRun.stdout, /Rebar import — DRY RUN/);
  assert.match(realRun.stdout, /dry run — nothing written/);
});

test('no libuv teardown assertion in stderr', () => {
  assert.doesNotMatch(realRun.stderr ?? '', /UV_HANDLE_CLOSING/);
});

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
