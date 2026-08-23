import React, { createContext, useContext, useEffect, useState } from 'react';
import { DevSettings, I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { locales, type Locale, type Strings } from '../i18n';

const STORAGE_KEY = '@karov/locale';

const isRTLLocale = (l: Locale) => l === 'he';

/**
 * Switching between an RTL and an LTR locale only takes effect after the app
 * restarts, so native needs its own way to do that.
 *
 * This used to `require('expo-updates')` inside a try/catch while the package
 * was not installed at all, which meant the reload silently never happened and
 * the user was left with a broken layout until they killed the app by hand.
 *
 * Native only: web never calls this (see applyWebDirection below).
 */
async function reloadApp(): Promise<void> {
  try {
    await Updates.reloadAsync();
    return;
  } catch {
    // No updates runtime (Expo Go, or a dev client built without it).
  }

  DevSettings?.reload?.();
}

/**
 * react-native-web's I18nManager is a stub: `allowRTL`/`forceRTL` are no-ops
 * and `isRTL` doesn't exist on the object at all (only a hardcoded-false
 * `getConstants().isRTL`). Comparing against either produces an always-true
 * mismatch, and reloading in response to an always-true condition is an
 * infinite reload loop — every locale, every load, silently (no console
 * error, no failed request; the page just never finishes loading).
 *
 * Direction on web comes from `<html dir>`, not from I18nManager, and CSS
 * takes effect immediately — so there is nothing to force and nothing to
 * restart. This sets `dir`/`lang` directly instead of going anywhere near
 * I18nManager or reloadApp().
 */
function applyWebDirection(l: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dir = isRTLLocale(l) ? 'rtl' : 'ltr';
  document.documentElement.lang = l;
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

      if (Platform.OS === 'web') {
        applyWebDirection(l);
        setLocaleState(l);
        setReady(true);
        return;
      }

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

    if (Platform.OS === 'web') {
      applyWebDirection(l);
      setLocaleState(l);
      return;
    }

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
