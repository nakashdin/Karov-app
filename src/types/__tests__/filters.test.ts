import { countActiveFilters, emptyFilters, PlaceFilters } from '../filters';

const f = (over: Partial<PlaceFilters> = {}): PlaceFilters => ({ ...emptyFilters, ...over });

describe('countActiveFilters', () => {
  it('counts nothing for the default state', () => {
    expect(countActiveFilters(emptyFilters)).toBe(0);
  });

  it('ignores placeType — it is a mode set from Home, not a filter chip', () => {
    expect(countActiveFilters(f({ placeType: 'synagogue' }))).toBe(0);
  });

  it('ignores the free-text query', () => {
    expect(countActiveFilters(f({ query: 'פיצה' }))).toBe(0);
  });

  it.each([
    ['cityId', { cityId: 'tlv' }],
    ['mehadrinOnly', { mehadrinOnly: true }],
    ['kosherAuthorityGroup', { kosherAuthorityGroup: 'badatz' }],
    ['category', { category: 'meat' as const }],
    ['cuisineTag', { cuisineTag: 'pizza' }],
  ])('counts %s', (_label, over) => {
    expect(countActiveFilters(f(over))).toBe(1);
  });

  it('counts a narrower radius than the 20 km default', () => {
    expect(countActiveFilters(f({ distanceKm: 20 }))).toBe(0);
    expect(countActiveFilters(f({ distanceKm: 5 }))).toBe(1);
  });

  it('does not count "no distance limit" — it narrows nothing', () => {
    // null means unlimited, so there is no chip to remove. ListScreen applies
    // the same rule when it decides which active-filter chips to render.
    expect(countActiveFilters(f({ distanceKm: null }))).toBe(0);
  });

  it('sums independent filters', () => {
    expect(countActiveFilters(f({ cityId: 'tlv', mehadrinOnly: true, category: 'dairy' }))).toBe(3);
  });
});

describe('emptyFilters', () => {
  it('defaults to a 20 km radius', () => {
    expect(emptyFilters.distanceKm).toBe(20);
  });

  it('starts with no type, city, category or query', () => {
    expect(emptyFilters.placeType).toBeNull();
    expect(emptyFilters.cityId).toBeNull();
    expect(emptyFilters.category).toBeNull();
    expect(emptyFilters.query).toBe('');
    expect(emptyFilters.eatAll).toBe(false);
  });
});
