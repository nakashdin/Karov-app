/**
 * Review-evidence gate — checked by .githooks/pre-push before any push to
 * a code path (src/, scripts/, importers/) is allowed to leave this
 * machine, on the owner's explicit ruling (2026-08-27): "no Implementer
 * change should be pushed as reviewed unless there is fresh Reviewer
 * evidence for that exact change/commit," and it "must fail closed when
 * the review evidence is missing or stale, but it must not create a fake
 * review merely because a file, marker, or old approval exists."
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS GATE ACTUALLY PROVES — READ THIS BEFORE TRUSTING IT
 * ══════════════════════════════════════════════════════════════════════
 * It CANNOT prove a review happened. It proves that evidence exists which
 * is CRYPTOGRAPHICALLY BOUND to one exact commit's exact content (via the
 * commit's own 40-char SHA and its tree hash, both recomputed and compared,
 * never trusted from the evidence file alone) and which could not have
 * existed before that commit did (a commit cannot name its own SHA — the
 * SHA is a hash of the commit's own content, so evidence naming commit C
 * necessarily lives in a LATER commit; self-review is structurally
 * impossible, not merely discouraged).
 *
 * What it achieves: accidental bypass becomes impossible — you cannot
 * forget to write evidence and have the gate silently let you through, and
 * you cannot push stale evidence for a commit that has since been amended,
 * because the tree hash would no longer match. What it does NOT achieve:
 * stopping someone who deliberately writes a false evidence file naming a
 * SHA they never actually reviewed. No local hook can prevent that — it can
 * only make it a visible, attributable act in the diff (a human or another
 * session added a review-evidence/<sha>.json file; that fact is on the
 * record, unlike an unreviewed push with no gate at all).
 *
 * ══════════════════════════════════════════════════════════════════════
 * SCOPE — "CODE PATH" IS AN APPROXIMATION OF "IMPLEMENTER CHANGE"
 * ══════════════════════════════════════════════════════════════════════
 * The owner's invariant is about WHO made a change (an Implementer vs. an
 * Architect/Reviewer/doc-only edit). Git cannot answer that here — all
 * three sessions commit as the same author and the same email, so no
 * repository metadata distinguishes them (see .githooks/pre-push's own
 * header for why a Co-Authored-By heuristic was rejected). What CAN be
 * checked is WHERE a commit touches: this gate requires evidence for any
 * commit that modifies a path under src/, scripts/, or importers/ — a
 * proxy for "code that runs," not a determination of who wrote it.
 *
 * THE GAP, NAMED, NOT HIDDEN: logic placed outside those three paths
 * dodges this gate entirely. This is not hypothetical — scripts/** and
 * importers/** are already outside ESLint's reach in this repo today
 * (see AGENTS.md), so "somewhere unscoped" is a real, existing place a
 * change could hide from static checks generally, this gate included.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE EVIDENCE FORMAT
 * ══════════════════════════════════════════════════════════════════════
 * review-evidence/<full-40-char-lowercase-hex-sha>.json — a DEDICATED path
 * that contains nothing else, so no documentation file, changelog entry,
 * or marker anywhere else in the repo can ever be mistaken for evidence.
 * The SHA is encoded in BOTH the filename (so lookup is O(1), never a
 * scan) AND the JSON body's own `commit` field (so a rename/copy-paste
 * mismatch between the two is itself a detectable, blocking error rather
 * than silently trusting whichever one is asked for).
 *
 *   {
 *     "commit": "<the reviewed commit's full 40-char SHA>",
 *     "tree":   "<that commit's tree hash — recomputed by this gate and
 *                 compared, never trusted from the file alone>",
 *     "reviewer": "<free text — NOT verified, see the header above>",
 *     "verdict": "approved",
 *     "note": "<free text>"
 *   }
 *
 * `verdict` must be exactly "approved" — anything else (including a
 * missing field, "changes-requested", a typo) fails closed.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The repo being CHECKED is process.cwd(), not this script's own location —
// git always invokes a pre-push hook with CWD set to the repo root, and
// this script's own test suite needs to point it at an isolated throwaway
// repo (never the shared checkout). Using import.meta.url's location here
// would silently make every git call operate on THIS repo regardless of
// which repo the caller actually intended — found live while first
// writing the test suite: every case failed, all for the same root cause,
// before this was corrected.
const REPO_ROOT = resolve(process.cwd());
const EVIDENCE_DIR = resolve(REPO_ROOT, 'review-evidence');

const SHA_RE = /^[0-9a-f]{40}$/;

/**
 * Paths that make a commit "code" for this gate's purposes. A commit needs
 * evidence if `git diff-tree` reports ANY changed path starting with one
 * of these prefixes. Deliberately does not include review-evidence/ itself
 * (a commit that ONLY adds evidence for an earlier commit is not itself
 * "code" and would create an infinite regress — see EVIDENCE_COMMIT
 * handling below) but DOES include .githooks/ and this very file's own
 * directory, per the owner's explicit requirement that the gate is not
 * exempt from itself.
 */
const GATED_PREFIXES = ['src/', 'scripts/', 'importers/', '.githooks/'];

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

/** Same as git(), but discards stderr — for calls expected to sometimes
 * fail as part of normal control flow (e.g. probing whether a commit has a
 * parent), where git's own "fatal: ambiguous argument" text would
 * otherwise leak into this gate's output and read as an unexplained error
 * rather than an expected, handled case. */
