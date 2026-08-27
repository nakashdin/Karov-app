/**
 * Colour-scheme state for the whole app.
 *
 * The stored preference has three values, not two. `'system'` is the default
 * and means "follow the OS", which is the only setting that behaves correctly
 * when the user flips their phone into dark mode at sunset — an explicit
 * `'light'` would ignore it. `'light'` / `'dark'` are an override, and only
 * exist because a user reading a siddur in a dark shul may want the opposite of
 * whatever their phone decided.
 *
 * The preference is read from storage before the first paint is unblocked, so
 * the app never flashes light and then swaps to dark.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, Platform, useColorScheme as useSystemColorScheme } from 'react-native';

import { StorageKey } from '../shared/storage/keys';
import { getString, setString } from '../shared/storage/storage';
import { type ColorScheme, type Tokens, tokensFor } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

const isThemePreference = (v: unknown): v is ThemePreference =>
  v === 'system' || v === 'light' || v === 'dark';

/**
 * Tell the platform chrome which scheme is in play.
 *
 * These are two genuinely different APIs, not one with a shim:
 *
 *   native — `Appearance.setColorScheme` drives the status bar, the keyboard
 *            and native modals. `'unspecified'` hands control back to the OS.
 *   web    — react-native-web has NO `setColorScheme`; calling it throws. The
 *            browser equivalent is the `color-scheme` CSS property, which is
 *            what recolours scrollbars, `<select>` popups and form controls,
 *            plus `<meta name="theme-color">` for the mobile browser UI.
 */
function applySchemeToPlatformChrome(preference: ThemePreference, resolved: ColorScheme): void {
  if (Platform.OS !== 'web') {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
    return;
  }

  if (typeof document === 'undefined') return;

  document.documentElement.style.colorScheme =
    preference === 'system' ? 'light dark' : preference;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tokensFor(resolved).background);
}

interface ThemeContextValue {
  /** Resolved scheme actually in use right now. */
  scheme: ColorScheme;
  /** What the user chose. `'system'` unless they overrode it. */
  preference: ThemePreference;
  /** Semantic tokens for `scheme`. Stable identity while the scheme is stable. */
  theme: Tokens;
  isDark: boolean;
  setPreference: (next: ThemePreference) => void;
  /** True until the stored preference has been read. */
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // `useColorScheme` is the supported hook on every platform, including web,
  // where it maps to `prefers-color-scheme`.
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = await getString(StorageKey.colorScheme);
      if (cancelled) return;
      if (isThemePreference(stored)) setPreferenceState(stored);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    // Fire-and-forget: the UI must not wait on disk, and `setString` never
    // throws — it reports failure by returning false, which is not actionable
    // here beyond keeping the in-memory choice.
    void setString(StorageKey.colorScheme, next);
  }, []);

  // `useColorScheme` returns 'unspecified' when the platform has no opinion,
  // which is light in every OS that reports it.
  const scheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  useEffect(() => {
    applySchemeToPlatformChrome(preference, scheme);
  }, [preference, scheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      preference,
      theme: tokensFor(scheme),
      isDark: scheme === 'dark',
      setPreference,
      ready,
    }),
    [scheme, preference, setPreference, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>. Check App.tsx.');
  }
  return ctx;
}

/** The tokens for the active scheme. This is what components should call. */
export function useTheme(): Tokens {
  return useThemeContext().theme;
}

/** Scheme state and the setter — for the appearance control, not for styling. */
export function useThemePreference(): Omit<ThemeContextValue, 'theme'> {
  const { theme: _theme, ...rest } = useThemeContext();
  return rest;
}
