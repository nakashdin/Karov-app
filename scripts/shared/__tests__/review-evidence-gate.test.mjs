// Standalone test (not jest). Run: node scripts/shared/__tests__/review-evidence-gate.test.mjs
//
// Exercises scripts/shared/review-evidence-gate.mjs against a REAL,
// throwaway git repository built fresh in a temp directory for each case —
// not the shared checkout this session runs in, and not a mock of git.
// The gate does real git plumbing (rev-parse, diff --name-only, ^{tree}),
// so a fixture that fakes those calls would not prove the gate works
// against actual git behavior, only against the test author's model of it.
//
// Cases 1-6 are the owner's, stated verbatim in the Architect's brief.
// Case 7 is the Architect's addition (credited to the Reviewer): a push
// carrying MULTIPLE commits, evidence for only the first — the exact shape
// of today's real incident (a docs push at 6bc05f1 carried an unreviewed
// Implementer commit, 80f51dc). Weighted highest because it attacks the
// SET being checked, not the evidence's content — a gate that validates
// one commit correctly and never learns a push carries several would pass
// all six of the owner's cases and still permit the real failure.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
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

console.log('review-evidence-gate.mjs');

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const GATE_SCRIPT = resolve(REPO_ROOT, 'scripts', 'shared', 'review-evidence-gate.mjs');

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/** Builds a fresh, isolated, real git repo in a temp dir. Not a clone of
 * this repo and not related to it — the gate script is invoked via its
 * absolute path against THIS throwaway repo's own commits, so nothing here
 * can touch the shared checkout or the real dataset. */
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'review-evidence-gate-test-'));
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'test@example.com']);
  git(dir, ['config', 'user.name', 'Test']);
  return dir;
}

