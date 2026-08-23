/**
 * The raw colour values. This file is the ONLY place in the app where a hex
 * literal is allowed to appear (`eslint.config.js` enforces that).
 *
 * A palette entry is a *value* — "this particular green". It says nothing about
 * where the colour is used. Roles live in `tokens.ts`, which is what components
 * consume. Keeping the two apart is what makes a second colour scheme possible:
 * the dark scheme reassigns roles, it does not invent new greens.
 */

/** Brand green. The whole identity hangs off `green600`. */
export const green = {
  900: '#0F3D22',
  800: '#14532D',
  700: '#166534',
  600: '#1E7A46',
  550: '#1B873F',
  500: '#2D6A3F',
  450: '#2E7D52',
  425: '#2E8B57',
  400: '#4CAF50',
  350: '#5A9E72',
  100: '#E7F2EB',
  50: '#F0F5F1',
} as const;

/** Muted sage — the "קרוב ללב" section reads calmer than the rest of the app. */
export const sage = {
  600: '#5D8A6F',
  500: '#5C8B3E',
  100: '#E9F3ED',
  75: '#CFE5D8',
  50: '#EBF5E6',
} as const;

export const violet = {
  700: '#4A2D7A',
  650: '#5B3D8A',
  600: '#7B5EA7',
  550: '#6D4C9F',
  500: '#5B4FCF',
  300: '#9B7EC8',
  200: '#E0D0F5',
  150: '#D9D5F7',
  125: '#D9C8F5',
  100: '#EEE8FB',
  75: '#F0EBF8',
  60: '#F2EEFA',
  55: '#EEECFA',
  50: '#F5F0FF',
  45: '#F0EFFC',
  40: '#EEEDF9',
  35: '#F0EAF8',
  30: '#F0EBF9',
} as const;

export const blue = {
  800: '#1E40AF',
  700: '#1E6A9E',
  600: '#2A6CA8',
  550: '#0277BD',
  500: '#0288D1',
  450: '#2B8CBE',
  150: '#C8DDF8',
  140: '#D0DFFA',
  100: '#E1F5FE',
  90: '#E5F5FD',
  80: '#E6F4FB',
  70: '#E8F1FC',
  65: '#E8F2FB',
  60: '#EBF2FD',
  55: '#EEF4FB',
  50: '#F0F5FF',
} as const;

export const amber = {
  900: '#7A5800',
  800: '#92400E',
  700: '#B45309',
  650: '#B5780A',
  600: '#C98A12',
  550: '#D97706',
  500: '#E8A317',
  450: '#F59E0B',
  400: '#E8C840',
  350: '#FCD34D',
  300: '#FDE68A',
  200: '#FEF3C7',
  150: '#FFF0CC',
  120: '#FFF8E6',
  110: '#FFF8E7',
  100: '#FFF8E8',
} as const;

export const orange = {
  700: '#B5451B',
  650: '#C97A1A',
  600: '#D44A12',
  550: '#EA580C',
  200: '#FFE4C4',
  150: '#FEF3E2',
  120: '#FFF3E0',
  110: '#FFF4E6',
  100: '#FFF5EC',
} as const;

export const red = {
  700: '#B5392C',
  650: '#B03050',
  600: '#C5453F',
  575: '#B13E39',
  550: '#C0394A',
  200: '#FEE2E2',
  150: '#FEE8E2',
  100: '#FEE8EB',
} as const;

export const earth = {
  700: '#7A5C2E',
  600: '#7D1E3D',
  500: '#C8A752',
  100: '#F5EFE6',
  90: '#F5EEEA',
  80: '#F5F0E8',
} as const;

export const pink = {
  100: '#F8EAF0',
  50: '#FCF3FB',
} as const;

export const mint = {
  100: '#DCFCE7',
  75: '#E8F5E9',
  70: '#E8F5EE',
  65: '#E8F4EE',
} as const;

/** Greys. `grey0`/`grey1000` are pure white/black — deliberately not "surface". */
export const neutral = {
  1000: '#000000',
  950: '#1A1A1A',
  900: '#17211B',
  800: '#374151',
  600: '#5E6B63',
  450: '#8B8B8E',
  400: '#AEAEB2',
  300: '#E5E5EA',
  200: '#EBEBF0',
  150: '#F2F2F7',
  100: '#F5F5F7',
  0: '#FFFFFF',
} as const;

/**
 * Dark-scheme surfaces.
 *
 * Not pure black: an OLED-black canvas makes elevation impossible to express
 * and produces visible smearing when scrolling long lists. These are neutral
 * greys with a faint green cast so the brand still reads in dark mode.
 */
export const dark = {
  canvas: '#101512',
  surface: '#181E1A',
  surfaceRaised: '#212823',
  surfaceMuted: '#252D28',
  border: '#333C36',
  borderStrong: '#43504A',
  text: '#E8EDEA',
  textMuted: '#A0ADA6',
  textFaint: '#6E7A74',
} as const;

/**
 * Third-party brand marks. These are NOT theme tokens and must never be
 * recoloured for dark mode — a Waze button that is not Waze blue is a bug, and
 * several of these brands' guidelines require the exact value.
 */
export const brand = {
  facebook: '#1877F2',
  telegram: '#229ED9',
  whatsapp: '#25D366',
  google: '#EA4335',
  googleMaps: '#4285F4',
  waze: '#33CCFF',
  /** The real Apple Maps app-icon background, not a theme-following black. */
  appleMaps: '#000000',
} as const;

/**
 * The home-screen day/night illustration. This is one drawing with two
 * hand-painted palettes, and it predates dark mode — `isNight` is driven by the
 * halachic clock, not by the colour scheme, so these stay independent.
 */
export const illustration = {
  day: {
    sky: '#FFF0CC',
    skyShabbat: '#F5F0E8',
    building: '#C9A96E',
    buildingShade: '#B08040',
    dome: '#D4A843',
    ground: '#A67C52',
    sun: '#FFB800',
    star: '#E8A317',
    tree: '#2D6A3F',
    sand: '#F5DEB3',
  },
  night: {
    sky: '#1A2744',
    building: '#2A3A5C',
    buildingShade: '#1E2D4A',
    dome: '#3A4E70',
    ground: '#0F1A30',
    moon: '#D4D0C0',
    star: '#FFD700',
    tree: '#1A3A2A',
  },
  glow: '#FFDC64',
} as const;

/** Map tiles and markers are rendered inside a WebView, outside the RN tree. */
export const map = {
  clusterAccent: '#2B8CBE',
  markerLabel: '#FFFFFF',
} as const;

export const violetAccent = '#7C3AED';
