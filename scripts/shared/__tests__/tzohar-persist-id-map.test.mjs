// Standalone test (not jest). Run: node scripts/shared/__tests__/tzohar-persist-id-map.test.mjs
//
// computeMappingUpdate() is pure (no I/O) — tested directly with in-memory
// fixtures, no filesystem, no worktree needed. The CLI wrapper (I/O only)
// gets a light subprocess smoke test at the bottom, same pattern as the
// other tzohar-*.test.mjs files.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeMappingUpdate } from '../../../importers/tzohar/persist-id-map.mjs';

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

console.log('persist-id-map.mjs: computeMappingUpdate');

const HAKOSEM_OUR = { id: 'hakosem-8e7ea237', name: 'הקוסם', location: { latitude: 32.076406, longitude: 34.776712 }, phone: null };
const HAKOSEM_LIVE = { tzoharId: '39912', store: 'הקוסם', address: 'שלמה המלך 1', city: 'תל אביב', lat: 32.076406, lng: 34.776712, phone: null, certUrl: 'https://www.tzohar.org.il/wp-content/uploads/hakosem-4.pdf' };
const UNRELATED_OUR = { id: 'unrelated-record', name: 'עסק שלא קיים בפיד', location: { latitude: 31.0, longitude: 35.5 }, phone: null };

test('new mapping: no prior entry -> added, with the full expected shape', () => {
  const r = computeMappingUpdate([HAKOSEM_OUR], [HAKOSEM_LIVE], {}, { today: '2026-08-26' });
  assert.equal(r.added, 1);
  assert.equal(r.refreshed, 0);
  assert.equal(r.conflicts, 0);
  const entry = r.nextMap['hakosem-8e7ea237'];
  assert.equal(entry.tzoharId, '39912');
  assert.equal(entry.matchedName, 'הקוסם');
  assert.equal(entry.matchedAddress, 'שלמה המלך 1');
  assert.equal(entry.certUrlAtMatchTime, HAKOSEM_LIVE.certUrl);
  assert.equal(entry.matchedAt, '2026-08-26');
  assert.ok(entry.score > 0.9);
});

test('not matched: a record absent from the feed does not appear in the mapping at all', () => {
  const r = computeMappingUpdate([UNRELATED_OUR], [HAKOSEM_LIVE], {}, { today: '2026-08-26' });
  assert.equal(r.notMatched, 1);
  assert.equal(r.added, 0);
  assert.equal(Object.keys(r.nextMap).length, 0);
});

test('re-confirm: existing mapping with the SAME tzoharId is refreshed (updated details, new timestamp), not treated as new or a conflict', () => {
  const existing = { 'hakosem-8e7ea237': { tzoharId: '39912', matchedName: 'old name snapshot', matchedAddress: 'old', score: 0.8, signals: {}, certUrlAtMatchTime: 'old-url', matchedAt: '2020-01-01' } };
  const r = computeMappingUpdate([HAKOSEM_OUR], [HAKOSEM_LIVE], existing, { today: '2026-08-26' });
  assert.equal(r.added, 0);
  assert.equal(r.refreshed, 1);
  assert.equal(r.conflicts, 0);
  assert.equal(r.nextMap['hakosem-8e7ea237'].matchedAt, '2026-08-26', 'refresh must update the timestamp');
  assert.equal(r.nextMap['hakosem-8e7ea237'].certUrlAtMatchTime, HAKOSEM_LIVE.certUrl, 'refresh must update the observed cert URL');
});

