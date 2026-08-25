import { getKosherLabel } from '../kosher';
import places from '../../data/generated/places.osm.json';

describe('getKosherLabel', () => {
  it('null and absent certifierId produce identical output for the same record', () => {
    const base = { kosherType: undefined, kosherLevel: 'mehadrin' as const, kosherAuthorityGroup: 'unknown' as const, kosherAuthority: undefined };
    const withNull = getKosherLabel({ ...base, certifierId: null });
    const withAbsent = getKosherLabel({ ...base });
    expect(withNull).toBe(withAbsent);
    expect(withNull).toBe('מהדרין');
  });

  it('a registered certifierId wins over everything else on the record, including a contradicting legacy level', () => {
    const label = getKosherLabel({
      certifierId: 'badatz-beit-yosef',
      kosherType: 'rabanut',
      kosherLevel: 'regular',
      kosherAuthorityGroup: 'rabbinate',
      kosherAuthority: undefined,
    });
    expect(label).toBe('בד״ץ בית יוסף');
  });

  it('an unresolved certifierId (not in the registry) falls through to the legacy structured fields, not to null', () => {
    const label = getKosherLabel({
      certifierId: 'not-a-real-authority-id',
      kosherType: undefined,
      kosherLevel: 'mehadrin',
      kosherAuthorityGroup: 'badatz',
      kosherAuthority: undefined,
    });
    expect(label).toBe('בד״ץ');
  });

  it('with no certifierId and no structured fields, falls back to the legacy kosherType label', () => {
    const label = getKosherLabel({
      certifierId: undefined,
      kosherType: 'badatz_beit_yosef',
      kosherLevel: undefined,
      kosherAuthorityGroup: undefined,
      kosherAuthority: undefined,
    });
    expect(label).toBe('בד״ץ בית יוסף');
  });

  it('with nothing at all, returns null', () => {
    const label = getKosherLabel({
      certifierId: undefined,
      kosherType: undefined,
      kosherLevel: undefined,
      kosherAuthorityGroup: undefined,
      kosherAuthority: undefined,
    });
    expect(label).toBeNull();
  });

  // P1 (Reviewer): the failure mode isn't "wrong for one record shape", it's
  // "some record shape somewhere takes a different path" — so this must run
  // over every real record's actual field combination, not a fixture.
  it('null and absent certifierId produce identical output across all real records in the dataset', () => {
    const mismatches: { id: string; withNull: string | null; withAbsent: string | null }[] = [];
    for (const p of places as { id: string; certifierId?: string | null }[]) {
      const { certifierId: _drop, ...rest } = p as { certifierId?: string | null } & Record<string, unknown>;
      const withNull = getKosherLabel({ ...rest, certifierId: null } as Parameters<typeof getKosherLabel>[0]);
      const withAbsent = getKosherLabel(rest as Parameters<typeof getKosherLabel>[0]);
      if (withNull !== withAbsent) mismatches.push({ id: p.id, withNull, withAbsent });
    }
    expect(mismatches).toEqual([]);
    expect(places.length).toBeGreaterThan(7000); // sanity: actually ran over the real dataset, not an empty array
  });
});
