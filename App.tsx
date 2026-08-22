import React from 'react';
import { I18nManager, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
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
import { colors } from './src/theme';
import { HEEBO_FONTS, applyHeeboFont } from './src/theme/fonts';

// Inject global web CSS — removes browser outline/focus ring on inputs and fixes selection color.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const s = document.createElement('style');
  s.textContent = `
    input, textarea { outline: none !important; -webkit-appearance: none; caret-color: #1E7A46; }
    input::selection, textarea::selection { background: rgba(30,122,70,0.2); }
    * { -webkit-tap-highlight-color: transparent; }
  `;
  document.head.appendChild(s);
}

// Allow RTL (Hebrew default). LanguageContext manages forceRTL dynamically.
I18nManager.allowRTL(true);

// Apply Heebo to all text app-wide (per-weight family mapping).
applyHeeboFont();

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function App() {
  const [fontsLoaded] = useFonts(HEEBO_FONTS);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      {/* Outermost, so a provider blowing up is caught too — not just a screen. */}
      <ErrorBoundary>
        <LanguageProvider>
          <LocationProvider>
            <FavoritesProvider>
              <FiltersProvider>
                <NavigationContainer theme={navTheme} ref={navigationRef} linking={linking}>
                  <StatusBar style="dark" />
                  <RootNavigator />
                  <LocationRevokedNotice />
                </NavigationContainer>
              </FiltersProvider>
            </FavoritesProvider>
          </LocationProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
