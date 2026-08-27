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
 * Evidence is resolved FROM GIT HISTORY at the tip commit being pushed
 * (`git rev-parse <tip>:review-evidence/<sha>.json` to the blob's own sha,
 * then `git cat-file -p <blob-sha>` to read it — see readEvidenceFor's own
 * header for why it is two calls and not one `git show <tip>:<path>`),
 * never from the filesystem. This is load-bearing, not stylistic — found
 * live, 2026-08-27, by the Architect, citing AGENTS.md's own top warning
 * ("ירוק בעץ העבודה ≠ הקומיט תקין"): a disk-based lookup (existsSync +
 * readFileSync against process.cwd()) is satisfied by an UNTRACKED evidence
 * file that was never `git add`ed, never committed, and will not exist for
 * anyone who clones the repo. That is accidental bypass, the exact class
 * this gate exists to eliminate — proven live with a real untracked file
 * before this fix, and again (case-insensitively named file, ALLOWED on
 * this Windows machine, would BLOCK on Linux) before this fix closed both
 * at once: a git tree lookup only ever sees committed content, and git
 * paths are case-sensitive regardless of the host filesystem.
 *
 * What it achieves: accidental bypass becomes impossible — you cannot
 * forget to commit evidence and have the gate silently let you through
 * (an uncommitted file is invisible to a git-tree lookup), and you cannot
 * push stale evidence for a commit that has since been amended, because the
 * tree hash would no longer match. What it does NOT achieve: stopping
 * someone who deliberately writes and COMMITS a false evidence file naming
 * a SHA they never actually reviewed. No local hook can prevent that — it
 * can only make it a visible, attributable act in the repository's history
 * (a human or another session committed a review-evidence/<sha>.json file;
 * that fact is on the record, unlike an unreviewed push with no gate at
 * all). Unlike the pre-fix version of this claim: the evidence does not
 * have to appear as a diff on THIS push (it may have been committed
 * earlier, on an ancestor of the tip), but it must exist in the committed
 * history of the tip being pushed — never merely on disk.
 *
 * ACCEPTED LIMITS, STATED NOW SO A FUTURE INVESTIGATION DOESN'T HAVE TO
 * REDISCOVER THEM: this is a client-side git hook, and every client-side
 * git hook has the same four holes, unchanged by this fix and not fixable
 * by one. `git push --no-verify` skips this file entirely. A clone that
 * never ran `npm install` never had `core.hooksPath` pointed at
 * `.githooks/` in the first place, so the hook is not installed, not
 * bypassed. A push from a different machine that also never ran
 * `npm install` has the same gap. A merge performed in the GitHub UI never
 * runs a local hook at all — nothing on this machine sees it. None of
 * these are new; .githooks/pre-push's own header already says this hook
 * "is not the enforcement" and that server-side branch protection has to
 * exist too. If a commit is later found on the remote without valid
 * evidence, the first three questions to ask are these four — not a fresh
 * investigation into how the gate was defeated.
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
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The repo being CHECKED is process.cwd(), not this script's own location —
// git always invokes a pre-push hook with CWD set to the repo root, and
// this script's own test suite needs to point it at an isolated throwaway
// repo (never the shared checkout). Using import.meta.url's location here
// would silently make every git call operate on THIS repo regardless of
// which repo the caller actually intended — found live while first
// writing the test suite: every case failed, all for the same root cause,
// before this was corrected.
const REPO_ROOT = resolve(process.cwd());

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

