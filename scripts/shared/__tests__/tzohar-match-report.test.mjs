// Standalone test (not jest). Run: node scripts/shared/__tests__/tzohar-match-report.test.mjs
//
// Smoke-tests importers/tzohar/match-report.mjs as a real subprocess
// (same pattern as the category-plan.ts CLI tests in
// category-overwrite-guard.test.mjs) — it reads the REAL
// src/data/generated/places.osm.json (read-only, which is exactly what it's
// for) against a small, fixed --input feed fixture, so no network call
// happens in this suite and the live feed content is deterministic.
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');

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

console.log('importers/tzohar/match-report.mjs (CLI smoke test)');

const tmpDir = mkdtempSync(join(tmpdir(), 'karov-tzohar-report-test-'));
const fixturePath = join(tmpDir, 'feed.json');
// A tiny, fixed feed — real-shaped entries, not a live fetch.
writeFileSync(fixturePath, JSON.stringify([
  { id: '1', store: 'הקוסם', address: 'שלמה המלך 1', city: 'תל אביב', lat: '32.076406', lng: '34.776712', phone: '', address2: 'https://www.tzohar.org.il/wp-content/uploads/hakosem-4.pdf', terms: [] },
]));

try {
  test('exits 0 against a real (small) feed fixture, prints a match summary, writes nothing to the dataset', () => {
    const before = execFileSync('git', ['status', '--short', '--', 'src/data/generated/'], { cwd: REPO_ROOT, encoding: 'utf8' });
    const result = spawnSync(process.execPath, ['importers/tzohar/match-report.mjs', '--input', fixturePath], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(result.status, 0, `expected exit 0; stderr: ${result.stderr}`);
    assert.ok(result.stdout.includes('Match summary'), result.stdout);
    assert.ok(result.stdout.includes('matched'), result.stdout);
    const after = execFileSync('git', ['status', '--short', '--', 'src/data/generated/'], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(before, after, 'the dataset directory must be byte-for-byte unchanged by a read-only report run');
  });

  test('--input and --sweep together is a usage error (exit 2), not silently picking one', () => {
    const result = spawnSync(process.execPath, ['importers/tzohar/match-report.mjs', '--input', fixturePath, '--sweep'], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.ok(result.stderr.includes('mutually exclusive'), result.stderr);
  });

  test('neither --input nor --sweep is a usage error (exit 2) with a Usage line, not a crash', () => {
    const result = spawnSync(process.execPath, ['importers/tzohar/match-report.mjs'], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.ok(result.stderr.includes('Usage'));
  });
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
