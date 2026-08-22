import React, { createContext, useContext, useEffect, useState } from 'react';
import { DevSettings, I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { locales, type Locale, type Strings } from '../i18n';

const STORAGE_KEY = '@karov/locale';

const isRTLLocale = (l: Locale) => l === 'he';

/**
 * Switching between an RTL and an LTR locale only takes effect after the app
 * restarts, so every platform needs its own way to do that.
 *
 * This used to `require('expo-updates')` inside a try/catch while the package
 * was not installed at all, which meant the reload silently never happened and
 * the user was left with a broken layout until they killed the app by hand.
 */
async function reloadApp(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.location.reload();
    return;
  }

  try {
    await Updates.reloadAsync();
    return;
  } catch {
    // No updates runtime (Expo Go, or a dev client built without it).
  }

  DevSettings?.reload?.();
}

interface LanguageCtx {
  t: Strings;
  locale: Locale;
  setLocale: (l: Locale) => Promise<void>;
}

const LanguageContext = createContext<LanguageCtx>({
  t: locales.he,
  locale: 'he',
  setLocale: async () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('he');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(async (saved) => {
      const l = (saved as Locale | null) || 'he';
      // Persist default so next launch doesn't need to recheck
      if (!saved) await AsyncStorage.setItem(STORAGE_KEY, l);
      const rtl = isRTLLocale(l);
      if (I18nManager.isRTL !== rtl) {
        I18nManager.allowRTL(rtl);
        I18nManager.forceRTL(rtl);
        setLocaleState(l);
        setReady(true);
        // Reload needed on native for RTL layout to take effect
        reloadApp();
        return;
      }
      setLocaleState(l);
      setReady(true);
    });
  }, []);

  const setLocale = async (l: Locale) => {
    await AsyncStorage.setItem(STORAGE_KEY, l);
    const rtlNeeded = isRTLLocale(l);
    if (I18nManager.isRTL !== rtlNeeded) {
      I18nManager.allowRTL(rtlNeeded);
      I18nManager.forceRTL(rtlNeeded);
      setLocaleState(l);
      // Reload so the native RTL layout takes effect
      await reloadApp();
    } else {
      setLocaleState(l);
    }
  };

  if (!ready) return null;

  return (
    <LanguageContext.Provider value={{ t: locales[locale], locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageCtx {
  return useContext(LanguageContext);
}
