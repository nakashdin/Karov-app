/**
 * Semantic colour tokens — what components actually consume.
 *
 * A token names a *role* ("the surface a card sits on"), never a value. That is
 * what lets one component definition render correctly in both schemes.
 *
 * ── Why light is authored and dark is derived ────────────────────────────────
 * The light scheme reproduces the existing design byte for byte. Those values
 * were chosen deliberately over months and this file is a refactor, not a
 * redesign — any drift here is a visual regression.
 *
 * The dark scheme has no such history, so it is computed. Accents are lightened
 * only as far as WCAG AA demands against the dark surface, and their tints are
 * the accent washed over that surface. Deriving keeps the two schemes in step:
 * add a category tomorrow and its dark treatment already exists.
 */

import { alpha, contrastRatio, ensureContrast, mix } from './colorUtils';
import {
  amber,
  blue,
  brand,
  dark,
  earth,
  green,
  illustration,
  map,
  mint,
  neutral,
  orange,
  pink,
  red,
  sage,
  violet,
  violetAccent as violetAccentValue,
} from './palette';

export type ColorScheme = 'light' | 'dark';

/**
 * A decorative accent and the surfaces built from it.
 *
 * `fg`          icon / label colour
 * `tint`        the card or chip background
 * `tintStrong`  a badge sitting on top of `tint`
 * `border`      hairline that still reads against `tint`
 */
export interface AccentToken {
  readonly fg: string;
  readonly tint: string;
  readonly tintStrong: string;
  readonly border: string;
}

export type AccentName =
  | 'violet'
  | 'indigo'
  | 'blue'
  | 'steel'
  | 'sky'
  | 'cyan'
  | 'green'
  | 'emerald'
  | 'sage'
  | 'olive'
  | 'earth'
  | 'gold'
  | 'orange'
  | 'flame'
  | 'berry'
  | 'plum'
  | 'rose'
  | 'chabad';

/**
 * Authored light values. `tintStrong` is only listed where the design already
 * had one; the rest are derived so a new accent needs two values, not four.
 */
const LIGHT_ACCENTS: Record<AccentName, { fg: string; tint: string; tintStrong?: string }> = {
  violet: { fg: violet[600], tint: violet[60], tintStrong: violet[100] },
  indigo: { fg: violet[500], tint: violet[40], tintStrong: violet[150] },
  blue: { fg: blue[600], tint: blue[70], tintStrong: blue[150] },
  steel: { fg: blue[700], tint: blue[65] },
  sky: { fg: blue[500], tint: blue[90] },
  cyan: { fg: blue[550], tint: blue[100] },
  green: { fg: green[600], tint: green[100], tintStrong: sage[75] },
  emerald: { fg: green[450], tint: mint[65] },
  sage: { fg: sage[600], tint: sage[100], tintStrong: sage[75] },
  olive: { fg: sage[500], tint: sage[50] },
  earth: { fg: earth[700], tint: earth[90] },
  gold: { fg: amber[650], tint: amber[110] },
  orange: { fg: orange[650], tint: orange[120], tintStrong: orange[200] },
  flame: { fg: orange[600], tint: red[150] },
  berry: { fg: red[650], tint: red[100] },
  plum: { fg: earth[600], tint: pink[100] },
  rose: { fg: red[550], tint: red[100] },
  chabad: { fg: violet[550], tint: violet[75] },
};

const ACCENT_NAMES = Object.keys(LIGHT_ACCENTS) as AccentName[];

/** How far an accent is washed over the dark surface, per role. */
const DARK_WASH = { tint: 0.14, tintStrong: 0.24, border: 0.34 } as const;

/**
 * WCAG 2.1 bars, by what the colour is actually doing.
 *
 * `AA_TEXT` is the 4.5:1 bar for body copy. `AA_NON_TEXT` is the 3:1 bar that
 * applies to icons, graphical objects and large text (≥18pt, or ≥14pt bold) —
 * which is every place a category accent appears. Holding a 20px category icon
 * to the body-copy bar would force the whole palette darker for no gain to any
 * reader.
 */
export const AA_TEXT = 4.5;
export const AA_NON_TEXT = 3;

