/**
 * Item 4 Unit 4 — a durable guard against the exact defect Item 4 exists to
 * fix: a script asserting a mehadrin-family level as a hardcoded literal,
 * with no evidence in the same object that the SOURCE TEXT itself states a
 * level (docs/KASHRUT_FACTS.md §5b/§22). Static source-text analysis, not a
 * runtime check — this fires on the SCRIPT, before it ever touches data.
 *
 * The predicate, corrected twice already before this file's design settled
 * (docs/KASHRUT_FACTS.md §22/§23):
 *   1. The Architect's first brief scoped by "names a body" — wrong axis;
 *      §5b: 0 of 203 registry aliases ever derived a level from a body, so
 *      naming one makes an inference traceable, not licensed.
 *   2. A comment-blind text scan (this file's first version) flagged its
 *      OWN sibling's JSDoc prose (scripts/import-rebar.mjs explaining its
 *      old bug by quoting the literal it used to write) as a live
 *      violation. A naive `/\* *\/` strip fixed that specific case but
 *      introduced a worse one: a REAL violating object literal survives
 *      undetected if any LATER ordinary JSDoc block exists anywhere in the
 *      file (which is every file in this repo) — the strip's own
 *      non-greedy `[\s\S]*?` consumed from the first `/*` inside the
 *      violating literal's own inline comment all the way to that later
 *      block's `*/`, deleting the object literal along with it. Confirmed
 *      by differential probing (three cases, no two fixed by the same
 *      thing): top-of-file prose (fixed by the null-enclosing-block rule
 *      below, independent of comment stripping), prose in a BLOCK comment
 *      INSIDE a real object literal (only a correct strip catches this),
 *      and prose in a LINE comment inside a literal (nothing but a correct
 *      strip catches this either — and it is the most dangerous shape,
 *      because it doesn't just misfire, it reports a PLAUSIBLE violation
 *      by picking up a sibling property as the prose's "evidence").
 *
 * The fix is a small string-aware scanner (stripComments below), not a
 * regex: a regex cannot know that a `/*` or `//` sequence sitting inside a
 * string literal is not a comment, and this codebase's real string values
 * (URLs, in particular — `https://...`) contain exactly that sequence.
 * stripComments tracks three states — code, inside a string (honouring
 * backslash escapes so an escaped quote never ends the string early), and
 * inside a comment (line or block) — and removes ONLY real comments.
 *
 * The predicate itself: a literal mehadrin-family assertion is a VIOLATION
 * unless `basisSupportsLevelAssertion()` — the SAME function
 * `recordKashrutWrite()` enforces at write time, imported here, never
 * reimplemented — accepts a basis honestly constructed from whatever
 * `certifiedBy` literal (if any) sits in the same object literal.
 *
 * Constructing that basis: `{kind:'registry-alias', alias:<certifiedBy
 * literal>, aliasLevel:<this module's OWN registry lookup on that
 * literal>.level}` — mirroring the exact calling convention
 * apply-kashrut-authorities.mjs already uses for a real write. Because
 * aliasLevel is derived from the SAME registry basisSupportsLevelAssertion
 * itself resolves the alias against, its internal caller-disagreement
 * cross-check (`entry.level !== basis.aliasLevel`) is UNREACHABLE from this
 * usage — measured, 0 of 203 aliases can trigger it this way. That
 * cross-check is not this guard's safety property. The check doing the
 * actual work is the terminal `entry.level === 'mehadrin'` inside
 * basisSupportsLevelAssertion — this module supplies it a real `entry` by
 * resolving the alias itself, it does not re-derive the accept/reject rule.
 *
 * A mehadrin-family match with NO enclosing object literal at all (a bare
 * top-level string, e.g. leftover prose stripComments didn't recognize as
 * a comment) is a NON-MATCH, not a violation with no evidence — the two are
 * different claims, and only one of them is an accusation against a real
 * write. This rule is cheap, correct, and covers the founding case
 * (top-of-file prose) independently of comment stripping, kept as
 * defense-in-depth alongside it rather than relying on stripComments alone.
 *
 * KNOWN, NOT FIXED HERE: `הרב רובין` (no gershayim) resolves in the
 * registry; `בד״ץ הרב רובין` (with gershayim, U+05F4) does not. Per B1.1,
 * gershayim-normalizing `certifiedBy` is deliberately out of scope for any
 * routine mechanism (raw text is source, not ours to tidy — FACTS §13).
 * This guard does not correct it either — but a rejection caused
 * specifically by this mismatch gets a distinct message pointing at the fix
 * (register the alias), not a plain reject with no path forward — a guard
 * whose failure message leaves no legitimate route out gets removed, not
 * satisfied.
 *
 * LEVEL_ASSERTING_KOSHER_TYPES is imported from kashrut-conflict-
 * resolution.mjs, its canonical exported home — not reimplemented here. It
 * also exists, unexported, in kashrut-write.mjs, validate-data.mjs, and (as
 * LEVEL_BEARING_TYPES) audit-358-level-removal.mjs; those three remain a
 * declared drift surface, not consolidated by this change.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { basisSupportsLevelAssertion } from './kashrut-write.mjs';
import { LEVEL_ASSERTING_KOSHER_TYPES } from './kashrut-conflict-resolution.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const REGISTRY_PATH = resolve(HERE, '..', 'reports', 'kashrut-registry.json');

function loadAliasMap() {
  try {
    const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8').replace(/^﻿/, ''));
    return new Map((registry.aliases ?? []).map((a) => [a.raw, a]));
  } catch {
    return new Map();
  }
}

/** Same shape/name as this repo's other scanners (kashrut-write-completeness.test.mjs). */
function walk(dir, exts, excludeSubstrings) {
  let out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    const norm = p.replaceAll('\\', '/');
    if (excludeSubstrings.some((e) => norm.includes(e))) continue;
    if (entry.isDirectory()) out = out.concat(walk(p, exts, excludeSubstrings));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(p);
  }
  return out;
}

