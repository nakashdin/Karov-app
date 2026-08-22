import { Place } from '../../../types';
import { filterPlaces, matchesFilters } from '../filterPlaces';
import { _resetIndex } from '../../search/searchEngine';

function place(over: Partial<Place> & Pick<Place, 'id' | 'name' | 'type'>): Place {
  return {
    cityId: 'tlv',
    address: 'הרצל 1',
    location: { latitude: 32, longitude: 34 },
    ...over,
  } as Place;
}

const PLACES: Place[] = [
  place({ id: '1', name: 'פיצה האט', type: 'restaurant', category: 'dairy', tags: ['pizza'] }),
  place({
    id: '2',
    name: 'בורגר רנץ׳',
    type: 'restaurant',
    category: 'meat',
    subType: 'fast_food',
    tags: ['burger'],
    kosherLevel: 'mehadrin',
    kosherAuthorityGroup: 'badatz',
    kosherAuthority: 'badatz_edah',
  }),
  place({ id: '3', name: 'קפה גרג', type: 'cafe', tags: ['coffee'] }),
  place({ id: '4', name: 'בית הכנסת הגדול', type: 'synagogue', cityId: 'jlm' }),
  place({ id: '5', name: 'עגלת קפה', type: 'coffee_cart' }),
  place({
    id: '6',
    name: 'מקווה מרכזי',
    type: 'mikveh',
    cityId: 'jlm',
    kosherAuthorityGroup: 'rabbinate',
  }),
];

const ids = (list: Place[]) => list.map((p) => p.id).sort();

// The index is a module singleton; a stale one would leak between suites.
beforeEach(() => _resetIndex());

describe('filterPlaces — exact filters', () => {
  it('returns everything when no filter is set', () => {
    expect(filterPlaces(PLACES, {})).toHaveLength(PLACES.length);
  });

  it('filters by placeType', () => {
    expect(ids(filterPlaces(PLACES, { placeType: 'restaurant' }))).toEqual(['1', '2']);
  });

  it('treats a matching tag as a placeType match', () => {
    // 'pizza' is a tag on place 1, not a type — the filter accepts either.
    expect(ids(filterPlaces(PLACES, { placeType: 'pizza' as Place['type'] }))).toEqual(['1']);
  });

  it('eatAll overrides placeType and returns restaurants + cafes + coffee carts', () => {
    expect(ids(filterPlaces(PLACES, { eatAll: true, placeType: 'synagogue' }))).toEqual([
      '1',
      '2',
      '3',
      '5',
    ]);
  });

  it('filters by subType', () => {
    expect(ids(filterPlaces(PLACES, { subType: 'fast_food' }))).toEqual(['2']);
  });

  it('filters by cityId', () => {
    expect(ids(filterPlaces(PLACES, { cityId: 'jlm' }))).toEqual(['4', '6']);
  });

  it('filters by kosher category', () => {
    expect(ids(filterPlaces(PLACES, { category: 'meat' }))).toEqual(['2']);
  });

  it('mehadrinOnly keeps only kosherLevel === mehadrin', () => {
    expect(ids(filterPlaces(PLACES, { mehadrinOnly: true }))).toEqual(['2']);
  });

  it('matches kosherAuthorityGroup at group level', () => {
    expect(ids(filterPlaces(PLACES, { kosherAuthorityGroup: 'rabbinate' }))).toEqual(['6']);
    expect(ids(filterPlaces(PLACES, { kosherAuthorityGroup: 'badatz' }))).toEqual(['2']);
  });

  it('matches a specific authority key against kosherAuthority, not the group', () => {
    expect(ids(filterPlaces(PLACES, { kosherAuthorityGroup: 'badatz_edah' }))).toEqual(['2']);
    expect(filterPlaces(PLACES, { kosherAuthorityGroup: 'badatz_beit_yosef' })).toHaveLength(0);
  });

  it('expands a cuisine tag group', () => {
    // 'coffee_shop' expands to coffee_shop | coffee | cafe.
    expect(ids(filterPlaces(PLACES, { cuisineTag: 'coffee_shop' }))).toEqual(['3']);
  });

  it('falls back to the literal tag for an unknown cuisine group', () => {
    expect(ids(filterPlaces(PLACES, { cuisineTag: 'burger' }))).toEqual(['2']);
  });

  it('combines filters with AND', () => {
    expect(ids(filterPlaces(PLACES, { placeType: 'restaurant', category: 'dairy' }))).toEqual(['1']);
  });
});

describe('filterPlaces — substring fallback (search index not built)', () => {
  const cities = new Map([
    ['tlv', 'תל אביב'],
    ['jlm', 'ירושלים'],
  ]);

  it('matches on name', () => {
    expect(ids(filterPlaces(PLACES, { query: 'פיצה' }, cities))).toEqual(['1']);
  });

  it('matches on the injected city name, not on a hard-coded seed', () => {
    expect(ids(filterPlaces(PLACES, { query: 'ירושלים' }, cities))).toEqual(['4', '6']);
  });

  it('finds nothing by city name when no lookup is injected', () => {
    // Proves the module holds no dataset of its own (regression guard for the
    // seed leak fixed in P1-3).
    expect(filterPlaces(PLACES, { query: 'ירושלים' })).toHaveLength(0);
  });

  it('matches on address', () => {
    expect(filterPlaces(PLACES, { query: 'הרצל' }, cities).length).toBe(PLACES.length);
  });

  it('applies exact filters alongside the query', () => {
    expect(ids(filterPlaces(PLACES, { query: 'הרצל', placeType: 'synagogue' }, cities))).toEqual([
      '4',
    ]);
  });

  it('ignores a whitespace-only query', () => {
    expect(filterPlaces(PLACES, { query: '   ' }, cities)).toHaveLength(PLACES.length);
  });
});

describe('matchesFilters', () => {
  it('accepts a place that passes every filter', () => {
    expect(matchesFilters(PLACES[1], { placeType: 'restaurant', mehadrinOnly: true })).toBe(true);
  });

  it('rejects a place that fails one filter', () => {
    expect(matchesFilters(PLACES[0], { mehadrinOnly: true })).toBe(false);
  });

  it('uses the injected city lookup for queries', () => {
    const cities = new Map([['tlv', 'תל אביב']]);
    expect(matchesFilters(PLACES[0], { query: 'תל אביב' }, cities)).toBe(true);
    expect(matchesFilters(PLACES[0], { query: 'תל אביב' })).toBe(false);
  });
});
