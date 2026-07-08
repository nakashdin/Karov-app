import React, { createContext, useContext, useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { locales, type Locale, type Strings } from '../i18n';

const STORAGE_KEY = '@karov/locale';

const isRTLLocale = (l: Locale) => l === 'he';

async function reloadApp() {
  try {
    // expo-updates is available in production builds
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Updates = require('expo-updates');
    await Updates.reloadAsync();
  } catch {
    try {
      // Fallback for Expo Go / development
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DevSettings } = require('react-native');
      DevSettings?.reload?.();
    } catch {}
  }
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
