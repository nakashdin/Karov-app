/**
 * Guards the owner's ruling, verbatim (2026-08-27): "לא — שדה אינרטי" —
 * `certifierId` is an INERT field. It attests that a `certifiedBy` string
 * resolved against the registry's alias table; it does NOT attest that a
 * body actually certified anything, and it must never be treated as a
 * higher-quality signal than plain `certifiedBy` text. This guard exists
 * specifically to run BEFORE the 910-record write populates `certifierId`
 * broadly — a ruling is not a mechanism, and this project's method is
 * replacing "nobody will do that" with "something checks."
 *
 * Static, allowlist-based, over ALL of src/ — not a runtime behavior test,
 * because the forbidden thing is a CODE PATH existing at all (a filter, a
 * sort key, a badge, a ratchet keyed on certifierId), not a specific input
 * producing a specific wrong output. A file outside the allowlist that
 * merely mentions `certifierId` fails this test by name, forcing a human
 * decision (extend the allowlist with a stated reason, or don't write the
 * code) rather than letting a new distinction slip in silently.
 *
 * KNOWN, FLAGGED, NOT YET RESOLVED: `classifyKosherState` (kosher.ts) DOES
 * branch on `certifierId != null` today, and the `certifier` render variant
 * DOES display the registry's canonical name (`authority.nameHe`) rather
 * than the record's own `certifiedBy` text — a real display distinction
 * that predates this ruling. For every currently-resolved record this is
 * invisible (certifiedBy and the canonical name are byte-identical, exact
 * match only), but the branch itself is exactly the shape the ruling
 * targets, and this guard does not adjudicate it — see
 * docs/KASHRUT_FACTS.md for the open question. This test locks the
 * CURRENT surface (kosher.ts's one branch, nothing more) so it cannot grow
 * silently while that question is open.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const SRC_ROOT = resolve(__dirname, '..', '..');

/**
 * The ONLY files in src/ permitted to reference `certifierId` at all.
 * Anything else that references it fails this test — extending this list
 * requires a stated reason, not a silent addition.
 */
const ALLOWLISTED_FILES = new Set([
  'types/place.ts', // the field declaration itself
  'data/kashrut/authorities.ts', // doc comments describing the relationship, no branching
  'utils/kosher.ts', // the one known, flagged branch — see file header above
]);

/** Test files are exempt — they exist to exercise the guarded surface, not to be it. */
function isTestFile(relPath: string): boolean {
  return relPath.includes('__tests__') || /\.test\.[jt]sx?$/.test(relPath);
}

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      listSourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('certifierId is inert (owner ruling, 2026-08-27)', () => {
  const allFiles = listSourceFiles(SRC_ROOT).filter((f) => !isTestFile(relative(SRC_ROOT, f)));

  test('sanity: at least one file references certifierId — a scan that finds nothing is not proof of compliance, it may be a broken scan', () => {
    const referencing = allFiles.filter((f) => readFileSync(f, 'utf8').includes('certifierId'));
    expect(referencing.length).toBeGreaterThan(0);
  });

  test('no src/ file outside the allowlist references certifierId', () => {
    const violations: string[] = [];
    for (const file of allFiles) {
      const relPath = relative(SRC_ROOT, file).replace(/\\/g, '/');
      if (ALLOWLISTED_FILES.has(relPath)) continue;
      const content = readFileSync(file, 'utf8');
      if (content.includes('certifierId')) {
        violations.push(relPath);
      }
    }
    expect(violations).toEqual([]);
  });

  test('no filter, sort, rank, or badge logic anywhere in src/ branches on the derived "certifier" kind (the discriminant classifyKosherState produces for a resolved certifierId)', () => {
    const violations: string[] = [];
    for (const file of allFiles) {
      const relPath = relative(SRC_ROOT, file).replace(/\\/g, '/');
      if (relPath === 'utils/kosher.ts') continue; // the classification/render switch itself — that's the one place this discriminant is legitimately produced and consumed
      const content = readFileSync(file, 'utf8');
      if (/kind\s*[=!]==?\s*['"]certifier['"]/.test(content)) {
        violations.push(relPath);
      }
    }
    expect(violations).toEqual([]);
  });

  test('filterPlaces.ts (the actual filter/query predicate module) does not reference certifierId or the certifier kind at all', () => {
    const path = join(SRC_ROOT, 'data', 'repository', 'filterPlaces.ts');
    const content = readFileSync(path, 'utf8');
    expect(content).not.toMatch(/certifierId/);
    expect(content).not.toMatch(/['"]certifier['"]/);
  });
});
