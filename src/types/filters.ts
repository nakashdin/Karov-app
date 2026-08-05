import { KosherCategory, PlaceSubType, PlaceType } from './place';

/** Active filtering / search state used to query places. */
export interface PlaceFilters {
  /** Restrict to a kind of place (set from Home shortcuts). */
  placeType: PlaceType | null;
  /** Sub-category within the type (restaurants only). null = show all. */
  subType: PlaceSubType | null;
  cityId: string | null;
  category: KosherCategory | null;
  /** Show only mehadrin places (kosherLevel === 'mehadrin'). */
  mehadrinOnly: boolean;
  /** Filter by kashrut authority group: 'rabbinate' | 'badatz' | 'tzohar' | 'unknown'. */
  kosherAuthorityGroup: string | null;
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
  category: null,
  mehadrinOnly: false,
  kosherAuthorityGroup: null,
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
  if (f.mehadrinOnly) n++;
  if (f.kosherAuthorityGroup) n++;
  if (f.category) n++;
  if (f.cuisineTag) n++;
  if (f.distanceKm !== null && f.distanceKm !== 20) n++;
  return n;
}
