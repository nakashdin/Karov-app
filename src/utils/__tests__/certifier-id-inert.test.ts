/**
 * Guards the owner's ruling, verbatim (2026-08-27): "לא — שדה אינרטי" —
 * `certifierId` is an INERT field. It attests that a `certifiedBy` string
 * resolved against the registry's alias table, not that a body actually
 * certified anything, and must never be treated as a higher-quality signal
 * than plain `certifiedBy` text.
 *
 * STATUS (2026-08-27): the 910-population write this guard was originally
 * built ahead of is CANCELLED. Once `kosherAuthorityGroup` was excluded
 * from that write, it became harmless — and therefore pointless: it would
 * have persisted the output of a pure function of a field already stored
 * (`certifiedBy`), then this very guard would have permanently forbidden
 * using it. The Architect and the owner agreed the write itself dies; this
 * guard does NOT. The ruling ("certifierId is inert") is a statement about
 * the FIELD, not about the cancelled write — `certifierId` exists in the
 * type system and in the registry today regardless of whether any current
 * write populates it broadly, and nothing prevents a future one. The rule
 * outlives the write. This file stays, at zero ongoing cost, as the
 * mechanism for a ruling that is still in force — read WRITE_FIELDS below
 * as "the fields this rule currently applies to," not as a description of
 * an operation in flight.
 *
 * RESPECIFIED (Reviewer finding on the original guard, while the write was
 * still planned, 2026-08-27): the first draft of this guard only covered
 * `certifierId` itself and only scanned `src/`. The Reviewer found the
 * (then-planned) write was ALSO about to set `kosherAuthorityGroup`
 * alongside `certifierId` — a field with two live consumers
 * (`PlaceCard.tsx`'s badge colour, `filterPlaces.ts`'s kashrut filter) that
 * the original guard never touched, because it only asked "does this
 * branch on certifierId," not "does this branch on anything this write
 * makes distinguishable." Measured before the fix: 461 records would have
 * changed kosherAuthorityGroup, 212 would have gained a premium badge, 192
 * would have newly appeared under the "בד״ץ" filter — the owner's
 * inert-field ruling would have been satisfied in letter (no branch on
 * `certifierId`) and violated in effect (the write still made records
 * visibly, functionally distinguishable) by the same commit. The invariant
 * is about what a write makes distinguishable, not which field name
 * appears in a branch condition — so this guard is scoped to the SET of
 * fields WRITE_FIELDS names, not to `certifierId` alone.
 *
 * WRITE_FIELDS currently holds `certifierId` ONLY — `kosherAuthorityGroup`
 * was explicitly ruled out for the (now-cancelled) write. If a future
 * write ever populates `certifierId` again and touches any other field as
 * part of that operation, WRITE_FIELDS must grow with it, or this guard
 * stops covering what it claims to.
 *
 * Scoped beyond src/ deliberately — the Reviewer's point was that
 * `kosherAuthorityGroup` is ALSO consumed by scripts/ reporting and by the
 * validate-data.mjs ratchets, so a "coverage of resolved records" metric
 * could appear outside src/ and never trip a src/-only rule. Inertness is
 * a property of ALL consumers, not one directory.
 *
 * Static, allowlist-based — the forbidden thing is a CODE PATH existing at
 * all (a filter, a sort key, a badge, a rank, a live quality/coverage
 * metric), not a specific input producing a specific wrong output. A file
 * outside the allowlist that references a WRITE_FIELDS member fails this
 * test by name, forcing a human decision rather than letting a new
 * distinction slip in silently.
 *
 * `scripts/reports/*.mjs` (one-off point-in-time census/audit scripts) and
 * `scripts/shared/kashrut-write.mjs` (the write choke-point itself, which
 * must name every writable field to route writes through it) are excluded
 * from the scripts/ scan — neither runs on every `data:validate`, neither
 * makes a record look different to a user or to a live check; they are
 * investigation instruments and infrastructure, not consumers. This
 * exclusion is itself something a reviewer should be able to see and
 * challenge, which is why it is named here rather than silently applied.
 *
 * KNOWN, FLAGGED, NOT YET RESOLVED: `classifyKosherState` (kosher.ts) DOES
 * branch on `certifierId != null` today, and the `certifier` render variant
 * DOES display the registry's canonical name (`authority.nameHe`) rather
 * than the record's own `certifiedBy` text — a real display distinction
 * that predates this ruling. For every currently-resolved record this is
 * invisible (certifiedBy and the canonical name are byte-identical, exact
 * match only), but the branch itself is exactly the shape the ruling
 * targets. This guard locks that surface at its current size (kosher.ts's
 * one branch, nothing more) rather than adjudicating whether it should
 * exist — see docs/KASHRUT_FACTS.md for the open question.
 *
 * `freeTextCertifierUnmapped` (scripts/shared/ratchet-corrections.mjs,
 * consumed by validate-data.mjs) is judged NOT a violation and is
 * explicitly allowed: it counts records with certifiedBy text that has
 * NOT resolved into certifierId — a dataset-provenance-mapping-progress
 * metric ("how much free text remains unmapped"), never displayed,
 * never filtered on, and it does not make a resolved record look more
 * trustworthy than an unresolved one to any consumer. This judgment call
 * is stated explicitly, not silently made, so it can be challenged.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const SRC_ROOT = resolve(REPO_ROOT, 'src');
const SCRIPTS_ROOT = resolve(REPO_ROOT, 'scripts');

/**
 * Fields the current write stage populates on the 910 population. Exactly
 * this set — not a superset "to be safe," since a guard that forbids more
 * than what's actually written can't be activated meaningfully (nothing
 * would ever legitimately reference the extra fields to prove the guard
 * catches a real violation). Grow this list the moment a future stage
 * writes an additional field as part of the same operation.
 */