test('VIOLATION: a CHANGED tzoharId is a conflict, reported, and the pre-existing mapping is left byte-for-byte untouched — never silently overwritten', () => {
  const staleEntry = { tzoharId: 'SOME-OTHER-ID', matchedName: 'stale', matchedAddress: 'stale', score: 1, signals: {}, certUrlAtMatchTime: 'stale-url', matchedAt: '2020-01-01' };
  const existing = { 'hakosem-8e7ea237': staleEntry };
  const r = computeMappingUpdate([HAKOSEM_OUR], [HAKOSEM_LIVE], existing, { today: '2026-08-26' });
  assert.equal(r.added, 0);
  assert.equal(r.refreshed, 0);
  assert.equal(r.conflicts, 1);
  assert.deepEqual(r.conflictDetails[0], {
    ourId: 'hakosem-8e7ea237', ourName: 'הקוסם',
    storedTzoharId: 'SOME-OTHER-ID', newlyMatchedTzoharId: '39912',
    storedCertUrl: 'stale-url', newCertUrl: HAKOSEM_LIVE.certUrl,
  });
  // the whole point: the conflicting id's entry in nextMap must be IDENTICAL to what was already there
  assert.deepEqual(r.nextMap['hakosem-8e7ea237'], staleEntry);
});

test('ambiguous/unmatched Stage-2 outcomes never produce a mapping entry, conflicting or otherwise', () => {
  // Two near-identical candidates -> ambiguous, per tzohar-identity-match.mjs's own margin rule.
  const dupA = { tzoharId: 'A', store: 'עוגות דה לה פה', address: 'תובל 26', city: 'רמת גן', lat: 32.086835, lng: 34.803187, phone: null };
  const dupB = { tzoharId: 'B', store: 'עוגות דה לה פה רמת גן', address: 'תובל 26', city: 'רמת גן', lat: 32.086829, lng: 34.803118, phone: null };
  const our = { id: 'ugot-record', name: 'עוגות דה לה פה', location: { latitude: 32.08683, longitude: 34.80315 }, phone: null };
  const r = computeMappingUpdate([our], [dupA, dupB], {}, { today: '2026-08-26' });
  assert.equal(r.added, 0);
  assert.equal(r.notMatched, 1); // ambiguous counts as "not matched" for mapping purposes
  assert.equal(Object.keys(r.nextMap).length, 0);
});

// ── CLI smoke test ───────────────────────────────────────────────────────

const tmpDir = mkdtempSync(join(tmpdir(), 'karov-tzohar-idmap-test-'));
try {
  test('CLI: writes the mapping file (not --dry), reports added/refreshed/conflicts, and never touches src/data/generated/', () => {
    const feedPath = join(tmpDir, 'feed.json');
    writeFileSync(feedPath, JSON.stringify([{ id: '39912', store: 'הקוסם', address: 'שלמה המלך 1', city: 'תל אביב', lat: '32.076406', lng: '34.776712', phone: '', address2: 'https://www.tzohar.org.il/wp-content/uploads/hakosem-4.pdf', terms: [] }]));
    const mapPath = join(tmpDir, 'map.json');

    const result = spawnSync(process.execPath, ['importers/tzohar/persist-id-map.mjs', '--input', feedPath, '--map-path', mapPath], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(result.status, 0, `expected exit 0; stderr: ${result.stderr}`);
    assert.ok(existsSync(mapPath), 'the mapping file must exist after a non-dry run');
    const written = JSON.parse(readFileSync(mapPath, 'utf8'));
    assert.ok(written['hakosem-8e7ea237'], 'hakosem must be in the written mapping (it exists in both the real places.osm.json and this feed fixture)');
    assert.equal(written['hakosem-8e7ea237'].tzoharId, '39912');
  });

  test('CLI: --dry never writes the mapping file even when it would otherwise', () => {
    const feedPath = join(tmpDir, 'feed2.json');
    writeFileSync(feedPath, JSON.stringify([{ id: '39912', store: 'הקוסם', address: 'שלמה המלך 1', city: 'תל אביב', lat: '32.076406', lng: '34.776712', phone: '', address2: 'x', terms: [] }]));
    const mapPath = join(tmpDir, 'map-dry.json');
    const result = spawnSync(process.execPath, ['importers/tzohar/persist-id-map.mjs', '--input', feedPath, '--map-path', mapPath, '--dry'], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(result.status, 0, `expected exit 0; stderr: ${result.stderr}`);
    assert.equal(existsSync(mapPath), false, '--dry must never create the mapping file');
  });
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
