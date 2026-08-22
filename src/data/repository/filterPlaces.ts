import { Place, PlaceFilters } from '../../types';
import { searchPlaces } from '../search/searchEngine';

/**
 * Lookup of cityId -> city name, used only by the substring fallback search.
 * Injected by the repository so this module stays independent of any single
 * dataset — the OSM repository passes its 656 real cities, the mock repository
 * passes its seed. Never import a dataset here.
 */
export type CityNameLookup = ReadonlyMap<string, string>;

const NO_CITIES: CityNameLookup = new Map();

const CUISINE_TAG_GROUPS: Record<string, string[]> = {
  coffee_shop: ['coffee_shop', 'coffee', 'cafe'],
  burger: ['burger'],
  pizza: ['pizza'],
  street_food: ['shawarma', 'falafel', 'kebab', 'hummus', 'שווארמה', 'sandwich'],
  sushi: ['sushi', 'japanese'],
  meat: ['meat', 'Meat', 'steak_house', 'grill', 'barbecue'],
};

const EAT_TYPES = new Set(['restaurant', 'cafe', 'coffee_cart']);

/** Exact-match filters only (no text search). */
function matchesExactFilters(place: Place, f: Partial<PlaceFilters>): boolean {
  if (f.eatAll) {
    if (!EAT_TYPES.has(place.type)) return false;
  } else if (f.placeType && place.type !== f.placeType && !place.tags?.includes(f.placeType)) return false;
  if (f.subType !== undefined && f.subType !== null) {
    if (place.subType !== f.subType) return false;
  }
  if (f.cityId && place.cityId !== f.cityId) return false;
  if (f.mehadrinOnly) {
    if (place.kosherLevel !== 'mehadrin') return false;
  }
  if (f.kosherAuthorityGroup) {
    // 'rabbinate' and 'unknown' are group-level matches; everything else is a specific kosherAuthority key.
    const GROUP_LEVEL_KEYS = new Set(['rabbinate', 'unknown', 'badatz', 'independent']);
    if (GROUP_LEVEL_KEYS.has(f.kosherAuthorityGroup)) {
      if (place.kosherAuthorityGroup !== f.kosherAuthorityGroup) return false;
    } else {
      if (place.kosherAuthority !== f.kosherAuthorityGroup) return false;
    }
  }
  if (f.category && place.category !== f.category) return false;
  if (f.cuisineTag) {
    const group = CUISINE_TAG_GROUPS[f.cuisineTag] ?? [f.cuisineTag];
    if (!place.tags?.some((tag) => group.includes(tag))) return false;
  }
  return true;
}

/** Case-insensitive substring match over name + address + city name. */
function matchesSubstring(place: Place, query: string, cities: CityNameLookup): boolean {
  const cityName = cities.get(place.cityId) ?? place.cityId;
  const haystack = `${place.name} ${place.address} ${cityName}`;
  return haystack.toLowerCase().includes(query.trim().toLowerCase());
}

/**
 * Filter places by exact-match filters + full-text search via MiniSearch.
 *
 * When a text query is present, results are returned in relevance order
 * (MiniSearch score, highest first).  When there is no query, original
 * dataset order is preserved.
 */
export function filterPlaces(
  places: Place[],
  f: Partial<PlaceFilters>,
  cities: CityNameLookup = NO_CITIES,
): Place[] {
  const hasQuery = !!f.query?.trim();

  if (hasQuery) {
    const matchedIds = searchPlaces(f.query!);
    if (matchedIds === null) {
      // Index not ready — fall back to legacy substring search
      return places.filter(
        (p) => matchesExactFilters(p, f) && matchesSubstring(p, f.query!, cities),
      );
    }

    // Build a set for O(1) lookup, then filter + sort by score rank
    const idSet = new Set(matchedIds);
    const rankOf = new Map(matchedIds.map((id, i) => [id, i]));

    return places
      .filter((p) => idSet.has(p.id) && matchesExactFilters(p, f))
      .sort((a, b) => (rankOf.get(a.id) ?? Infinity) - (rankOf.get(b.id) ?? Infinity));
  }

  return places.filter((p) => matchesExactFilters(p, f));
}

/** Single-place predicate used by the in-memory mock repository. */
export function matchesFilters(
  place: Place,
  f: Partial<PlaceFilters>,
  cities: CityNameLookup = NO_CITIES,
): boolean {
  if (!matchesExactFilters(place, f)) return false;
  if (f.query?.trim()) return matchesSubstring(place, f.query, cities);
  return true;
}