function buildAccents(scheme: ColorScheme): Record<AccentName, AccentToken> {
  const out = {} as Record<AccentName, AccentToken>;

  for (const name of ACCENT_NAMES) {
    const { fg, tint, tintStrong } = LIGHT_ACCENTS[name];

    if (scheme === 'light') {
      out[name] = {
        fg,
        tint,
        tintStrong: tintStrong ?? mix(tint, fg, 0.18),
        border: mix(tint, fg, 0.28),
      };
      continue;
    }

    // Two passes. The dark tint is a wash of the accent itself, so lifting the
    // accent also lifts the surface it has to read against — a single pass
    // against `dark.surface` lands short once the tint is applied. Deriving the
    // tint first, then re-checking the accent against it, converges.
    const lifted = ensureContrast(fg, dark.surface, AA_NON_TEXT);
    const darkTint = mix(dark.surface, lifted, DARK_WASH.tint);
    const darkFg = ensureContrast(lifted, darkTint, AA_NON_TEXT);

    out[name] = {
      fg: darkFg,
      tint: darkTint,
      tintStrong: mix(dark.surface, lifted, DARK_WASH.tintStrong),
      border: mix(dark.surface, lifted, DARK_WASH.border),
    };
  }

  return out;
}

export interface Tokens {
  readonly scheme: ColorScheme;

  // ── Brand ──────────────────────────────────────────────────────────────────
  readonly primary: string;
  readonly primaryDark: string;
  readonly primaryLight: string;
  /** Deepest brand green — splash and login backdrops. */
  readonly primaryDeep: string;
  /** Lifted brand green for pressed/active states on a dark backdrop. */
  readonly primarySoft: string;

  // ── Surfaces ───────────────────────────────────────────────────────────────
  readonly background: string;
  readonly surface: string;
  /** A card lifted above `surface` — modals, sheets, sticky headers. */
  readonly surfaceRaised: string;
  readonly surfaceMuted: string;

  // ── Text ───────────────────────────────────────────────────────────────────
  readonly text: string;
  readonly textMuted: string;
  readonly textFaint: string;
  /** White. The colour of text drawn over a photo or a dark scrim. */
  readonly textInverse: string;
  /**
   * Text and icons sitting on a `primary` fill.
   *
   * Not the same thing as `textInverse`. In the dark scheme `primary` is
   * lightened so it reads as ink on a dark canvas, and white text on that
   * lighter green drops to 3.6:1 — so this token flips to dark ink instead.
   * It is derived from `primary`, so it can never fall out of step with it.
   */
  readonly onPrimary: string;

  // ── Lines ──────────────────────────────────────────────────────────────────
  readonly border: string;
  readonly borderStrong: string;

  // ── Kosher classification ──────────────────────────────────────────────────
  readonly meat: string;
  readonly dairy: string;
  readonly parve: string;

  // ── Place types ────────────────────────────────────────────────────────────
  readonly chabad: string;
  readonly tzaddik: string;
  /** מידות tracker — a content domain colour, not one of the 18 decorative accents. */
  readonly middot: string;
  readonly categoryRestaurant: string;
  readonly categoryFastFood: string;
  readonly categoryCafe: string;
  readonly categoryCoffeeCart: string;
  readonly categorySynagogue: string;
  readonly categoryMikveh: string;
  readonly categoryWinery: string;
  readonly categoryFavorites: string;
  /** "מסעדת שף" sub-type badge — a step darker than the restaurant category. */
  readonly categoryChefRestaurant: string;

  // ── Feedback ───────────────────────────────────────────────────────────────
  readonly danger: string;
  readonly dangerSurface: string;
  /** Error copy on `dangerSurface`. `danger` itself only clears 4:1 there. */
  readonly dangerText: string;
  readonly warning: string;
  readonly warningSurface: string;
  readonly warningBorder: string;
  readonly warningText: string;
  readonly success: string;
  readonly successSurface: string;
  readonly successText: string;
  readonly info: string;
  readonly infoText: string;
  readonly star: string;
  readonly gold: string;
  /** Kashrut badge for a בד״ץ / מהדרין certification — a step above `success`. */
  readonly kosherPremium: string;

  // ── Scrims ─────────────────────────────────────────────────────────────────
  /** Standard modal backdrop. */
  readonly overlay: string;
  readonly overlaySoft: string;
  readonly overlayStrong: string;
  /** Gradient scrim that keeps caption text legible over a photo. */
  readonly overlayMedia: string;
  /** A highlight lifted off a dark backdrop. */
  readonly overlayLight: string;
  readonly overlayLightSoft: string;

