/**
 * Central color palette. Keep all raw color values here so the whole app
 * can be re-themed from a single place.
 */
export const colors = {
  // Brand — calm, trustworthy kosher green
  primary: '#1E7A46',
  primaryDark: '#14532D',
  primaryLight: '#E7F2EB',

  // Surfaces — clean neutral (Apple-inspired, no green cast)
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceMuted: '#EBEBF0',

  // Text — deep warm near-black for high readability in sunlight
  text: '#17211B',
  textMuted: '#5E6B63',
  textInverse: '#FFFFFF',

  // Borders / dividers
  border: '#E5E5EA',

  // Kosher category colors (meat / dairy / parve)
  meat: '#B5392C',
  dairy: '#2A6CA8',
  parve: '#2E8B57',

  // Chabad house — distinct muted violet (≠ synagogue green, mikveh blue, restaurant reds/greens)
  chabad: '#6D4C9F',

  // Tzaddik graves — warm earthy gold, distinct from all other types
  tzaddik: '#7A5C2E',

  // Feedback
  danger: '#C5453F',
  warning: '#C98A12',
  success: '#1E7A46',

  // Misc
  star: '#E8A317',
  overlay: 'rgba(0,0,0,0.4)',

  // Very-secondary / decorative text (בס״ד, greeting label)
  textFaint: '#AEAEB2',

  // Category icon accent colors — shortcut grid + PlaceCard type indicator
  categoryRestaurant: '#C97A1A',
  categoryFastFood: '#D44A12',
  categoryCafe: '#7B5EA7',
  categoryCoffeeCart: '#5C8B3E',
  categorySynagogue: '#2A6CA8',
  categoryMikveh: '#0288D1',
  categoryWinery: '#7D1E3D',
  categoryFavorites: '#C0394A',
} as const;

export type ColorName = keyof typeof colors;
