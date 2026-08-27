/** Spacing scale (4pt grid) and shared layout tokens. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/**
 * Minimum comfortable touch targets — generous for one-handed use on the move.
 */
export const sizes = {
  control: 52, // inputs, small buttons
  button: 58, // primary action buttons
  tabBar: 64, // bottom tab bar (excl. safe-area inset)
} as const;

/**
 * Shadows stay black in both colour schemes — the usual cross-platform
 * convention, since a "shadow" that flips to white in dark mode reads as a
 * glow instead. Exported separately for the rare screen-level custom shadow
 * that doesn't fit `shadow.card` / `shadow.raised`.
 */
export const shadowColor = '#000000';

export const shadow = {
  // Diffused, Airbnb-style card shadow — very soft, premium feel.
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  // Stronger lift for floating / sticky elements (bottom sheet, FAB).
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 22,
    elevation: 5,
  },
} as const;