const WRITE_FIELDS = ['certifierId'];

/** Files in src/ permitted to reference a WRITE_FIELDS member at all. */
const SRC_ALLOWLIST = new Set([
  'types/place.ts', // the field declaration itself
  'data/kashrut/authorities.ts', // doc comments describing the relationship, no branching
  'utils/kosher.ts', // the one known branch, flagged in the header above
]);

/**
 * scripts/ files permitted to reference a WRITE_FIELDS member. Everything
 * under scripts/reports/ (one-off census/audit instruments) and
 * scripts/shared/kashrut-write.mjs (the write choke point) is excluded
 * from the scan entirely — see the file header's rationale. Everything
 * else in scripts/ that references a WRITE_FIELDS member must be here,
 * with a reason, or the test fails naming it.
 */
const SCRIPTS_ALLOWLIST = new Set([
  'apply-kashrut-authorities.mjs', // the script that PERFORMS this write — must name the field to write it
  'shared/ratchet-corrections.mjs', // isFreeTextCertifierUnmapped — judged not a violation, see file header
  'validate-data.mjs', // consumes isFreeTextCertifierUnmapped + the accidental-loss guard (KASHRUT_REGRESSION_FIELDS) — neither is a quality/coverage-of-resolved ranking
]);

function isTestFile(relPath: string): boolean {
  return relPath.includes('__tests__') || /\.test\.[jt]sx?$/.test(relPath);
}

function isExcludedScriptsPath(relPath: string): boolean {
  return relPath.startsWith(`reports${sep}`) || relPath.startsWith('reports/');
}

function listFiles(dir: string, extPattern: RegExp, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      listFiles(full, extPattern, out);
    } else if (extPattern.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function referencesAnyWriteField(content: string): string | null {
  for (const field of WRITE_FIELDS) {
    if (content.includes(field)) return field;
  }
  return null;
}

describe('write-populated fields are inert (owner ruling, 2026-08-27, respecified after the kosherAuthorityGroup finding)', () => {
  const srcFiles = listFiles(SRC_ROOT, /\.tsx?$/).filter((f) => !isTestFile(relative(SRC_ROOT, f)));
  const scriptsFilesAll = listFiles(SCRIPTS_ROOT, /\.mjs$/);
  const scriptsFiles = scriptsFilesAll.filter((f) => {
    const relPath = relative(SCRIPTS_ROOT, f).replace(/\\/g, '/');
    return !isTestFile(relPath) && !isExcludedScriptsPath(relPath) && relPath !== 'shared/kashrut-write.mjs';
  });

  test('sanity: at least one file in src/ AND at least one in scripts/ references a WRITE_FIELDS member — a scan that finds nothing is not proof of compliance, it may be a broken scan', () => {
    const srcHit = srcFiles.some((f) => referencesAnyWriteField(readFileSync(f, 'utf8')));
    const scriptsHit = scriptsFilesAll.some((f) => referencesAnyWriteField(readFileSync(f, 'utf8')));
    expect(srcHit).toBe(true);
    expect(scriptsHit).toBe(true);
  });

  test('no src/ file outside the allowlist references a WRITE_FIELDS member', () => {
    const violations: string[] = [];
    for (const file of srcFiles) {
      const relPath = relative(SRC_ROOT, file).replace(/\\/g, '/');
      if (SRC_ALLOWLIST.has(relPath)) continue;
      const hit = referencesAnyWriteField(readFileSync(file, 'utf8'));
      if (hit) violations.push(`${relPath} (references "${hit}")`);
    }
    expect(violations).toEqual([]);
  });

  test('no scripts/ file outside the allowlist (and outside scripts/reports/, scripts/shared/kashrut-write.mjs) references a WRITE_FIELDS member', () => {
    const violations: string[] = [];
    for (const file of scriptsFiles) {
      const relPath = relative(SCRIPTS_ROOT, file).replace(/\\/g, '/');
      if (SCRIPTS_ALLOWLIST.has(relPath)) continue;
      const hit = referencesAnyWriteField(readFileSync(file, 'utf8'));
      if (hit) violations.push(`${relPath} (references "${hit}")`);
    }
    expect(violations).toEqual([]);
  });

  test('no filter, sort, rank, or badge logic anywhere in src/ branches on the derived "certifier" kind (the discriminant classifyKosherState produces for a resolved certifierId)', () => {
    const violations: string[] = [];
    for (const file of srcFiles) {
      const relPath = relative(SRC_ROOT, file).replace(/\\/g, '/');
      if (relPath === 'utils/kosher.ts') continue; // the classification/render switch itself — the one legitimate producer/consumer
      const content = readFileSync(file, 'utf8');
      if (/kind\s*[=!]==?\s*['"]certifier['"]/.test(content)) {
        violations.push(relPath);
      }
    }
    expect(violations).toEqual([]);
  });

  test('filterPlaces.ts (the actual filter/query predicate module) does not reference any WRITE_FIELDS member or the certifier kind at all', () => {
    const path = join(SRC_ROOT, 'data', 'repository', 'filterPlaces.ts');
    const content = readFileSync(path, 'utf8');
    expect(referencesAnyWriteField(content)).toBeNull();
    expect(content).not.toMatch(/['"]certifier['"]/);
  });

  test('PlaceCard.tsx (the live badge-colour logic the Reviewer flagged) does not branch on any WRITE_FIELDS member', () => {
    const path = join(SRC_ROOT, 'components', 'PlaceCard.tsx');
    const content = readFileSync(path, 'utf8');
    expect(referencesAnyWriteField(content)).toBeNull();
  });
});
