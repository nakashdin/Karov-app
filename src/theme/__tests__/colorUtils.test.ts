import {
  alpha,
  contrastRatio,
  ensureContrast,
  hexToRgb,
  isDark,
  mix,
  relativeLuminance,
  rgbToHex,
} from '../colorUtils';

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#1E7A46')).toEqual([30, 122, 70]);
  });

  it('is case insensitive', () => {
    expect(hexToRgb('#1e7a46')).toEqual(hexToRgb('#1E7A46'));
  });

  it('expands 3-digit shorthand', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#f00')).toEqual([255, 0, 0]);
  });

  it('drops the alpha channel from 8-digit hex', () => {
    // `#5D8A6F40` appears in KarovLevScreen — the RGB half must survive.
    expect(hexToRgb('#5D8A6F40')).toEqual(hexToRgb('#5D8A6F'));
  });

  it('accepts a value without the leading hash', () => {
    expect(hexToRgb('1E7A46')).toEqual([30, 122, 70]);
  });

  it('rejects anything that is not a colour', () => {
    expect(() => hexToRgb('rgb(1,2,3)')).toThrow(/Not a hex colour/);
    expect(() => hexToRgb('#12345')).toThrow(/Not a hex colour/);
    expect(() => hexToRgb('')).toThrow(/Not a hex colour/);
  });
});

describe('rgbToHex', () => {
  it('round-trips', () => {
    expect(rgbToHex(hexToRgb('#1E7A46'))).toBe('#1E7A46');
  });

  it('pads single-digit channels', () => {
    expect(rgbToHex([0, 1, 2])).toBe('#000102');
  });

  it('clamps out-of-range channels rather than wrapping', () => {
    expect(rgbToHex([-40, 300, 128])).toBe('#00FF80');
  });
});

describe('mix', () => {
  it('returns the endpoints untouched', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
  });

  it('blends linearly', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('clamps amounts outside 0..1', () => {
    expect(mix('#000000', '#FFFFFF', -3)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 42)).toBe('#FFFFFF');
  });

  it('reproduces the authored category tints to within a perceptual hair', () => {
    // The light tints are authored, not derived — this guards the claim in
    // tokens.ts that they sit at roughly a 90% white mix, so a future tint
    // added by formula lands in the same family.
    const fitted = hexToRgb(mix('#7B5EA7', '#FFFFFF', 0.9));
    const authored = hexToRgb('#F2EEFA');
    fitted.forEach((channel, i) => {
      expect(Math.abs(channel - authored[i])).toBeLessThanOrEqual(10);
    });
  });
});

describe('alpha', () => {
  it('produces an rgba string React Native accepts', () => {
    expect(alpha('#000000', 0.4)).toBe('rgba(0,0,0,0.4)');
    expect(alpha('#5D8A6F', 0.06)).toBe('rgba(93,138,111,0.06)');
  });

  it('clamps opacity', () => {
    expect(alpha('#FFFFFF', 5)).toBe('rgba(255,255,255,1)');
    expect(alpha('#FFFFFF', -1)).toBe('rgba(255,255,255,0)');
  });
});

describe('relativeLuminance', () => {
  it('anchors at black and white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('weights green above red above blue', () => {
    expect(relativeLuminance('#00FF00')).toBeGreaterThan(relativeLuminance('#FF0000'));
    expect(relativeLuminance('#FF0000')).toBeGreaterThan(relativeLuminance('#0000FF'));
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('is 1 for a colour against itself', () => {
    expect(contrastRatio('#1E7A46', '#1E7A46')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#1E7A46', '#FFFFFF')).toBeCloseTo(
      contrastRatio('#FFFFFF', '#1E7A46'),
      10,
    );
  });
});

describe('isDark', () => {
  it('classifies the scheme surfaces correctly', () => {
    expect(isDark('#181E1A')).toBe(true);
    expect(isDark('#FFFFFF')).toBe(false);
    expect(isDark('#F2F2F7')).toBe(false);
  });
});

describe('ensureContrast', () => {
  it('leaves a colour alone when it already passes', () => {
    expect(ensureContrast('#000000', '#FFFFFF', 4.5)).toBe('#000000');
  });

  it('lifts an accent that fails against a dark surface', () => {
    const surface = '#181E1A';
    expect(contrastRatio('#7B5EA7', surface)).toBeLessThan(4.5);

    const lifted = ensureContrast('#7B5EA7', surface, 4.5);
    expect(contrastRatio(lifted, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('darkens rather than lightens when the surface is light', () => {
    const surface = '#FFFFFF';
    const fixed = ensureContrast('#E8A317', surface, 4.5);
    expect(relativeLuminance(fixed)).toBeLessThan(relativeLuminance('#E8A317'));
    expect(contrastRatio(fixed, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the hue recognisable while lifting', () => {
    // A lifted violet must still be violet — blue channel highest, red above
    // green — otherwise the category colour coding stops meaning anything.
    const [r, g, b] = hexToRgb(ensureContrast('#7B5EA7', '#181E1A', 4.5));
    expect(b).toBeGreaterThan(r);
    expect(r).toBeGreaterThan(g);
  });
});
