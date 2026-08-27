// Standalone test (not jest — .mjs files aren't in jest's testMatch, and
// importers/ is outside jest's roots:['<rootDir>/src'] anyway).
// Run: node scripts/shared/__tests__/category-overwrite-guard.test.mjs
//
// Every guard here gets FIRED, not read — each violation case builds the bad
// candidate and calls the real exported planCategoryOverwrite()/
// writeCategoryGuarded()/category-plan.ts CLI, then asserts on the result.
//
// A per-record kashrut-content guard (no-kashrut-regression) was designed,
// implemented, and WITHDRAWN in the same review round this test file was
// written: 58 of the 283 osm-sourced live restaurants.osm.json records
// already carry a kashrut field a faithful fresh OSM fetch never reproduces,
// so a zero-tolerance content guard blocks every legitimate run, not just
// destructive ones. See the comment above planCategoryOverwrite() in
// importers/shared/database.ts. This file therefore only covers the three
// guards that survived: volume, no-dropped-ids, no-dropped-manual-records —
// all presence-only, which is exactly what makes them satisfiable regardless
// of what content a legitimate OSM re-fetch does or doesn't carry.
//
// planCategoryOverwrite(file, candidate) reads its "live" side from disk
// (GENERATED_DIR/file) — there is no way to inject a live array directly,
// and that's intentional: it's the same function production code calls, not
// a test-only variant. To fire it for real without ever writing into
// src/data/generated/ in the SHARED checkout (the one rule this repo cannot
// bend — AGENTS.md, "a worktree is theatre against a script with an
// absolute path" and its companion "אל תשנה את src/data/generated/ בעץ
// המשותף"), this file creates its own detached worktree, copies the
// CURRENT working-tree copy of database.ts (and category-plan.ts, for the
// CLI test) into it — so this test exercises uncommitted edits during
// development and the committed files afterward, identically — and does
// every fixture read/write against that worktree's own
// src/data/generated/. The worktree is removed in a finally block.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const WORKTREE_DIR = join(tmpdir(), `karov-category-guard-test-${process.pid}-${Math.floor(Math.random() * 1e6)}`);

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

function guard(report, name) {
  const g = report.guards.find((x) => x.name === name);
  assert.ok(g, `no guard named "${name}" in report — guard set: ${report.guards.map((x) => x.name).join(', ')}`);
  return g;
}

console.log('category-overwrite guard (importers/shared/database.ts: planCategoryOverwrite / writeCategoryGuarded)');
console.log(`worktree: ${WORKTREE_DIR}`);

// ── setup: detached worktree, uncommitted database.ts/category-plan.ts copied in ──
execFileSync('git', ['worktree', 'add', '--detach', WORKTREE_DIR, 'HEAD'], { cwd: REPO_ROOT, stdio: 'pipe' });
copyFileSync(join(REPO_ROOT, 'importers/shared/database.ts'), join(WORKTREE_DIR, 'importers/shared/database.ts'));
copyFileSync(join(REPO_ROOT, 'importers/shared/category-plan.ts'), join(WORKTREE_DIR, 'importers/shared/category-plan.ts'));

