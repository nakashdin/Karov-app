import { KosherCategory, KosherType, PlaceSubType, PlaceType } from './place';

/** Active filtering / search state used to query places. */
export interface PlaceFilters {
  /** Restrict to a kind of place (set from Home shortcuts). */
  placeType: PlaceType | null;
  /** Sub-category within the type (restaurants only). null = show all. */
  subType: PlaceSubType | null;
  cityId: string | null;
  kosherType: KosherType | null;
  category: KosherCategory | null;
  /** Free-text search over name + address + city. */
  query: string;
  /** Filter restaurants by cuisine tag (e.g. 'burger', 'pizza'). */
  cuisineTag: string | null;
  /** Show all eat-type places (restaurant + cafe + coffee_cart) together. */
  eatAll: boolean;
  /** Max distance in km from user location. null = no limit. */
  distanceKm: number | null;
}

export const emptyFilters: PlaceFilters = {
  placeType: null,
  subType: null,
  cityId: null,
  kosherType: null,
  category: null,
  query: '',
  cuisineTag: null,
  eatAll: false,
  distanceKm: 20,
};

/**
 * Number of user-facing filters currently active (for the filter badge).
 * `placeType` is excluded — it's a contextual mode set from Home, not a
 * filter the user toggles inside the filter sheet.
 */
export function countActiveFilters(f: PlaceFilters): number {
  let n = 0;
  if (f.cityId) n++;
  if (f.kosherType) n++;
  if (f.category) n++;
  if (f.cuisineTag) n++;
  if (f.distanceKm !== null && f.distanceKm !== 20) n++;
  return n;
}
