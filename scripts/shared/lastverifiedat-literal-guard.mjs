/**
 * Guards against the defect fixed once already in this file's sibling
 * history (`0d97a80`, import-rebar.mjs's TODAY was a hardcoded literal) and
 * found live a second time, 2026-08-27, in `importers/tzohar/import-food.mjs`
 * (three call sites, all `lastVerifiedAt = '2026-08-10'`): a script that
 * assigns `lastVerifiedAt` a literal date string instead of a computed one.
 *
 * The shape is subtler than most defects this project catalogues — the
 * field is populated, plausible, recent, and MEANS NOTHING: it records when
 * someone last edited the importer's source code, not when anyone verified
 * anything about the record. Nothing in the data looks wrong; every value
 * is a real, well-formed date.
 *
 * Full-codebase scan (2026-08-27, validated against a known positive —
 * `import-golda.mjs:182` — before trusting it against anything else, per
 * this project's own §17-family rule that a scan returning zero on an
 * unvalidated instrument is indistinguishable from a broken scan) found 55
 * files across importers/ and scripts/ with a hardcoded literal
 * `lastVerifiedAt` assignment. `import-food.mjs` was fixed to use
 * `localDateISO()` (scripts/shared/kashrut-write.mjs) as part of the same
 * pass that found this guard's motivating case. The other 55 are NOT fixed
 * by this guard — this guard only prevents a NEW hardcoded literal from
 * being introduced going forward; it does not retroactively correct
 * existing scripts (most are one-shot scripts already run once, per this
 * repo's own convention of not re-running historical one-shot writers, and
 * rewriting their already-shipped values would destroy the evidence of how
 * many records are affected — see docs/KASHRUT_FACTS.md for the full
 * scope). See findLastVerifiedAtLiteralViolations()'s own file list for the
 * exclusions and why.
 *
 * Reuses stripComments from level-assertion-guard.mjs rather than
 * reimplementing comment-awareness — that scanner's own header documents
 * two real, subtle bugs from a first-draft regex-based comment strip
 * (top-of-file prose misread as a violation; a naive block-comment strip
 * silently deleting a real violating literal). A second, independent
 * comment-stripping implementation would risk the same class of bug for no
 * reason — the string-aware, three-state (code/string/comment) scanner
 * already exists and is already proven against those cases.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments } from './level-assertion-guard.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

/**
 * Matches `lastVerifiedAt` assigned from a QUOTED STRING whose content is a
 * literal YYYY-MM-DD date — either object-literal shorthand
 * (`lastVerifiedAt: '2026-07-14'`) or a plain assignment
 * (`existing.lastVerifiedAt = '2026-07-14'`). A reference to a variable,
 * function call, or computed expression (`lastVerifiedAt: RUN_DATE`,
 * `lastVerifiedAt: localDateISO()`, `existing.lastVerifiedAt =
 * localDateISO()`) never matches a quoted-string pattern at all, so this
 * regex naturally excludes every legitimate form without needing a
 * separate allowlist of "known-good" identifiers.
 */