  /**
   * A saturated selected-state pair for segmented controls / tab pickers —
   * bolder than any `accent.*.tint`, which is designed to sit quietly behind
   * body text. Not tied to a category, so it stays violet in both schemes.
   */
  readonly selectionTint: string;
  readonly selectionBorder: string;

  readonly accent: Record<AccentName, AccentToken>;

  /**
   * Time-of-day icon colours for the זמנים list — a natural progression
   * (dawn → midday → sunset → night), not tied to any category.
   */
  readonly zmanim: {
    readonly dawn: string;
    readonly midday: string;
    readonly sunset: string;
    readonly night: string;
  };

  /** Fixed values that must survive a scheme change untouched. */
  readonly brand: typeof brand;
  readonly illustration: typeof illustration;
  readonly map: typeof map;
}

/**
 * Ink for content on a filled surface: whichever of white or near-black reads
 * better on it. Derived rather than declared so a change to the fill can never
 * leave illegible text behind.
 */
function inkOn(fill: string): string {
  return contrastRatio(neutral[0], fill) >= contrastRatio(neutral[900], fill)
    ? neutral[0]
    : neutral[900];
}

function buildLight(): Tokens {
  return {
    scheme: 'light',

    primary: green[600],
    primaryDark: green[800],
    primaryLight: green[100],
    primaryDeep: green[900],
    primarySoft: green[350],

    background: neutral[150],
    surface: neutral[0],
    surfaceRaised: neutral[0],
    surfaceMuted: neutral[200],

    text: neutral[900],
    textMuted: neutral[600],
    // Was `#AEAEB2`, which reads at 2.2:1 on white — below the 3:1 floor for
    // even large text. Darkened by the smallest step that clears it on both
    // the card and the canvas. This is the one deliberate change to the
    // shipped light palette.
    textFaint: neutral[450],
    textInverse: neutral[0],
    onPrimary: inkOn(green[600]),

    border: neutral[300],
    borderStrong: neutral[200],

    meat: red[700],
    dairy: blue[600],
    parve: green[425],

    chabad: violet[550],
    tzaddik: earth[700],
    middot: sage[600],
    categoryRestaurant: orange[650],
    categoryFastFood: orange[600],
    categoryCafe: violet[600],
    categoryCoffeeCart: sage[500],
    categorySynagogue: blue[600],
    categoryMikveh: blue[500],
    categoryWinery: earth[600],
    categoryFavorites: red[550],
    categoryChefRestaurant: orange[700],

    danger: red[600],
    dangerSurface: red[200],
    dangerText: red[575],
    warning: amber[600],
    warningSurface: amber[200],
    warningBorder: amber[350],
    warningText: amber[800],
    success: green[600],
    successSurface: mint[100],
    successText: green[700],
    info: blue[800],
    infoText: blue[800],
    star: amber[500],
    gold: earth[500],
    kosherPremium: green[700],

    overlay: alpha(neutral[1000], 0.4),
    overlaySoft: alpha(neutral[1000], 0.25),
    overlayStrong: alpha(neutral[1000], 0.55),
    overlayMedia: alpha(neutral[1000], 0.52),
    overlayLight: alpha(neutral[0], 0.55),
    overlayLightSoft: alpha(neutral[0], 0.15),

    selectionTint: violet[200],
    selectionBorder: violet[300],

    accent: buildAccents('light'),
    zmanim: {
      dawn: amber[450],
      midday: amber[550],
      sunset: orange[550],
      night: violetAccentValue,
    },
    brand,
    illustration,
    map,
  };
}

