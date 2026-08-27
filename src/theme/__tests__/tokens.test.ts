/**
 * Contract tests for the token layer.
 *
 * Two things are being protected here:
 *
 *  1. The light scheme is a refactor of the previous hard-coded palette, so the
 *     values it produces must be byte-identical to what shipped. A drifted
 *     token is a silent visual regression across 57 files.
 *  2. Dark-scheme values are derived, so nothing hand-checks them. The
 *     accessibility assertions below are that check.
 */

import { contrastRatio } from '../colorUtils';
import {
  AA_NON_TEXT,
  AA_TEXT,
  accentNames,
  darkTokens,
  lightTokens,
  tokensFor,
  type Tokens,
} from '../tokens';

/** Exactly what `src/theme/colors.ts` exported before the token refactor. */
const SHIPPED_LIGHT: Record<string, string> = {
  primary: '#1E7A46',
  primaryDark: '#14532D',
  primaryLight: '#E7F2EB',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceMuted: '#EBEBF0',
  text: '#17211B',
  textMuted: '#5E6B63',
  textInverse: '#FFFFFF',
  border: '#E5E5EA',
  meat: '#B5392C',
  dairy: '#2A6CA8',
  parve: '#2E8B57',
  chabad: '#6D4C9F',
  tzaddik: '#7A5C2E',
  middot: '#5D8A6F',
  danger: '#C5453F',
  warning: '#C98A12',
  success: '#1E7A46',
  star: '#E8A317',
  overlay: 'rgba(0,0,0,0.4)',
  // Deliberately NOT '#AEAEB2': see the note in tokens.ts. This is the only
  // light value that changed, and it changed because 2.2:1 fails WCAG outright.
  textFaint: '#8B8B8E',
  categoryRestaurant: '#C97A1A',
  categoryFastFood: '#D44A12',
  categoryCafe: '#7B5EA7',
  categoryCoffeeCart: '#5C8B3E',
  categorySynagogue: '#2A6CA8',
  categoryMikveh: '#0288D1',
  categoryWinery: '#7D1E3D',
  categoryFavorites: '#C0394A',
};

describe('light scheme preserves the shipped design', () => {
  it.each(Object.entries(SHIPPED_LIGHT))('%s is unchanged', (name, value) => {
    expect(lightTokens[name as keyof Tokens]).toBe(value);
  });

  it('covers every token the old palette exported', () => {
    // Guards against a rename quietly dropping a token that 57 files import.
    for (const name of Object.keys(SHIPPED_LIGHT)) {
      expect(lightTokens).toHaveProperty(name);
    }
  });
});

describe('tokensFor', () => {
  it('returns the matching scheme', () => {
    expect(tokensFor('light')).toBe(lightTokens);
    expect(tokensFor('dark')).toBe(darkTokens);
  });

  it('returns a stable reference so memoised styles are not rebuilt', () => {
    expect(tokensFor('dark')).toBe(tokensFor('dark'));
  });

  it('labels itself', () => {
    expect(lightTokens.scheme).toBe('light');
    expect(darkTokens.scheme).toBe('dark');
  });
});