const LITERAL_DATE_RE = /\blastVerifiedAt\s*[:=]\s*(['"])(\d{4}-\d{2}-\d{2})\1/g;

/**
 * The indirect form: `const VERIFIED = '2026-08-02';` declared once, then
 * `lastVerifiedAt: VERIFIED` used at every write site — found live in
 * import-kiriat-meir-chains.mjs and import-newdeli.mjs, missed by
 * LITERAL_DATE_RE alone (there is no quoted string AT the lastVerifiedAt
 * assignment site; the literal is one level removed, at the constant's own
 * declaration). Same underlying defect — the value never changes at
 * runtime — in better-looking clothing. Caught in two passes: find every
 * `const <IDENT> = '<date>'` declaration, then check whether that <IDENT>
 * is later used as a lastVerifiedAt value (`lastVerifiedAt: <IDENT>` or
 * `x.lastVerifiedAt = <IDENT>`).
 */
const CONST_DATE_DECL_RE = /\bconst\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(['"])(\d{4}-\d{2}-\d{2})\2/g;

/** Same shape/name as this repo's other scanners (kashrut-write-completeness.test.mjs, level-assertion-guard.mjs). */
function walk(dir, exts, excludeSubstrings) {
  let out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    const norm = p.replaceAll('\\', '/');
    if (excludeSubstrings.some((s) => norm.includes(s))) continue;
    if (entry.isDirectory()) {
      out = out.concat(walk(p, exts, excludeSubstrings));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      out.push(p);
    }
  }
  return out;
}

function relPath(absPath) {
  return absPath.replace(ROOT, '').replaceAll('\\', '/').replace(/^\//, '');
}

/**
 * Pure core: analyzes already-read source text (comments not yet stripped —
 * this function strips them) and returns violations for that text alone.
 * Exported separately so it's directly testable against synthetic source
 * strings, not only against real repo files.
 */
export function analyzeSourceForLiteralLastVerifiedAt(src) {
  const stripped = stripComments(src);
  const violations = [];
  for (const m of stripped.matchAll(LITERAL_DATE_RE)) {
    violations.push({ date: m[2], matchedText: m[0] });
  }

  // Indirect form: a const declared from a literal date, later used at a
  // lastVerifiedAt assignment site. Two-pass because the literal and its
  // use can be arbitrarily far apart in the file.
  const dateConsts = new Map(); // ident -> date
  for (const m of stripped.matchAll(CONST_DATE_DECL_RE)) {
    dateConsts.set(m[1], m[3]);
  }
  if (dateConsts.size > 0) {
    const identAlternation = [...dateConsts.keys()].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const usageRe = new RegExp(`\\blastVerifiedAt\\s*[:=]\\s*(${identAlternation})\\b`, 'g');
    for (const m of stripped.matchAll(usageRe)) {
      violations.push({ date: dateConsts.get(m[1]), matchedText: m[0], viaConst: m[1] });
    }
  }

  return violations;
}

/**
 * Scans scripts/ (excluding reports/, __tests__/) and importers/ (excluding
 * __tests__/) for a NEW hardcoded literal lastVerifiedAt assignment.
 *
 * scripts/remediate-rebar-55.mjs is excluded DELIBERATELY, not overlooked —
 * it is documented (remediate-chain.mjs's own header) as "the historical
 * record of what commit 880e48d actually shipped, not deleted and not
 * re-run," and editing it to use a computed date would make that historical
 * record lie about what actually ran. Its own header already carries a note
 * pointing future scripts at localDateISO() instead.
 */
export function findLastVerifiedAtLiteralViolations() {
  const files = [
    // This file itself is excluded — found live, 2026-08-27: stripComments
    // (level-assertion-guard.mjs) has no concept of regex literals, and
    // LITERAL_DATE_RE above contains a character class with BOTH quote
    // characters (['"]) inside a regex literal. stripComments's state
    // machine sees the first quote char and enters 'string' state (meant
    // for real string literals), then never finds a matching close before
    // it hits the SECOND quote char inside the same character class,
    // corrupting all state tracking for the rest of the file — the very
    // next doc comment (mentioning the word VERIFIED as prose) is no
    // longer recognized as a comment and survives into the "stripped"
    // output, where it looks like real code using an undeclared VERIFIED
    // identifier. Confirmed by minimal reproduction, not assumed. This is
    // a real bug in shared infrastructure (not touched here — see the
    // report to the Architect) that predates this file; excluding this
    // file from its own scan is the correct, narrow fix for a guard that
    // does not itself assign lastVerifiedAt anywhere as real code — the
    // exclusion is not a workaround for a false claim, it is recognizing
    // this file was never a real target of its own check.
    ...walk(join(ROOT, 'scripts'), ['.mjs'], ['/scripts/reports', '/__tests__', '/scripts/remediate-rebar-55.mjs', '/scripts/shared/lastverifiedat-literal-guard.mjs']),
    ...walk(join(ROOT, 'importers'), ['.mjs', '.ts'], ['/__tests__']),
  ];
  const violations = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const v of analyzeSourceForLiteralLastVerifiedAt(src)) {
      violations.push({ file: relPath(file), ...v });
    }
  }
  return violations;
}
