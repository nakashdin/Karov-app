/**
 * Pure colour maths. No React, no React Native — safe to call at module scope,
 * in tests, and inside the Leaflet HTML string builder.
 *
 * Everything works on 6-digit sRGB hex. Alpha is expressed as an `rgba()`
 * string rather than an 8-digit hex because Android's older colour parser and
 * the web `<meta name="theme-color">` tag both handle `rgba()` reliably, while
 * `#RRGGBBAA` support is uneven.
 */

export type Hex = string;
export type Rgb = readonly [number, number, number];

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Parse `#abc`, `#abcd`, `#aabbcc` or `#aabbccdd`. Alpha, if present, is dropped. */
export function hexToRgb(hex: Hex): Rgb {
  const match = HEX_RE.exec(hex.trim());
  if (!match) throw new Error(`Not a hex colour: ${hex}`);

  const body = match[1];
  const full =
    body.length <= 4
      ? body
          .slice(0, 3)
          .split('')
          .map((c) => c + c)
          .join('')
      : body.slice(0, 6);

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ] as const;
}

const clampChannel = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));

export function rgbToHex(rgb: Rgb): Hex {
  return `#${rgb.map((v) => clampChannel(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/**
 * Linear sRGB blend. `amount` is how far to travel from `from` towards `to`,
 * so `mix(a, b, 0)` is `a` and `mix(a, b, 1)` is `b`.
 */
export function mix(from: Hex, to: Hex, amount: number): Hex {
  const t = Math.max(0, Math.min(1, amount));
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return rgbToHex([
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]);
}

/** `alpha('#1E7A46', 0.2)` → `'rgba(30,122,70,0.2)'`. */
export function alpha(hex: Hex, opacity: number): string {
  const [r, g, b] = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, opacity));
  return `rgba(${r},${g},${b},${a})`;
}

const srgbToLinear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.1 relative luminance, 0 (black) → 1 (white). */
export function relativeLuminance(hex: Hex): number {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear) as unknown as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio, 1 (identical) → 21 (black on white). */
export function contrastRatio(a: Hex, b: Hex): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function isDark(hex: Hex): boolean {
  return relativeLuminance(hex) < 0.5;
}

/**
 * Nudge a colour until it reads against `background`.
 *
 * Category accents are authored for a white surface. On a dark surface a mid
 * violet like `#7B5EA7` falls to a ~2.6:1 ratio, which fails WCAG AA for body
 * text, so the dark scheme lightens accents rather than reusing them. Walking
 * towards the target in small steps preserves hue — recolouring by hand for a
 * second scheme would not.
 */
export function ensureContrast(color: Hex, background: Hex, minRatio = 4.5): Hex {
  if (contrastRatio(color, background) >= minRatio) return color;

  const target = isDark(background) ? '#FFFFFF' : '#000000';
  let best = color;

  for (let step = 1; step <= 20; step += 1) {
    best = mix(color, target, step / 20);
    if (contrastRatio(best, background) >= minRatio) return best;
  }
  return best;
}
