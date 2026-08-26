// Standalone test (not jest). Run: node scripts/shared/__tests__/import-rebar-write.test.mjs
//
// Closes the last real gap in Item 4 Unit 1: every prior test of the write
// path asserted only NEGATIVES (nothing written, byte-identical, no
// backup — see import-rebar-exitcode.test.mjs). Those prove the write path
// is REACHABLE; none of them prove it WORKS. A script with the write branch
// deleted outright would pass every one of them.
//
// This test calls main() directly with temp files it creates itself —
// never the real dataset. The real dataset path is not even a candidate
// value here, so it cannot be reached even by a bug in this test, which is
// stronger than worktree isolation (isolated by discipline) or dry-run-only
// testing (isolated by never exercising the write at all). This is what
// import-rebar.mjs's main() being exported and parameterized
// (placesPath/restaurantsPath/backupRoot/fetchImpl/apply) is FOR.
//
// The trap named directly: do not assert merely that a write occurred —
// that is the same shape as asserting nothing occurred, one level over, and
// is satisfied by a script that writes garbage. Every assertion below
// checks specific field VALUES, an exact count delta, and byte-identical
// backup content — not just "something changed."
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, readdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { main } from '../../import-rebar.mjs';

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
async function asyncTest(name, fn) {
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

console.log('import-rebar.mjs — the write path itself, via temp files only');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

// A minimal, controlled starting dataset — not the real 7471-record file.
// One existing rebar-* record, geographically far from the synthetic new
// store below, so it can never accidentally become a match candidate.
const SEED_PLACES = [
  { id: 'rebar-existing1', name: 'רי בר rebar קיים', address: 'רחוב קיים 1, עיר קיימת', location: { latitude: 31.0, longitude: 34.6 } },
  { id: 'other-place-1', name: 'מקום אחר', address: 'כתובת אחרת' },
];
const SEED_RESTAURANTS = [{ id: 'other-place-1', name: 'מקום אחר' }];

// One store, far from SEED_PLACES' existing rebar record, matching no
// candidate at all — genuinely new. Real feed field shape (raw escaped
// text, matching STORE_RE exactly).
const SYNTHETIC_FEED_ONE_NEW_STORE =
  '\\"name\\":\\"עיר בדיקה- סניף בדיקה\\",\\"address\\":\\"רחוב הבדיקה 1\\",\\"city\\":\\"עיר בדיקה\\",' +
  '\\"active\\":true,\\"latitude\\":32.9123456,\\"longitude\\":35.9123456,' +
  '\\"hasDelivery\\":true,\\"hasPickup\\":true,\\"kosher\\":true,';

function fakeFetchImpl(text) {
  return async () => ({ ok: true, status: 200, text: async () => text });
}

function makeTempFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'import-rebar-write-test-'));
  const placesPath = join(dir, 'places.osm.json');
  const restaurantsPath = join(dir, 'restaurants.osm.json');
  writeFileSync(placesPath, JSON.stringify(SEED_PLACES, null, 2), 'utf8');
  writeFileSync(restaurantsPath, JSON.stringify(SEED_RESTAURANTS, null, 2), 'utf8');
  return { dir, placesPath, restaurantsPath };
}

function readJson(p) {
  // writeNoBom() (the production code under test) prepends a UTF-8 BOM —
  // strip it the same way readNoBom() does, or every read of a
  // freshly-written file fails to parse.
  const buf = readFileSync(p);
  const s = (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) ? buf.slice(3) : buf;
  return JSON.parse(s.toString('utf8'));
}

// ── apply:true — the write path must actually work, checked precisely ──

async function runApply() {
  const { dir, placesPath, restaurantsPath } = makeTempFixture();
  const placesBefore = readFileSync(placesPath);
  try {
    await main({
      fetchImpl: fakeFetchImpl(SYNTHETIC_FEED_ONE_NEW_STORE),
      placesPath,
      restaurantsPath,
      backupRoot: dir,
      apply: true,
    });
    const placesAfter = readJson(placesPath);
    const restaurantsAfter = readJson(restaurantsPath);
    const backupDir = join(dir, 'data-backups', 'import-rebar');
    return { dir, placesPath, placesBefore, placesAfter, restaurantsAfter, backupDir };
  } catch (err) {
    rmSync(dir, { recursive: true, force: true });
    throw err;
  }
}

const applyResult = await runApply();