function relPath(absPath) {
  return absPath.replaceAll('\\', '/').replace(ROOT.replaceAll('\\', '/') + '/', '');
}

/**
 * Removes `//` and `/* *\/` comments from JS/TS source — string-aware, so a
 * comment-delimiter sequence sitting inside a string literal (a URL's
 * `https://`, or prose itself) is never mistaken for a real comment. A
 * regex cannot make this distinction; this is a small character-by-character
 * scanner instead, tracking exactly three states: in code, inside a string
 * (single/double/template-backtick; a backslash always escapes the next
 * character, so an escaped quote never ends the string early), and inside
 * a comment (line or block). Comment characters are dropped; string and
 * code characters pass through unchanged, including the quotes themselves,
 * so a caller can still find `certifiedBy: '...'` normally afterward.
 *
 * Deliberately does not parse `${...}` interpolation inside a template
 * literal as re-entered code — no real kashrut-field value in this repo
 * uses one, and treating the whole backtick-delimited span as one string is
 * simpler and cannot itself hide or fabricate a comment.
 */
export function stripComments(src) {
  let out = '';
  let state = 'code'; // 'code' | 'string' | 'line' | 'block'
  let quote = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const c2 = src[i + 1];
    if (state === 'code') {
      if (c === '/' && c2 === '/') { state = 'line'; i++; continue; }
      if (c === '/' && c2 === '*') { state = 'block'; i++; continue; }
      if (c === '"' || c === "'" || c === '`') { state = 'string'; quote = c; out += c; continue; }
      out += c;
    } else if (state === 'string') {
      if (c === '\\') { out += c + (c2 ?? ''); i++; continue; }
      out += c;
      if (c === quote) { state = 'code'; quote = null; }
    } else if (state === 'line') {
      if (c === '\n') { state = 'code'; out += c; }
    } else if (state === 'block') {
      if (c === '*' && c2 === '/') { state = 'code'; i++; }
    }
  }
  return out;
}

/**
 * The nearest enclosing balanced `{...}` block around `index` — an
 * approximation of "the same object literal" that works for the flat,
 * unnested-at-the-top-level object shapes every real script in this repo
 * uses for a place record. Returns null if unbalanced or if the match
 * isn't inside braces at all — fails closed by treating that as no
 * enclosing literal, not a wrong one.
 */
function enclosingObjectLiteral(src, index) {
  let depth = 0;
  let start = -1;
  for (let i = index; i >= 0; i--) {
    const c = src[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) { start = i; break; }
      depth--;
    }
  }
  if (start === -1) return null;
  depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

