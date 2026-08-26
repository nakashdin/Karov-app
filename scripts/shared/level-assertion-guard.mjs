/**
 * Item 4 Unit 4 — a durable guard against the exact defect Item 4 exists to
 * fix: a script asserting a mehadrin-family level as a hardcoded literal,
 * with no evidence in the same object that the SOURCE TEXT itself states a
 * level (docs/KASHRUT_FACTS.md §5b/§22). Static source-text analysis, not a
 * runtime check — this fires on the SCRIPT, before it ever touches data.
 *
 * The predicate, corrected once already before this file existed (the
 * Architect's first brief scoped by "names a body" — wrong axis; §5b: 0 of
 * 203 registry aliases ever derived a level from a body, so naming one
 * makes an inference traceable, not licensed): a literal mehadrin-family
 * assertion is a VIOLATION unless `basisSupportsLevelAssertion()` — the
 * SAME function `recordKashrutWrite()` enforces at write time, imported
 * here, never reimplemented — accepts a basis honestly constructed from
 * whatever `certifiedBy` literal (if any) sits in the same object literal.
 *
 * Constructing that basis: `{kind:'registry-alias', alias:<certifiedBy
 * literal>, aliasLevel:<this module's OWN registry lookup on that
 * literal>.level}` — mirroring the exact calling convention
 * apply-kashrut-authorities.mjs already uses for a real write. Because
 * aliasLevel is derived from the SAME registry basisSupportsLevelAssertion
 * itself resolves the alias against, its internal caller-disagreement
 * cross-check (`entry.level !== basis.aliasLevel`) is UNREACHABLE from this
 * usage — measured, 0 of 203 aliases can trigger it this way (see FACTS
 * §23). That cross-check is not this guard's safety property. The check
 * doing the actual work is the terminal `entry.level === 'mehadrin'` inside
 * basisSupportsLevelAssertion — this module supplies it a real `entry` by
 * resolving the alias itself, it does not re-derive the accept/reject rule.
 *
 * KNOWN, NOT FIXED HERE: `הרב רובין` (no gershayim) resolves in the
 * registry; `בד״ץ הרב רובין` (with gershayim, U+05F4) does not. Per B1.1,
 * gershayim-normalizing `certifiedBy` is deliberately out of scope for any
 * routine mechanism (raw text is source, not ours to tidy — FACTS §13).
 * This guard does not correct it either — but a rejection caused by exactly
 * this mismatch gets a distinct message pointing at the fix (register the
 * alias), not a plain reject with no path forward (see REJECTED_GERSHAYIM
 * below) — a guard whose failure message leaves no legitimate route out
 * gets removed, not satisfied.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { basisSupportsLevelAssertion } from './kashrut-write.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const REGISTRY_PATH = resolve(HERE, '..', 'reports', 'kashrut-registry.json');

/** Kept in sync with kashrut-write.mjs's own (unexported) LEVEL_ASSERTING_KOSHER_TYPES + its kosherLevel==='mehadrin' check — this is the detection vocabulary, not the accept/reject rule, which stays imported. */
const LEVEL_ASSERTING_KOSHER_TYPES = new Set(['mehadrin', 'rabanut_mehadrin', 'rabanut_mehadrin_jerusalem']);

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
 * The nearest enclosing balanced `{...}` block around `index` — an
 * approximation of "the same object literal" that works for the flat,
 * unnested-at-the-top-level object shapes every real script in this repo
 * uses for a place record (confirmed by reading every known positive/
 * negative case before relying on this: patch-shemesh-missed.mjs,
 * update-pizza-story-hours.mjs, fix-nagisa-official.mjs, and the six
 * import-*.mjs cases). Returns null if unbalanced (should not happen in
 * valid JS; fails closed by returning no window rather than a wrong one).
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
 * Scans scripts/ (excluding reports/ and shared/ — infrastructure, not
 * one-off writers) and importers/ for a literal kosherType/kosherLevel
 * mehadrin-family assertion whose accompanying evidence (a certifiedBy
 * literal in the same object literal, resolved against the real registry)
 * does not satisfy basisSupportsLevelAssertion(). Returns one entry per
 * violation — a single object can produce two (kosherType AND kosherLevel
 * both asserting mehadrin, as fix-nagisa-official.mjs's PASSING case
 * legitimately does) without being a double-count of the same defect.
 */
export function findLevelAssertionViolations() {
  const files = [
    ...walk(join(ROOT, 'scripts'), ['.mjs'], ['/scripts/reports', '/scripts/shared', '/__tests__']),
    ...walk(join(ROOT, 'importers'), ['.mjs', '.ts'], ['/__tests__']),
  ];
  const aliasMap = loadAliasMap();
  const violations = [];

  for (const f of files) {
    // Strip /* */ block comments before scanning — a naive text scan over
    // raw source matches its own JSDoc prose. Confirmed real, not
    // hypothetical: this file's sibling, scripts/import-rebar.mjs, explains
    // IN A COMMENT that the old version stamped kosherType:'mehadrin', and
    // an unstripped scan flagged that sentence as a live violation.
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const candidates = [];
    for (const m of src.matchAll(new RegExp(KOSHER_TYPE_RE, 'g'))) {
      if (LEVEL_ASSERTING_KOSHER_TYPES.has(m[2])) candidates.push({ field: 'kosherType', value: m[2], index: m.index });
    }
    for (const m of src.matchAll(new RegExp(KOSHER_LEVEL_RE, 'g'))) {
      if (m[2] === 'mehadrin') candidates.push({ field: 'kosherLevel', value: m[2], index: m.index });
    }

    for (const c of candidates) {
      const block = enclosingObjectLiteral(src, c.index);
      const certifiedByMatch = block ? block.match(CERTIFIED_BY_RE) : null;
      const certifiedBy = certifiedByMatch ? certifiedByMatch[2] : null;

      let basis = null;
      if (certifiedBy) {
        const entry = aliasMap.get(certifiedBy);
        basis = { kind: 'registry-alias', alias: certifiedBy, aliasLevel: entry ? entry.level : null };
      }

      if (!basisSupportsLevelAssertion(basis)) {
        const gershayim = certifiedBy && isGershayimMismatch(certifiedBy, aliasMap);
        violations.push({
          file: relPath(f),
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
  }
  return violations;
}