test('record count increases by EXACTLY 1 — not merely "increases"', () => {
  assert.equal(applyResult.placesAfter.length, SEED_PLACES.length + 1);
});

test('the new record is present with the correct id (derived from the feed name) and correct field values — name, address, coordinates', () => {
  const newRecord = applyResult.placesAfter.find((p) => !SEED_PLACES.some((s) => s.id === p.id));
  assert.ok(newRecord, 'no new record found at all');
  assert.match(newRecord.id, /^rebar-[0-9a-f]{8}$/);
  assert.equal(newRecord.name, 'רי בר rebar עיר בדיקה- סניף בדיקה');
  assert.equal(newRecord.address, 'רחוב הבדיקה 1');
  assert.equal(newRecord.cityId, 'עיר בדיקה');
  assert.deepEqual(newRecord.location, { latitude: 32.9123456, longitude: 35.9123456 });
});

test('the new record\'s kashrut fields are exactly the evidence ceiling — kosherType:"kosher", kosherLevel:null, kosherAuthorityGroup:"unknown", NO kosherAuthority, NO certifiedBy', () => {
  const newRecord = applyResult.placesAfter.find((p) => !SEED_PLACES.some((s) => s.id === p.id));
  assert.equal(newRecord.kosherType, 'kosher');
  assert.equal(newRecord.kosherLevel, null);
  assert.equal(newRecord.kosherAuthorityGroup, 'unknown');
  assert.equal('kosherAuthority' in newRecord, false, 'kosherAuthority must not be present at all — the feed states none');
  assert.equal('certifiedBy' in newRecord, false, 'certifiedBy must not be present at all — the feed names no body');
});

test('the existing seed record is untouched — byte-for-byte identical field values', () => {
  const existing = applyResult.placesAfter.find((p) => p.id === 'rebar-existing1');
  assert.deepEqual(existing, SEED_PLACES[0]);
});

test('restaurants.osm.json also received the new record', () => {
  const newRecord = applyResult.restaurantsAfter.find((p) => !SEED_RESTAURANTS.some((s) => s.id === p.id));
  assert.ok(newRecord, 'new record missing from restaurants.osm.json');
  assert.equal(newRecord.kosherType, 'kosher');
});

test('a backup was created, and it is byte-identical to the file as it stood BEFORE the write', () => {
  assert.ok(existsSync(applyResult.backupDir), 'backup directory was not created');
  const files = readdirSync(applyResult.backupDir).filter((f) => f.startsWith('places.osm.'));
  assert.equal(files.length, 1, 'expected exactly one places.osm backup file');
  const backupContent = readFileSync(join(applyResult.backupDir, files[0]));
  assert.ok(backupContent.equals(applyResult.placesBefore), 'backup content does not match the pre-write file byte-for-byte');
});

// Validating the OUTPUT, not a count — AGENTS.md's own rule: a correct
// count on an invalid file is still a failure. validate-data.mjs itself
// can't be pointed at a temp path (it resolves its own paths internally),
// so this asserts everything reachable without it, and says so rather than
// silently narrowing scope: valid JSON, no duplicate ids, every id
// non-empty and unique, and `location` is the correct {latitude,longitude}
// shape (not the {lat,lng} shape sanitizePlace silently drops — AGENTS.md's
// own named hazard).
test('output validation (what is reachable without validate-data.mjs, which cannot be pointed at a temp path): valid JSON, no duplicate ids, every location uses {latitude,longitude} not {lat,lng}', () => {
  const ids = applyResult.placesAfter.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id found in the written output');
  for (const p of applyResult.placesAfter) {
    assert.ok(typeof p.id === 'string' && p.id.length > 0, `record with empty/missing id: ${JSON.stringify(p)}`);
    if (p.location) {
      assert.equal(typeof p.location.latitude, 'number', `location.latitude wrong shape on ${p.id}`);
      assert.equal(typeof p.location.longitude, 'number', `location.longitude wrong shape on ${p.id}`);
      assert.equal('lat' in p.location, false, `location uses the {lat,lng} shape on ${p.id} — sanitizePlace silently drops this`);
    }
  }
});

rmSync(applyResult.dir, { recursive: true, force: true });

