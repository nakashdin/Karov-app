import { KosherCategory, KosherType, PlaceType } from './place';

/** Active filtering / search state used to query places. */
export interface PlaceFilters {
  /** Restrict to a kind of place (set from Home shortcuts). */
  placeType: PlaceType | null;
  cityId: string | null;
  kosherType: KosherType | null;
  category: KosherCategory | null;
  /** Free-text search over name + address + city. */
  query: string;
  /** Filter restaurants by cuisine tag (e.g. 'burger', 'pizza'). */
  cuisineTag: string | null;
}

export const emptyFilters: PlaceFilters = {
  placeType: null,
  cityId: null,
  kosherType: null,
  category: null,
  query: '',
  cuisineTag: null,
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
  return n;
}