try {
  const db = await import(pathToFileURL(join(WORKTREE_DIR, 'importers/shared/database.ts')).href);
  const { planCategoryOverwrite, writeCategoryGuarded, formatCategoryOverwriteReport, writeJson, readJson } = db;

  // One osm-sourced record (a fresh Overpass fetch can reproduce this) and
  // two manually-curated records, matching the shape the 80+ patch scripts
  // actually write.
  const LIVE_BASE = [
    { id: 'osm-1', name: 'OSM Place', source: 'osm', type: 'restaurant', location: { latitude: 32.08, longitude: 34.78 } },
    { id: 'manual-1', name: 'Manual Chain A', source: 'manual', type: 'restaurant', certifiedBy: 'בד"ץ בית יוסף', phone: '03-1111111' },
    { id: 'manual-2', name: 'Manual Chain B', source: 'manual', type: 'cafe', certifiedBy: 'רבנות תל אביב' },
  ];

  const clone = (records) => JSON.parse(JSON.stringify(records));
  let seq = 0;
  function seed(records) {
    const file = `__fixture_${seq++}.json`;
    writeJson(file, clone(records));
    return file;
  }

  test('identical candidate passes all three guards', () => {
    const file = seed(LIVE_BASE);
    const report = planCategoryOverwrite(file, clone(LIVE_BASE));
    assert.equal(report.blocked, false);
    for (const g of report.guards) assert.equal(g.passed, true, `${g.name} unexpectedly failed: ${g.detail}`);
  });

  test('VIOLATION: empty candidate fails volume, no-dropped-ids, no-dropped-manual-records', () => {
    const file = seed(LIVE_BASE);
    const report = planCategoryOverwrite(file, []);
    assert.equal(report.blocked, true);
    assert.equal(guard(report, 'volume').passed, false);
    assert.equal(guard(report, 'no-dropped-ids').passed, false);
    assert.equal(guard(report, 'no-dropped-manual-records').passed, false);
  });

  test('VIOLATION: candidate = only the osm-sourced record drops both manual records', () => {
    const file = seed(LIVE_BASE);
    const report = planCategoryOverwrite(file, [clone(LIVE_BASE)[0]]);
    assert.equal(guard(report, 'no-dropped-manual-records').passed, false);
    assert.equal(report.manualRecordsDropped, 2);
    // volume: 1/3 = 33% is also below the 95% floor on this small fixture
    assert.equal(guard(report, 'volume').passed, false);
  });

  test('NON-VIOLATION: dropping only the osm-sourced record (fully reproducible by definition) still passes no-dropped-manual-records, but fails no-dropped-ids — presence guards are id-exact, not source-scoped', () => {
    const file = seed(LIVE_BASE);
    const report = planCategoryOverwrite(file, clone(LIVE_BASE).filter((r) => r.id !== 'osm-1'));
    assert.equal(guard(report, 'no-dropped-manual-records').passed, true);
    assert.equal(guard(report, 'no-dropped-ids').passed, false);
    assert.equal(report.blocked, true);
  });

  test('formatCategoryOverwriteReport renders all three guard names', () => {
    const file = seed(LIVE_BASE);
    const text = formatCategoryOverwriteReport(planCategoryOverwrite(file, clone(LIVE_BASE)));
    for (const name of ['volume', 'no-dropped-ids', 'no-dropped-manual-records']) {
      assert.ok(text.includes(name), `report text missing guard "${name}"`);
    }
  });

  // ── writeCategoryGuarded end-to-end: opt-in semantics + an actual guarded write ──

  test('writeCategoryGuarded throws WITHOUT the opt-in env even for a fully safe candidate (the flag gates the operation, not just the risk)', () => {
    const file = seed(LIVE_BASE);
    delete process.env.KAROV_ALLOW_DESTRUCTIVE_CATEGORY_OVERWRITE;
    assert.throws(() => writeCategoryGuarded(file, clone(LIVE_BASE)), /is disabled/);
    assert.deepEqual(readJson(file, null), clone(LIVE_BASE));
  });

  test('writeCategoryGuarded throws WITH the opt-in env when a guard still fails — opt-in does not bypass guards', () => {
    const file = seed(LIVE_BASE);
    process.env.KAROV_ALLOW_DESTRUCTIVE_CATEGORY_OVERWRITE = '1';
    try {
      assert.throws(() => writeCategoryGuarded(file, []), /blocked by \d+ failing guard/);
      assert.deepEqual(readJson(file, null), clone(LIVE_BASE));
    } finally {
      delete process.env.KAROV_ALLOW_DESTRUCTIVE_CATEGORY_OVERWRITE;
    }
  });

  test('writeCategoryGuarded actually writes when opted in AND every guard passes', () => {
    const file = seed(LIVE_BASE);
    const candidate = clone(LIVE_BASE).map((r) => (r.id === 'osm-1' ? { ...r, phone: '03-9999999' } : r));
    process.env.KAROV_ALLOW_DESTRUCTIVE_CATEGORY_OVERWRITE = '1';
    try {
      const report = writeCategoryGuarded(file, candidate);
      assert.equal(report.written, true);
      assert.deepEqual(readJson(file, null), candidate);
    } finally {
      delete process.env.KAROV_ALLOW_DESTRUCTIVE_CATEGORY_OVERWRITE;
    }
  });

  // ── the data:category-plan CLI, run as a real subprocess ─────────────────

  test('CLI: category-plan exits 1 and prints BLOCKED for a destructive candidate, writes nothing', () => {
    const file = seed(LIVE_BASE);
    const candidatePath = join(WORKTREE_DIR, 'src/data/generated', `__cli_candidate_blocked_${seq++}.json`);
    mkdirSync(dirname(candidatePath), { recursive: true });
    writeFileSync(candidatePath, JSON.stringify([]), 'utf8');

    const result = spawnSync(process.execPath, ['importers/shared/category-plan.ts', '--file', file, '--candidate', candidatePath], {
      cwd: WORKTREE_DIR,
      encoding: 'utf8',
    });
    assert.equal(result.status, 1, `expected exit 1; stderr: ${result.stderr}`);
    assert.ok(result.stdout.includes('BLOCKED'), result.stdout);
    assert.deepEqual(readJson(file, null), clone(LIVE_BASE), 'CLI must never write the dataset');
  });

  test('CLI: exits 0 and prints "all guards pass" for a non-destructive candidate', () => {
    const file = seed(LIVE_BASE);
    const candidatePath = join(WORKTREE_DIR, 'src/data/generated', `__cli_candidate_ok_${seq++}.json`);
    mkdirSync(dirname(candidatePath), { recursive: true });
    writeFileSync(candidatePath, JSON.stringify(clone(LIVE_BASE)), 'utf8');

    const result = spawnSync(process.execPath, ['importers/shared/category-plan.ts', '--file', file, '--candidate', candidatePath], {
      cwd: WORKTREE_DIR,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, `expected exit 0; stderr: ${result.stderr}`);
    assert.ok(result.stdout.includes('all guards pass'), result.stdout);
  });

  test('CLI: missing arguments exits 2 with usage, not a crash', () => {
    const result = spawnSync(process.execPath, ['importers/shared/category-plan.ts'], { cwd: WORKTREE_DIR, encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.ok(result.stderr.includes('Usage'));
  });
} finally {
  // ── teardown: always remove the worktree, even if a test threw ─────────
  try {
    execFileSync('git', ['worktree', 'remove', '--force', WORKTREE_DIR], { cwd: REPO_ROOT, stdio: 'pipe' });
  } catch (cleanupErr) {
    console.error(`worktree cleanup failed for ${WORKTREE_DIR}: ${cleanupErr.message}`);
    try { rmSync(WORKTREE_DIR, { recursive: true, force: true }); } catch {}
    process.exitCode = 1;
  }
}

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
