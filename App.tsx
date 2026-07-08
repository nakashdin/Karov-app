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
import { LanguageProvider } from './src/context/LanguageContext';
import { colors } from './src/theme';
import { HEEBO_FONTS, applyHeeboFont } from './src/theme/fonts';

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
      <LanguageProvider>
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
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