function gitQuiet(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function isValidSha(s) {
  return typeof s === 'string' && SHA_RE.test(s);
}

// git's well-known hash for the empty tree — constant across every repo,
// not computed. Used as the diff base for a commit with no parent (the
// root commit of a branch's history), so "everything in that commit" reads
// as "changed," the same as any other commit's first diff.
const EMPTY_TREE_SHA = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

/** Files changed by a commit relative to its first parent (or, for a
 * commit with no parent, relative to the empty tree). */
function changedPaths(sha) {
  let base;
  try {
    base = gitQuiet(['rev-parse', `${sha}^`]);
  } catch {
    base = EMPTY_TREE_SHA;
  }
  const out = execFileSync('git', ['diff', '--name-only', base, sha], { cwd: REPO_ROOT, encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

function isGatedCommit(sha) {
  const paths = changedPaths(sha);
  return paths.some((p) => GATED_PREFIXES.some((prefix) => p.startsWith(prefix)));
}

/**
 * A commit whose ENTIRE change is additions/modifications under
 * review-evidence/ — a pure evidence-filing commit. Excluded from needing
 * evidence about ITSELF (an evidence commit approving commit C does not
 * also need separate evidence approving the act of adding that evidence,
 * which would regress forever) but such a commit also grants NOTHING to
 * itself — it is simply not a "code" commit under GATED_PREFIXES, so it is
 * never asked for evidence in the first place. This function exists only
 * for clarity at call sites, not as a special exemption path.
 */
function isPureEvidenceCommit(sha) {
  const paths = changedPaths(sha);
  return paths.length > 0 && paths.every((p) => p.startsWith('review-evidence/'));
}

function readEvidenceFor(sha) {
  const path = join(EVIDENCE_DIR, `${sha}.json`);
  if (!existsSync(path)) {
    return { ok: false, reason: `no evidence file at review-evidence/${sha}.json` };
  }
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    return { ok: false, reason: `evidence file unreadable: ${e.message}` };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, reason: `evidence file is not valid JSON: ${e.message}` };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: 'evidence file does not contain a JSON object' };
  }
  if (!isValidSha(parsed.commit)) {
    return { ok: false, reason: `evidence "commit" field is missing or not a 40-char lowercase hex SHA (got: ${JSON.stringify(parsed.commit)})` };
  }
  if (parsed.commit !== sha) {
    return { ok: false, reason: `evidence file review-evidence/${sha}.json names a DIFFERENT commit inside it (${parsed.commit}) — filename and content must agree` };
  }
  if (!isValidSha(parsed.tree)) {
    return { ok: false, reason: `evidence "tree" field is missing or not a 40-char lowercase hex SHA (got: ${JSON.stringify(parsed.tree)})` };
  }
  if (parsed.verdict !== 'approved') {
    return { ok: false, reason: `evidence "verdict" field is not exactly "approved" (got: ${JSON.stringify(parsed.verdict)})` };
  }
  let actualTree;
  try {
    actualTree = git(['rev-parse', `${sha}^{tree}`]);
  } catch (e) {
    return { ok: false, reason: `could not recompute tree hash for ${sha}: ${e.message}` };
  }
  if (actualTree !== parsed.tree) {
    return {
      ok: false,
      reason: `evidence tree hash (${parsed.tree}) does not match the commit's ACTUAL current tree hash (${actualTree}) — the commit was amended/rebased after this evidence was written, so the evidence is stale`,
    };
  }
  return { ok: true };
}

/**
 * Checks one outgoing push. `outgoingShas` is the full list of commits
 * this push would add to the remote (already-topologically-sorted, oldest
 * first, does not matter for this check). Returns { blocked, messages }.
 */
export function checkPush(outgoingShas) {
  const messages = [];
  let blocked = false;

  for (const sha of outgoingShas) {
    if (!isValidSha(sha)) {
      // Defensive: a caller bug, not a real git SHA. Fail closed rather
      // than silently skipping an un-parseable entry.
      blocked = true;
      messages.push(`✖ internal error: "${sha}" is not a valid 40-char SHA — refusing to guess what it means`);
      continue;
    }
    if (isPureEvidenceCommit(sha)) {
      continue; // an evidence-filing commit is not itself gated — see isPureEvidenceCommit's header
    }
    if (!isGatedCommit(sha)) {
      continue; // touches nothing under src/, scripts/, importers/, .githooks/
    }
    const result = readEvidenceFor(sha);
    if (!result.ok) {
      blocked = true;
      messages.push(`✖ ${sha.slice(0, 12)} — BLOCKED: ${result.reason}`);
    } else {
      messages.push(`✓ ${sha.slice(0, 12)} — review evidence found and verified`);
    }
  }

  return { blocked, messages };
}

/** CLI entry point for .githooks/pre-push: reads newline-separated SHAs
 * from argv (the outgoing commit range, already resolved by the shell
 * hook), prints the result, exits 1 if blocked. Uses pathToFileURL rather
 * than a manual string comparison — found live while building this: a
 * hand-rolled `file://${...}` comparison does not correctly account for
 * Windows drive-letter URL encoding, so the guard silently never matched
 * and the whole CLI body never ran (import-rebar.mjs's own entry-point
 * guard, elsewhere in this repo, already uses this exact pattern for the
 * same reason). */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const shas = process.argv.slice(2).filter(Boolean);
  if (shas.length === 0) {
    // Nothing gated in this push — a shell caller that found zero outgoing
    // commits touching a gated path should not even invoke this script,
    // but if it does, zero commits to check is unambiguously "nothing to
    // block," not an error.
    process.exit(0);
  }
  const { blocked, messages } = checkPush(shas);
  for (const m of messages) console.error(m);
  process.exit(blocked ? 1 : 0);
}