function buildDark(): Tokens {
  const surface = dark.surface;
  // The brand green reads at 3.6:1 on the dark surface — fine for a filled
  // button, too weak for a link or an active tab label. `primary` carries both
  // roles across the app, so it is lifted to the text bar and `onPrimary`
  // absorbs the consequence.
  const primary = ensureContrast(green[600], surface, AA_TEXT);
  const dangerSurface = mix(surface, red[600], 0.2);
  const warningSurface = mix(surface, amber[500], 0.18);
  const successSurface = mix(surface, green[400], 0.18);

  return {
    scheme: 'dark',

    primary,
    primaryDark: green[900],
    primaryLight: mix(surface, primary, 0.16),
    primaryDeep: green[900],
    primarySoft: green[350],

    background: dark.canvas,
    surface,
    surfaceRaised: dark.surfaceRaised,
    surfaceMuted: dark.surfaceMuted,

    text: dark.text,
    textMuted: dark.textMuted,
    textFaint: dark.textFaint,
    // Still white: it sits on photos and scrims, which are dark either way.
    textInverse: neutral[0],
    onPrimary: inkOn(primary),

    border: dark.border,
    borderStrong: dark.borderStrong,

    meat: ensureContrast(red[700], surface, AA_NON_TEXT),
    dairy: ensureContrast(blue[600], surface, AA_NON_TEXT),
    parve: ensureContrast(green[425], surface, AA_NON_TEXT),

    chabad: ensureContrast(violet[550], surface, AA_NON_TEXT),
    tzaddik: ensureContrast(earth[700], surface, AA_NON_TEXT),
    middot: ensureContrast(sage[600], surface, AA_NON_TEXT),
    categoryRestaurant: ensureContrast(orange[650], surface, AA_NON_TEXT),
    categoryFastFood: ensureContrast(orange[600], surface, AA_NON_TEXT),
    categoryCafe: ensureContrast(violet[600], surface, AA_NON_TEXT),
    categoryCoffeeCart: ensureContrast(sage[500], surface, AA_NON_TEXT),
    categorySynagogue: ensureContrast(blue[600], surface, AA_NON_TEXT),
    categoryMikveh: ensureContrast(blue[500], surface, AA_NON_TEXT),
    categoryWinery: ensureContrast(earth[600], surface, AA_NON_TEXT),
    categoryFavorites: ensureContrast(red[550], surface, AA_NON_TEXT),
    categoryChefRestaurant: ensureContrast(orange[700], surface, AA_NON_TEXT),

    danger: ensureContrast(red[600], surface, AA_NON_TEXT),
    dangerSurface: dangerSurface,
    dangerText: ensureContrast(red[600], dangerSurface, AA_TEXT),
    warning: ensureContrast(amber[600], surface, AA_NON_TEXT),
    warningSurface: warningSurface,
    warningBorder: mix(surface, amber[500], 0.36),
    warningText: ensureContrast(amber[350], warningSurface, AA_TEXT),
    success: ensureContrast(green[600], surface, AA_NON_TEXT),
    successSurface: successSurface,
    successText: ensureContrast(green[400], successSurface, AA_TEXT),
    info: ensureContrast(blue[500], surface, AA_TEXT),
    infoText: ensureContrast(blue[500], surface, AA_TEXT),
    star: amber[500],
    gold: earth[500],
    kosherPremium: ensureContrast(green[700], surface, AA_NON_TEXT),

    // Scrims sit over photos and modals, which are dark-on-dark either way.
    overlay: alpha(neutral[1000], 0.6),
    overlaySoft: alpha(neutral[1000], 0.4),
    overlayStrong: alpha(neutral[1000], 0.7),
    overlayMedia: alpha(neutral[1000], 0.6),
    overlayLight: alpha(neutral[0], 0.2),
    overlayLightSoft: alpha(neutral[0], 0.08),

    selectionTint: mix(surface, ensureContrast(violet[600], surface, AA_NON_TEXT), 0.3),
    selectionBorder: ensureContrast(violet[600], surface, AA_NON_TEXT),

    accent: buildAccents('dark'),
    zmanim: {
      dawn: ensureContrast(amber[450], surface, AA_NON_TEXT),
      midday: ensureContrast(amber[550], surface, AA_NON_TEXT),
      sunset: ensureContrast(orange[550], surface, AA_NON_TEXT),
      night: ensureContrast(violetAccentValue, surface, AA_NON_TEXT),
    },
    brand,
    illustration,
    map,
  };
}

const LIGHT = Object.freeze(buildLight());
const DARK = Object.freeze(buildDark());

export const lightTokens = LIGHT;
export const darkTokens = DARK;

export function tokensFor(scheme: ColorScheme): Tokens {
  return scheme === 'dark' ? DARK : LIGHT;
}

/** Exposed for the accessibility test, which asserts AA on every scheme. */
export const accentNames = ACCENT_NAMES;
export { contrastRatio };