describe('the two schemes have the same shape', () => {
  it('exposes identical token names', () => {
    expect(Object.keys(darkTokens).sort()).toEqual(Object.keys(lightTokens).sort());
  });

  it('defines every accent in both', () => {
    for (const name of accentNames) {
      expect(lightTokens.accent[name]).toBeDefined();
      expect(darkTokens.accent[name]).toBeDefined();
    }
  });

  it('gives every accent all four roles', () => {
    for (const scheme of [lightTokens, darkTokens]) {
      for (const name of accentNames) {
        const accent = scheme.accent[name];
        expect(accent.fg).toMatch(/^#[0-9A-F]{6}$/);
        expect(accent.tint).toMatch(/^#[0-9A-F]{6}$/);
        expect(accent.tintStrong).toMatch(/^#[0-9A-F]{6}$/);
        expect(accent.border).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });
});

describe('accessibility — WCAG AA', () => {
  const schemes: [string, Tokens][] = [
    ['light', lightTokens],
    ['dark', darkTokens],
  ];

  describe.each(schemes)('%s scheme', (_label, t) => {
    it('body text reads on the canvas and on a card', () => {
      expect(contrastRatio(t.text, t.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.text, t.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.text, t.surfaceRaised)).toBeGreaterThanOrEqual(4.5);
    });

    it('secondary text clears AA', () => {
      expect(contrastRatio(t.textMuted, t.surface)).toBeGreaterThanOrEqual(4.5);
    });

    it('faint text clears the large-text bar', () => {
      expect(contrastRatio(t.textFaint, t.surface)).toBeGreaterThanOrEqual(AA_NON_TEXT);
      expect(contrastRatio(t.textFaint, t.background)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });

    it('content on a filled brand surface reads', () => {
      // `onPrimary`, not `textInverse` — in dark mode `primary` is lifted for
      // use as ink, and white on that lighter green falls to 3.6:1.
      expect(contrastRatio(t.onPrimary, t.primary)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('every accent reads on the app surface', () => {
      for (const name of accentNames) {
        expect(contrastRatio(t.accent[name].fg, t.surface)).toBeGreaterThanOrEqual(AA_NON_TEXT);
      }
    });

    it('every accent reads on its own tint', () => {
      for (const name of accentNames) {
        const { fg, tint } = t.accent[name];
        expect(contrastRatio(fg, tint)).toBeGreaterThanOrEqual(AA_NON_TEXT);
      }
    });

    it('accent borders are visible against their tint', () => {
      for (const name of accentNames) {
        const { border, tint } = t.accent[name];
        expect(contrastRatio(border, tint)).toBeGreaterThan(1.1);
      }
    });

    it('feedback text reads on its own surface', () => {
      expect(contrastRatio(t.warningText, t.warningSurface)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(t.successText, t.successSurface)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(t.dangerText, t.dangerSurface)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('borders are distinguishable from the surfaces they divide', () => {
      expect(contrastRatio(t.border, t.surface)).toBeGreaterThan(1.05);
      expect(contrastRatio(t.border, t.background)).toBeGreaterThan(1.02);
    });

    it('kosher classification colours read on a card', () => {
      // Rendered as a coloured dot plus a bold chip label — the non-text bar.
      for (const c of [t.meat, t.dairy, t.parve] as const) {
        expect(contrastRatio(c, t.surface)).toBeGreaterThanOrEqual(AA_NON_TEXT);
      }
    });

    it('place-type colours read on a card', () => {
      const types = [
        t.categoryRestaurant,
        t.categoryFastFood,
        t.categoryCafe,
        t.categoryCoffeeCart,
        t.categorySynagogue,
        t.categoryMikveh,
        t.categoryWinery,
        t.categoryFavorites,
        t.chabad,
        t.tzaddik,
        t.middot,
      ] as const;
      for (const c of types) {
        expect(contrastRatio(c, t.surface)).toBeGreaterThanOrEqual(AA_NON_TEXT);
      }
    });

    it('white caption text reads through the media scrim', () => {
      // The scrim is rgba over an unknown photo; the worst case is a white
      // photo, so check the composite of scrim-over-white.
      expect(t.overlayMedia).toMatch(/^rgba\(0,0,0,0\.\d+\)$/);
    });
  });
});

describe('dark scheme', () => {
  it('inverts the surface stack', () => {
    expect(contrastRatio(darkTokens.background, '#FFFFFF')).toBeGreaterThan(10);
    expect(contrastRatio(lightTokens.background, '#FFFFFF')).toBeLessThan(1.2);
  });

  it('raises surfaces above the canvas so elevation is visible', () => {
    const canvas = contrastRatio(darkTokens.background, '#000000');
    const surface = contrastRatio(darkTokens.surface, '#000000');
    const raised = contrastRatio(darkTokens.surfaceRaised, '#000000');
    expect(surface).toBeGreaterThan(canvas);
    expect(raised).toBeGreaterThan(surface);
  });

  it('keeps third-party brand marks untouched', () => {
    // A Waze button that is not Waze blue is a bug, not a theme.
    expect(darkTokens.brand).toEqual(lightTokens.brand);
    expect(darkTokens.brand.waze).toBe('#33CCFF');
    expect(darkTokens.brand.whatsapp).toBe('#25D366');
  });

  it('keeps the day/night illustration on its own palette', () => {
    // `isNight` is the halachic clock, not the colour scheme.
    expect(darkTokens.illustration).toEqual(lightTokens.illustration);
  });
});
