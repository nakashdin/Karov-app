import type { PlaceType } from './place';

/**
 * The food catalog — the single source of truth for "which place types are food".
 *
 * This list used to be written out by hand in seven places with FIVE different
 * definitions (filterPlaces had 3 types, WhatsAroundScreen 4, ListScreen and
 * FoodListScreen 7, and a script referenced two types that do not exist at all).
 * The narrowest of those, `EAT_TYPES` in filterPlaces, backed the "הכל" tab — so
 * 302 records that were imported, curated and shipped could not be reached from
 * any filter in the product. Two of them (ice_cream_parlor, juice_bar) are the
 * best-covered categories in the whole dataset.
 *
 * Import from here. Do not re-declare a food list anywhere else: the filter UI
 * is generated from this array, so a new subtype becomes browsable by adding it
 * in one place instead of stranding its records.
 */
export const FOOD_TYPES = [
  'restaurant',
  'fast_food',
  'cafe',
  'coffee_cart',
  'juice_bar',
  'ice_cream_parlor',
  'bakery',
  'winery',
] as const satisfies readonly PlaceType[];

export type FoodType = (typeof FOOD_TYPES)[number];

const FOOD_TYPE_SET: ReadonlySet<string> = new Set<string>(FOOD_TYPES);

/** Is this place type served by the food ("לאכול") section? */
export function isFoodType(type: string | null | undefined): type is FoodType {
  return typeof type === 'string' && FOOD_TYPE_SET.has(type);
}

/**
 * Non-food place types, each its own top-level category.
 * Kept beside FOOD_TYPES so the two together describe the whole catalog.
 */
export const NON_FOOD_TYPES = [
  'synagogue',
  'mikveh',
  'chabad_house',
  'tzaddik_grave',
] as const satisfies readonly PlaceType[];
