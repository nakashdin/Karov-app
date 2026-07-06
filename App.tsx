import React from 'react';
import { I18nManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DefaultTheme,
  NavigationContainer,
  Theme,
} from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { FiltersProvider } from './src/context/FiltersContext';
import { LocationProvider } from './src/context/LocationContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { colors } from './src/theme';
import { HEEBO_FONTS, applyHeeboFont } from './src/theme/fonts';

// Force right-to-left layout for the Hebrew UI.
// (Takes full effect after the first reload; harmless to call every launch.)
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

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
      <LocationProvider>
        <FavoritesProvider>
          <FiltersProvider>
            <NavigationContainer theme={navTheme}>
              <StatusBar style="dark" />
              <RootNavigator />
            </NavigationContainer>
          </FiltersProvider>
        </FavoritesProvider>
      </LocationProvider>
    </SafeAreaProvider>
  );
}