/** Reads review-evidence/<sha>.json as it exists in the COMMITTED tree of
 * `tip` — never off disk. Resolved in two steps, `rev-parse <tip>:<path>`
 * to the blob's OWN sha, then `cat-file -p <blob-sha>` to read it — not
 * `git show <tip>:<path>` in one call. Found live, 2026-08-27, running the
 * real end-to-end integration test (a real push through the real hook),
 * not the isolated-repo unit suite: `git show <tip>:<path>` fails with
 * "fatal: failed to stat ...: Filename too long" whenever the REPO'S OWN
 * working-directory path is deep AND core.longpaths is unset (git for
 * Windows' default) — regardless of how short the requested path itself
 * is, and regardless of whether the blob genuinely exists (confirmed via
 * `cat-file -e`, which succeeded on the exact same ref where `show`
 * failed). Once resolved to a bare blob sha, `cat-file -p` has no path
 * component left to overflow, and reproduces clean with core.longpaths
 * left at its default (unset/false). This is not hypothetical for this
 * repo — the current checkout's path is short enough to not hit it today,
 * but the gate must not silently depend on that staying true on every
 * machine and every clone depth this repo is ever checked out at. */
function readEvidenceFor(sha, tip) {
  const evidencePath = `review-evidence/${sha}.json`;
  const blobRef = `${tip}:${evidencePath}`;
  let blobSha;
  try {
    blobSha = gitQuiet(['rev-parse', '--verify', blobRef]);
  } catch {
    return { ok: false, reason: `no evidence file at ${evidencePath} in the committed history of ${tip.slice(0, 12)}` };
  }
  let raw;
  try {
    raw = git(['cat-file', '-p', blobSha]);
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
 * first, does not matter for this check). `tip` is the commit the pushed
 * ref will point at once this push completes — evidence for EVERY commit
 * in `outgoingShas` is resolved from `tip`'s committed tree, not from each
 * commit's own tree or from disk. This is deliberate: what matters is what
 * will actually be reachable on the remote after the push, which is tip's
 * history. It also means evidence committed once and later removed from
 * the WORKING TREE (but never from history) still satisfies the gate —
 * correct, since the remote still carries it — while evidence that was
 * committed and then deleted in a LATER commit within the same push
 * correctly stops satisfying the gate, since after the push it is
 * genuinely gone from what the remote can see.
 */
export function checkPush(outgoingShas, tip) {
  const messages = [];
  let blocked = false;

  if (!isValidSha(tip)) {
    return { blocked: true, messages: [`✖ internal error: tip "${tip}" is not a valid 40-char SHA — refusing to guess what it means`] };
  }

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
    const result = readEvidenceFor(sha, tip);
    if (!result.ok) {
      blocked = true;
      messages.push(`✖ ${sha.slice(0, 12)} — BLOCKED: ${result.reason}`);
    } else {
      messages.push(`✓ ${sha.slice(0, 12)} — review evidence found and verified`);
    }
  }

  return { blocked, messages };
}

/** CLI entry point for .githooks/pre-push: argv is [tip, ...outgoingShas] —
 * the tip commit first, then every commit the push would add (the hook
 * passes $local_sha as argv[2], the same value it already put first in its
 * own `git log --format='%H'` range, so the tip is always outgoingShas[0]
 * in what the hook sends; this CLI takes it as an explicit separate
 * argument rather than inferring it by array position, so `checkPush`'s
 * contract does not depend on the caller's ordering convention). Prints
 * the result, exits 1 if blocked. Uses pathToFileURL rather than a manual
 * string comparison — found live while building this: a hand-rolled
 * `file://${...}` comparison does not correctly account for Windows
 * drive-letter URL encoding, so the guard silently never matched and the
 * whole CLI body never ran (import-rebar.mjs's own entry-point guard,
 * elsewhere in this repo, already uses this exact pattern for the same
 * reason). */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [tip, ...shas] = process.argv.slice(2).filter(Boolean);
  if (!tip) {
    // Nothing gated in this push — a shell caller that found zero outgoing
    // commits touching a gated path should not even invoke this script,
    // but if it does, no tip to check against is unambiguously "nothing to
    // block," not an error.
    process.exit(0);
  }
  const { blocked, messages } = checkPush(shas, tip);
  for (const m of messages) console.error(m);
  process.exit(blocked ? 1 : 0);
}
