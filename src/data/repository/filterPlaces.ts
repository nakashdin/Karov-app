import { Place, PlaceFilters } from '../../types';
import { CITIES_SEED } from '../seed/cities.seed';
import { searchPlaces } from '../search/searchEngine';

/** Map of cityId -> city name, for search-by-city. */
const CITY_NAME_BY_ID: Record<string, string> = Object.fromEntries(
  CITIES_SEED.map((c) => [c.id, c.name]),
);

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

/**
 * Filter places by exact-match filters + full-text search via MiniSearch.
 *
 * When a text query is present, results are returned in relevance order
 * (MiniSearch score, highest first).  When there is no query, original
 * dataset order is preserved.
 */
export function filterPlaces(places: Place[], f: Partial<PlaceFilters>): Place[] {
  const hasQuery = !!f.query?.trim();

  if (hasQuery) {
    const matchedIds = searchPlaces(f.query!);
    if (matchedIds === null) {
      // Index not ready — fall back to legacy substring search
      return places.filter((p) => {
        if (!matchesExactFilters(p, f)) return false;
        const cityName = CITY_NAME_BY_ID[p.cityId] ?? p.cityId;
        const haystack = `${p.name} ${p.address} ${cityName}`;
        return haystack.toLowerCase().includes(f.query!.trim().toLowerCase());
      });
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

/** Legacy single-place predicate kept for backward compatibility (MockPlacesRepository). */
export function matchesFilters(place: Place, f: Partial<PlaceFilters>): boolean {
  if (!matchesExactFilters(place, f)) return false;

  if (f.query?.trim()) {
    const cityName = CITY_NAME_BY_ID[place.cityId] ?? place.cityId;
    const haystack = `${place.name} ${place.address} ${cityName}`;
    return haystack.toLowerCase().includes(f.query.trim().toLowerCase());
  }
  return true;
}
