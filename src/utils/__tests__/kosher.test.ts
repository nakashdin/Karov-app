import { getPrimaryKosherLabel } from '../kosher';
import { he } from '../../i18n/he';
import places from '../../data/generated/places.osm.json';

const strings = he.kosher;

describe('getPrimaryKosherLabel / getKosherLabel', () => {
  it('null and absent certifierId produce identical output for the same record', () => {
    const base = { kosherType: undefined, kosherLevel: 'mehadrin' as const, kosherAuthorityGroup: 'unknown' as const, kosherAuthority: undefined };
    const withNull = getPrimaryKosherLabel({ ...base, certifierId: null }, strings);
    const withAbsent = getPrimaryKosherLabel({ ...base }, strings);
    expect(withNull).toBe(withAbsent);
    expect(withNull).toBe('מהדרין');
  });

  it('a registered certifierId wins over everything else on the record, including a contradicting legacy level', () => {
    const label = getPrimaryKosherLabel({
      certifierId: 'badatz-beit-yosef',
      kosherType: 'rabanut',
      kosherLevel: 'regular',
      kosherAuthorityGroup: 'rabbinate',
      kosherAuthority: undefined,
    }, strings);
    expect(label).toBe('בד״ץ בית יוסף');
  });

  it('an unresolved certifierId (not in the registry) falls through to the legacy structured fields, not to null', () => {
    const label = getPrimaryKosherLabel({
      certifierId: 'not-a-real-authority-id',
      kosherType: undefined,
      kosherLevel: 'mehadrin',
      kosherAuthorityGroup: 'badatz',
      kosherAuthority: undefined,
    }, strings);
    expect(label).toBe('בד״ץ');
  });

  it('with no certifierId and no structured fields, falls back to the legacy kosherType label', () => {
    const label = getPrimaryKosherLabel({
      certifierId: undefined,
      kosherType: 'badatz_beit_yosef',
      kosherLevel: undefined,
      kosherAuthorityGroup: undefined,
      kosherAuthority: undefined,
    }, strings);
    expect(label).toBe('בד״ץ בית יוסף');
  });

  it('with nothing at all, returns null', () => {
    const label = getPrimaryKosherLabel({
      certifierId: undefined,
      kosherType: undefined,
      kosherLevel: undefined,
      kosherAuthorityGroup: undefined,
      kosherAuthority: undefined,
    }, strings);
    expect(label).toBeNull();
  });

  // Batch B1 / FACTS §5b post-mortem: kosherLevel: null must NOT fall through
  // to the legacy kosherType label. It very nearly did — a first version of
  // this fix checked that null and undefined take the identical path (true,
  // the same property Batch A required of certifierId) and stopped there.
  // That check is insufficient here because the two fields land somewhere
  // different when they fall through: certifierId falls through to a chain
  // that never mentions certifierId again, so "identical to undefined" is
  // the whole story. kosherLevel falls through to
  // kosherTypeLabel[kosherType] — the legacy field that still asserts the
  // very level the null was recording as withheld. This test performs
  // exactly that trap: a record with kosherLevel explicitly null, no
  // kosherAuthorityGroup, no certifierId, and a legacy kosherType that still
  // says 'mehadrin'. Reverting the `!== undefined` fix in kosher.ts makes
  // this fail by returning 'מהדרין' instead.
  it('kosherLevel: null does not resurrect the legacy kosherType claim it is withholding', () => {
    const label = getPrimaryKosherLabel({
      certifierId: undefined,
      kosherType: 'mehadrin',
      kosherLevel: null,
      kosherAuthorityGroup: undefined,
      kosherAuthority: undefined,
    }, strings);
    expect(label).not.toBe('מהדרין');
    // Owner ruling, Item 4 Unit 3, 2026-08-27 (verbatim: "אם לא ידוע יש
    // להציג כשר כשרות מקומית") supersedes the earlier Batch B1 string
    // 'גוף כשרות לא ידוע' — see docs/KASHRUT_FACTS.md.
    expect(label).toBe('כשר כשרות מקומית');
  });

  it('kosherLevel: null with a known rabbinate group renders the group, not the withheld level', () => {
    const label = getPrimaryKosherLabel({
      certifierId: undefined,
      kosherType: 'rabanut_mehadrin',
      kosherLevel: null,
      kosherAuthorityGroup: 'rabbinate',
      kosherAuthority: undefined,
    }, strings);
    expect(label).toBe('רבנות');
  });

  // Caught by running this test, not by inspection: kosherLevel: null and
  // kosherLevel: undefined are NOT supposed to be identical, unlike
  // certifierId's null/absent. I wrote this test expecting them equal,
  // importing the certifierId precedent by analogy without re-checking it —
  // the same class of mistake as the line-138 miss, just one level up, in
  // the test instead of the implementation. They correctly diverge: null
  // means "deliberately undetermined" and enters the structured block
  // (falling to the honest 'גוף כשרות לא ידוע'); undefined means "never
  // migrated" and takes the legacy kosherType fallback (null here, since
  // kosherType is also unset). Different meanings, correctly different
  // output — asymmetric with certifierId on purpose.
  it('kosherLevel: null and kosherLevel: undefined deliberately diverge when nothing else is set — unlike certifierId', () => {
    const withNull = getPrimaryKosherLabel({
      certifierId: undefined,
      kosherType: undefined,
      kosherLevel: null,
      kosherAuthorityGroup: undefined,
      kosherAuthority: undefined,
    }, strings);
    const withUndefined = getPrimaryKosherLabel({
      certifierId: undefined,
      kosherType: undefined,
      kosherLevel: undefined,
      kosherAuthorityGroup: undefined,
      kosherAuthority: undefined,
    }, strings);
    expect(withNull).toBe('כשר כשרות מקומית');
    expect(withUndefined).toBeNull();
    expect(withNull).not.toBe(withUndefined);
  });

  // P1 (Reviewer): the failure mode isn't "wrong for one record shape", it's
  // "some record shape somewhere takes a different path" — so this must run
  // over every real record's actual field combination, not a fixture.
  it('null and absent certifierId produce identical output across all real records in the dataset', () => {
    const mismatches: { id: string; withNull: string | null; withAbsent: string | null }[] = [];
    for (const p of places as { id: string; certifierId?: string | null }[]) {
      const { certifierId: _drop, ...rest } = p as { certifierId?: string | null } & Record<string, unknown>;
      const withNull = getPrimaryKosherLabel({ ...rest, certifierId: null } as Parameters<typeof getPrimaryKosherLabel>[0], strings);
      const withAbsent = getPrimaryKosherLabel(rest as Parameters<typeof getPrimaryKosherLabel>[0], strings);
      if (withNull !== withAbsent) mismatches.push({ id: p.id, withNull, withAbsent });
    }
    expect(mismatches).toEqual([]);
    expect(places.length).toBeGreaterThan(7000); // sanity: actually ran over the real dataset, not an empty array
  });
});