// ── FIRE IT: delete the write branch, confirm red, restore, confirm green ─
//
// NEVER writes the tracked scripts/import-rebar.mjs, not even briefly with
// a finally-restore. This checkout is shared by multiple sessions
// (AGENTS.md's own standing warning), and the risk it names is about the
// MECHANISM — a Ctrl+C, a crash, or another session's `git add` landing
// inside the write-then-restore window — not about which file, and not
// about whether the dataset itself is touched. `finally` does not close
// that window: Node's default SIGINT and any SIGKILL/hard crash terminate
// without unwinding it, and a "source restored" follow-up test only ever
// runs in the case that was never actually at risk. The state a crash
// would leave behind here is the worst available one — a silently
// disabled write, `} else if (false) {`, committed: `--apply` would report
// success and write nothing, the exact quiet-failure shape, in the one
// file whose entire purpose is proving the write path is NOT that.
//
// Instead: copy scripts/ WHOLESALE to a temp directory, sabotage the COPY,
// import from the copy. Every import-rebar.mjs dependency is a relative
// path inside scripts/ (./shared/rebar-feed.mjs, ./shared/kashrut-write.mjs,
// which itself resolves ../reports/kashrut-registry.json relative to
// itself) — copying the whole directory satisfies all of them. `root`
// inside the copy is never used for anything that matters, since every
// path main() touches is now an injected parameter with no default. A
// crash mid-sabotage leaves a stray temp directory, not a corrupted
// tracked file — no git operation is involved at any point in this test.

const SCRIPTS_DIR = resolve(ROOT, 'scripts');

await asyncTest('FIRE: with the write branch disabled (in an isolated COPY of scripts/, never the tracked file), the record-count-increases-by-1 assertion goes red', async () => {
  const copyDir = mkdtempSync(join(tmpdir(), 'import-rebar-scripts-copy-'));
  try {
    cpSync(SCRIPTS_DIR, copyDir, { recursive: true });
    const copiedImportRebarPath = join(copyDir, 'import-rebar.mjs');

    const original = readFileSync(copiedImportRebarPath, 'utf8');
    const marker = '  } else {\n    const newPlaces = newStores.map(buildNewPlace);';
    assert.ok(original.includes(marker), 'sabotage anchor text not found in the current source — update this test\'s anchor to match the real code');
    const sabotaged = original.replace(marker, '  } else if (false) {\n    const newPlaces = newStores.map(buildNewPlace);');
    writeFileSync(copiedImportRebarPath, sabotaged, 'utf8');

    const { main: sabotagedMain } = await import(pathToFileURL(copiedImportRebarPath).href + `?sabotage=${Date.now()}`);
    const { dir, placesPath, restaurantsPath } = makeTempFixture();
    try {
      await sabotagedMain({ fetchImpl: fakeFetchImpl(SYNTHETIC_FEED_ONE_NEW_STORE), placesPath, restaurantsPath, backupRoot: dir, apply: true });
      const sabotagedResult = readJson(placesPath);
      assert.equal(sabotagedResult.length, SEED_PLACES.length, 'expected the sabotaged (write-disabled) version to add nothing — if it added a record, the sabotage did not actually disable the branch');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } finally {
    rmSync(copyDir, { recursive: true, force: true });
  }
});

test('the real, tracked scripts/import-rebar.mjs was never modified — the sabotage above operated entirely on a temp copy', () => {
  const real = readFileSync(resolve(SCRIPTS_DIR, 'import-rebar.mjs'), 'utf8');
  assert.ok(real.includes('} else {\n    const newPlaces = newStores.map(buildNewPlace);'), 'the real write branch is not in its expected, un-sabotaged form');
  assert.ok(!real.includes('else if (false)'), 'the real file must never contain the sabotage marker');
});

// ── apply:false against the SAME live fixture (newStores > 0) ───────────
// The negative case is only meaningful when there was genuinely something
// to write — re-uses the exact same synthetic feed as the apply:true case
// above, not a different, possibly-already-empty one.

await asyncTest('apply:false against the same fixture that has a genuinely new store: writes nothing, record count unchanged', async () => {
  const { dir, placesPath, restaurantsPath } = makeTempFixture();
  const before = readFileSync(placesPath);
  try {
    await main({ fetchImpl: fakeFetchImpl(SYNTHETIC_FEED_ONE_NEW_STORE), placesPath, restaurantsPath, backupRoot: dir, apply: false });
    const after = readFileSync(placesPath);
    assert.ok(before.equals(after), 'places.osm.json changed on an apply:false run');
    assert.equal(existsSync(join(dir, 'data-backups')), false, 'a dry run must not create a backup directory at all');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
