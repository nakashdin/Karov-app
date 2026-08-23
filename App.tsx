import React from 'react';
import { I18nManager, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  Theme,
} from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { linking } from './src/navigation/linking';
import { LocationRevokedNotice } from './src/components/LocationRevokedNotice';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { FiltersProvider } from './src/context/FiltersContext';
import { LocationProvider } from './src/context/LocationContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { alpha, lightTokens, ThemeProvider, useTheme, useThemePreference } from './src/theme';
import type { Tokens } from './src/theme';
import { HEEBO_FONTS, applyHeeboFont } from './src/theme/fonts';

// Inject global web CSS — removes the browser focus ring on inputs and fixes
// the selection colour. `light-dark()` is not used: it needs the `color-scheme`
// property to already be resolved, and ThemeContext sets that after mount.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    input, textarea { outline: none !important; -webkit-appearance: none; caret-color: ${lightTokens.primary}; }
    input::selection, textarea::selection { background: ${alpha(lightTokens.primary, 0.2)}; }
    * { -webkit-tap-highlight-color: transparent; }
  `;
  document.head.appendChild(style);
}

// Allow RTL (Hebrew default). LanguageContext manages forceRTL dynamically.
I18nManager.allowRTL(true);

// Apply Heebo to all text app-wide (per-weight family mapping).
applyHeeboFont();

/**
 * React Navigation keeps its own colour table, used for the screen background
 * behind a transition and for the default header. Left on `DefaultTheme` it
 * flashes white between dark-mode screens.
 */
function navigationTheme(t: Tokens): Theme {
  const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: t.background,
      card: t.surface,
      text: t.text,
      border: t.border,
      primary: t.primary,
    },
  };
}

function AppShell() {
  const theme = useTheme();
  const { ready } = useThemePreference();

  // Hold the first paint until the stored preference is known, otherwise a user
  // who chose dark sees a white flash on every cold start.
  if (!ready) return null;

  return (
    <NavigationContainer theme={navigationTheme(theme)} ref={navigationRef} linking={linking}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
      <LocationRevokedNotice />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(HEEBO_FONTS);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      {/* Outermost, so a provider blowing up is caught too — not just a screen. */}
      <ErrorBoundary>
        <ThemeProvider>
          <LanguageProvider>
            <LocationProvider>
              <FavoritesProvider>
                <FiltersProvider>
                  <AppShell />
                </FiltersProvider>
              </FavoritesProvider>
            </LocationProvider>
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