const STRING_LITERAL = (name) => new RegExp(`\\b${name}\\s*:\\s*(['"])([^'"]*)\\1`);
const KOSHER_TYPE_RE = STRING_LITERAL('kosherType');
const KOSHER_LEVEL_RE = STRING_LITERAL('kosherLevel');
const CERTIFIED_BY_RE = STRING_LITERAL('certifiedBy');

/** True only for the specific gershayim-vs-quote mismatch this guard deliberately doesn't fix (see module header). */
function isGershayimMismatch(alias, aliasMap) {
  if (aliasMap.has(alias)) return false;
  const normalized = alias.replaceAll('״', '"').replaceAll('׳', "'");
  return normalized !== alias && aliasMap.has(normalized);
}

/**
 * Pure core: analyzes ALREADY-READ source text (comments not yet stripped —
 * this function strips them) and returns violations for that text alone, no
 * file I/O. Exported separately from findLevelAssertionViolations() so the
 * comment-stripping/enclosing-block/basis logic is directly testable
 * against synthetic source strings (the three differential-probe shapes
 * that motivated stripComments), not only against real repo files.
 */
export function analyzeSource(src, aliasMap = loadAliasMap()) {
  const stripped = stripComments(src);
  const candidates = [];
  for (const m of stripped.matchAll(new RegExp(KOSHER_TYPE_RE, 'g'))) {
    if (LEVEL_ASSERTING_KOSHER_TYPES.has(m[2])) candidates.push({ field: 'kosherType', value: m[2], index: m.index });
  }
  for (const m of stripped.matchAll(new RegExp(KOSHER_LEVEL_RE, 'g'))) {
    if (m[2] === 'mehadrin') candidates.push({ field: 'kosherLevel', value: m[2], index: m.index });
  }

  const violations = [];
  for (const c of candidates) {
    const block = enclosingObjectLiteral(stripped, c.index);
    if (!block) continue; // no enclosing object literal at all -> non-match, not a violation (see module header)

    const certifiedByMatch = block.match(CERTIFIED_BY_RE);
    const certifiedBy = certifiedByMatch ? certifiedByMatch[2] : null;

    let basis = null;
    if (certifiedBy) {
      const entry = aliasMap.get(certifiedBy);
      basis = { kind: 'registry-alias', alias: certifiedBy, aliasLevel: entry ? entry.level : null };
    }

    if (!basisSupportsLevelAssertion(basis)) {
      const gershayim = certifiedBy && isGershayimMismatch(certifiedBy, aliasMap);
      violations.push({
        field: c.field,
        value: c.value,
        certifiedBy,
        reason: !certifiedBy
          ? 'no certifiedBy literal in the same object — no evidence at all that the source text states a level'
          : gershayim
            ? `"${certifiedBy}" does not resolve in the registry by quote-mark form alone (gershayim ״ vs ASCII "/'). ` +
              'The ASCII-normalized form IS registered. This is not a rejection of the evidence — register this exact ' +
              'gershayim spelling as an additional alias raw in kashrut-registry.json (or use the registered spelling), ' +
              'then re-run. Do not "fix" the source text\'s quote marks — certifiedBy is source, not ours to tidy (B1.1).'
            : `"${certifiedBy}" resolves in the registry to level ${JSON.stringify(aliasMap.get(certifiedBy)?.level ?? null)}, ` +
              'not mehadrin — the source names a body but does not state a level; the level here is inferred, not evidenced ' +
              '(exactly the §5b defect: 0 of 203 registry aliases were ever derived from a body).',
      });
    }
  }
  return violations;
}

/**
 * Scans scripts/ (excluding reports/, shared/, __tests__/) and importers/
 * (excluding __tests__/) for a literal kosherType/kosherLevel mehadrin-
 * family value whose accompanying evidence does not satisfy
 * basisSupportsLevelAssertion(). Thin wrapper around analyzeSource() — file
 * discovery and I/O only.
 */
export function findLevelAssertionViolations() {
  const files = [
    ...walk(join(ROOT, 'scripts'), ['.mjs'], ['/scripts/reports', '/scripts/shared', '/__tests__']),
    ...walk(join(ROOT, 'importers'), ['.mjs', '.ts'], ['/__tests__']),
  ];
  const aliasMap = loadAliasMap();
  const violations = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const v of analyzeSource(src, aliasMap)) violations.push({ file: relPath(f), ...v });
  }
  return violations;
}
