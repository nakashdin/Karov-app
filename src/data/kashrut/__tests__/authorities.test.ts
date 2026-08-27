import { readFileSync } from 'node:fs';
import path from 'node:path';
import { KASHRUT_AUTHORITIES, getKashrutAuthority } from '../authorities';

/**
 * KASHRUT_AUTHORITIES is a hand-copied mirror of kashrut-registry.json's
 * authorities[] (the registry lives outside src/, so app code can't import
 * it directly). Before Change A this was inert reference data — a drifted
 * copy was a latent maintenance problem with no runtime consequence. Change
 * A made it a runtime dependency of the label path: getKosherLabel resolves
 * certifierId through getKashrutAuthority, so a drifted mirror now means the
 * app displays the wrong certifying body's name, or silently fails to
 * resolve a valid certifierId and falls through to a legacy label — the
 * second failure mode is the nastier one because it looks like normal
 * fallback behaviour rather than a bug. This test is what makes that drift
 * loud instead of silent; it would have caught the 4-of-5/5-of-5 gershayim
 * miss found by hand while building this same batch.
 */
describe('KASHRUT_AUTHORITIES mirrors kashrut-registry.json exactly', () => {
  const registryPath = path.resolve(__dirname, '../../../../scripts/reports/kashrut-registry.json');
  const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as {
    authorities: { id: string; nameHe: string; nameEn: string; group: string; kind: string; city: string | null }[];
  };

  it('sanity: the registry file actually has entries (guards against a silently empty/missing file passing vacuously)', () => {
    expect(registry.authorities.length).toBeGreaterThan(50);
  });

  it('has the exact same set of ids as the registry\'s authorities', () => {
    const registryIds = new Set(registry.authorities.map((a) => a.id));
    const mirrorIds = new Set(KASHRUT_AUTHORITIES.map((a) => a.id));

    const missingFromMirror = [...registryIds].filter((id) => !mirrorIds.has(id));
    const extraInMirror = [...mirrorIds].filter((id) => !registryIds.has(id));

    expect(missingFromMirror).toEqual([]);
    expect(extraInMirror).toEqual([]);
    expect(mirrorIds.size).toBe(registryIds.size);
  });

  it('every id resolves to byte-identical id/nameHe/nameEn/group/kind/city between the mirror and the registry', () => {
    const byIdInRegistry = new Map(registry.authorities.map((a) => [a.id, a]));
    const mismatches: { id: string; field: string; mirror: unknown; registry: unknown }[] = [];

    for (const a of KASHRUT_AUTHORITIES) {
      const r = byIdInRegistry.get(a.id);
      if (!r) continue; // already caught by the id-set test above
      for (const field of ['nameHe', 'nameEn', 'group', 'kind', 'city'] as const) {
        if (a[field] !== r[field]) {
          mismatches.push({ id: a.id, field, mirror: a[field], registry: r[field] });
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('getKashrutAuthority agrees with the registry for a real id and returns undefined for a fake one', () => {
    const real = registry.authorities[0];
    expect(getKashrutAuthority(real.id)).toEqual({
      id: real.id,
      nameHe: real.nameHe,
      nameEn: real.nameEn,
      group: real.group,
      kind: real.kind,
      city: real.city,
    });
    expect(getKashrutAuthority('not-a-real-authority-id')).toBeUndefined();
  });

  it('no nameHe value uses an ASCII quote where Hebrew gershayim (״ U+05F4) is required — regression guard for the fix just made in this batch', () => {
    const asciiQuoteOffenders = KASHRUT_AUTHORITIES.filter((a) => a.nameHe.includes('"'));
    expect(asciiQuoteOffenders.map((a) => a.id)).toEqual([]);
  });
});