function commitFile(dir, relPath, content, message) {
  const full = join(dir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
  git(dir, ['add', relPath]);
  git(dir, ['commit', '-q', '-m', message]);
  return git(dir, ['rev-parse', 'HEAD']);
}

function treeOf(dir, sha) {
  return git(dir, ['rev-parse', `${sha}^{tree}`]);
}

function writeEvidence(dir, sha, overrides = {}) {
  const evidence = {
    commit: sha,
    tree: treeOf(dir, sha),
    reviewer: 'test-reviewer',
    verdict: 'approved',
    note: 'test evidence',
    ...overrides,
  };
  const evDir = join(dir, 'review-evidence');
  mkdirSync(evDir, { recursive: true });
  writeFileSync(join(evDir, `${sha}.json`), JSON.stringify(evidence, null, 2));
}

/** Runs the gate against a repo for a given list of SHAs, exactly as
 * .githooks/pre-push would invoke it (cwd inside that repo, SHAs as argv). */
function runGate(dir, shas) {
  try {
    const stdout = execFileSync('node', [GATE_SCRIPT, ...shas], { cwd: dir, encoding: 'utf8' });
    return { blocked: false, output: stdout };
  } catch (err) {
    // execFileSync throws on non-zero exit; the actual output is on the error.
    return { blocked: true, output: (err.stdout ?? '') + (err.stderr ?? '') };
  }
}

let repo;

// ── CASE 1: no evidence at all -> BLOCKED ────────────────────────────────
repo = makeRepo();
{
  const sha = commitFile(repo, 'src/foo.ts', 'export const x = 1;\n', 'add foo');
  test('CASE 1 — no evidence at all -> BLOCKED', () => {
    const { blocked, output } = runGate(repo, [sha]);
    assert.equal(blocked, true);
    assert.match(output, /no evidence file/);
  });
}
rmSync(repo, { recursive: true, force: true });

// ── CASE 2: evidence for an older SHA -> BLOCKED ─────────────────────────
repo = makeRepo();
{
  const shaOld = commitFile(repo, 'src/foo.ts', 'export const x = 1;\n', 'add foo');
  writeEvidence(repo, shaOld); // evidence for the OLD commit only
  const shaNew = commitFile(repo, 'src/foo.ts', 'export const x = 2;\n', 'change foo');
  test('CASE 2 — evidence exists, but for an OLDER sha, not the one being pushed -> BLOCKED', () => {
    const { blocked, output } = runGate(repo, [shaNew]);
    assert.equal(blocked, true);
    assert.match(output, new RegExp(shaNew.slice(0, 12)));
  });
}
rmSync(repo, { recursive: true, force: true });

// ── CASE 3: evidence for the exact current SHA -> ALLOWED (the control) ──
repo = makeRepo();
{
  const sha = commitFile(repo, 'src/foo.ts', 'export const x = 1;\n', 'add foo');
  writeEvidence(repo, sha);
  test('CASE 3 — evidence for the EXACT current sha -> ALLOWED (the control case — without this passing, a blocked gate is indistinguishable from a broken one)', () => {
    const { blocked } = runGate(repo, [sha]);
    assert.equal(blocked, false);
  });
}
rmSync(repo, { recursive: true, force: true });

// ── CASE 4: commit changes after review -> BLOCKED again (freshness) ────
repo = makeRepo();
{
  const sha1 = commitFile(repo, 'src/foo.ts', 'export const x = 1;\n', 'add foo');
  writeEvidence(repo, sha1);
  test('CASE 4a — reviewed commit passes before amend', () => {
    const { blocked } = runGate(repo, [sha1]);
    assert.equal(blocked, false);
  });
  // Amend the commit — same message, different content, so tree hash changes
  // but the evidence file (named by the OLD sha) is untouched.
  writeFileSync(join(repo, 'src/foo.ts'), 'export const x = 999; // amended\n');
  git(repo, ['add', 'src/foo.ts']);
  git(repo, ['commit', '-q', '--amend', '--no-edit']);
  const sha2 = git(repo, ['rev-parse', 'HEAD']);
  test('CASE 4b — after amend, the NEW commit has no matching evidence file (old evidence named the pre-amend sha) -> BLOCKED', () => {
    assert.notEqual(sha1, sha2, 'amend must actually change the sha, or this test proves nothing');
    const { blocked, output } = runGate(repo, [sha2]);
    assert.equal(blocked, true);
    assert.match(output, /no evidence file/);
  });
}
rmSync(repo, { recursive: true, force: true });

// ── CASE 4c: evidence file present for the SAME sha but tree hash stale ──
// (a more direct exercise of tree-hash recomputation than 4a/b's rename gap)
repo = makeRepo();
{
  const sha = commitFile(repo, 'src/foo.ts', 'export const x = 1;\n', 'add foo');
  writeEvidence(repo, sha, { tree: '0'.repeat(40) }); // a real-shaped but WRONG tree hash
  test('CASE 4c — evidence file names the correct commit sha but a WRONG tree hash -> BLOCKED (tree recomputed and compared, not trusted from the file)', () => {
    const { blocked, output } = runGate(repo, [sha]);
    assert.equal(blocked, true);
    assert.match(output, /does not match the commit's ACTUAL current tree hash/);
  });
}
rmSync(repo, { recursive: true, force: true });

// ── CASE 5: unrelated / stale reviewer output cannot satisfy the gate ───
repo = makeRepo();
{
  const sha = commitFile(repo, 'src/foo.ts', 'export const x = 1;\n', 'add foo');
  // Write something that LOOKS like reviewer output but isn't the required shape.
  const evDir = join(repo, 'review-evidence');
  mkdirSync(evDir, { recursive: true });
  writeFileSync(join(evDir, `${sha}.json`), JSON.stringify({ note: 'looks fine to me, approved I guess' }));
  test('CASE 5 — a file exists at the right path but is not well-formed evidence (missing commit/tree/verdict fields) -> BLOCKED', () => {
    const { blocked, output } = runGate(repo, [sha]);
    assert.equal(blocked, true);
    assert.match(output, /evidence "commit" field is missing/);
  });
}
rmSync(repo, { recursive: true, force: true });

// ── CASE 6: editing a marker or doc file cannot satisfy the gate ────────
repo = makeRepo();
{
  const sha = commitFile(repo, 'src/foo.ts', 'export const x = 1;\n', 'add foo');
  // A marker/doc file elsewhere claiming review happened — NOT in
  // review-evidence/, so it must be structurally invisible to the gate.
  const shaClaim = commitFile(repo, 'docs/REVIEWED.md', `Reviewed commit ${sha}, approved.\n`, 'mark as reviewed');
  test('CASE 6 — a doc/marker file elsewhere claiming review happened does not satisfy the gate (only review-evidence/ is read)', () => {
    const { blocked } = runGate(repo, [sha]);
    assert.equal(blocked, true, 'the ORIGINAL commit still has no real evidence — the marker commit does not count for it');
  });
  test('CASE 6b — the marker-adding commit ITSELF is also gated, since docs/ is not gated but the marker commit could touch scripts/ instead in a real attack — confirm docs/ alone is correctly NOT gated (this is a scope-boundary check, not a bypass)', () => {
    // docs/ is intentionally outside GATED_PREFIXES — a pure docs commit
    // needs no evidence of its own. Confirms the scope boundary is where
    // it's documented to be, not narrower or wider by accident.
    const { blocked } = runGate(repo, [shaClaim]);
    assert.equal(blocked, false, 'a commit touching only docs/ is out of this gate\'s scope by design — confirming the boundary, not a loophole being exploited');
  });
}
rmSync(repo, { recursive: true, force: true });

// ── CASE 7 (Architect/Reviewer addition, weighted highest): a push ──────
// carrying MULTIPLE commits, evidence for only the first. Must be BLOCKED,
// and must name WHICH commit(s) lack evidence, not just that some do.
repo = makeRepo();
{
  const sha1 = commitFile(repo, 'src/a.ts', 'export const a = 1;\n', 'add a');
  writeEvidence(repo, sha1); // reviewed
  const sha2 = commitFile(repo, 'src/b.ts', 'export const b = 1;\n', 'add b'); // NOT reviewed
  const sha3 = commitFile(repo, 'src/c.ts', 'export const c = 1;\n', 'add c'); // NOT reviewed
  test('CASE 7 — three-commit push, evidence for the FIRST only -> BLOCKED, not silently allowed because the tip (or any one commit) has evidence', () => {
    const { blocked, output } = runGate(repo, [sha1, sha2, sha3]);
    assert.equal(blocked, true);
    // The first commit's evidence must still be recognized (not a
    // false-positive block on the reviewed one)...
    assert.match(output, new RegExp(`✓ ${sha1.slice(0, 12)}`));
    // ...while BOTH unreviewed commits are named individually, not
    // collapsed into a single generic "some commits are unreviewed" line.
    assert.match(output, new RegExp(`✖ ${sha2.slice(0, 12)}`));
    assert.match(output, new RegExp(`✖ ${sha3.slice(0, 12)}`));
  });
  test('CASE 7b — the same three-commit set, now with ALL THREE reviewed -> ALLOWED (confirms case 7 is a real gate, not a permanent block once a push has more than one commit)', () => {
    writeEvidence(repo, sha2);
    writeEvidence(repo, sha3);
    const { blocked } = runGate(repo, [sha1, sha2, sha3]);
    assert.equal(blocked, false);
  });
}
rmSync(repo, { recursive: true, force: true });

// ── Scope checks: does the gate correctly ignore non-code commits, and ──
// correctly cover its OWN files (.githooks/, scripts/shared/)?
repo = makeRepo();
{
  const shaDocs = commitFile(repo, 'README.md', '# hi\n', 'docs only');
  test('SCOPE — a commit touching only README.md (outside src/scripts/importers/.githooks) needs no evidence', () => {
    const { blocked } = runGate(repo, [shaDocs]);
    assert.equal(blocked, false);
  });
}
{
  const shaHook = commitFile(repo, '.githooks/pre-push', '#!/bin/sh\necho hi\n', 'edit the hook itself');
  test('SCOPE — a commit editing .githooks/ (the gate\'s OWN mechanism) IS gated — the owner\'s explicit "not exempt from itself" requirement', () => {
    const { blocked, output } = runGate(repo, [shaHook]);
    assert.equal(blocked, true);
    assert.match(output, /no evidence file/);
  });
}
{
  const shaGateScript = commitFile(repo, 'scripts/shared/review-evidence-gate.mjs', '// a fake copy for scope testing\n', 'edit the gate script itself');
  test('SCOPE — a commit editing scripts/shared/review-evidence-gate.mjs (the gate SCRIPT itself, under scripts/) IS gated', () => {
    const { blocked } = runGate(repo, [shaGateScript]);
    assert.equal(blocked, true);
  });
}
{
  const shaEvidenceOnly = commitFile(repo, 'review-evidence/somefakeSHAfortest.json', '{}', 'pure evidence commit');
  test('SCOPE — a commit that ONLY adds a file under review-evidence/ is not itself gated (would otherwise regress forever — evidence approving evidence approving evidence...)', () => {
    const { blocked } = runGate(repo, [shaEvidenceOnly]);
    assert.equal(blocked, false);
  });
}
rmSync(repo, { recursive: true, force: true });

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
