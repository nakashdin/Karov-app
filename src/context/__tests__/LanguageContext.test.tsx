import React from 'react';
import { Text, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { LanguageProvider, useLanguage } from '../LanguageContext';

/**
 * react-native-web's I18nManager is a stub (`allowRTL`/`forceRTL` are no-ops,
 * `isRTL` doesn't exist on the object at all). Comparing against it on web
 * produces an always-true mismatch, and the old code reloaded the page in
 * response — an infinite reload loop, on every locale, on every load, with
 * no console error and nothing for Jest's jsdom-less test environment to
 * observe on its own. These tests stand in a fake `window`/`document` and
 * assert directly on the one thing that must never happen on web: a reload.
 */

function Probe() {
  const { locale } = useLanguage();
  return <Text testID="probe">{locale}</Text>;
}

describe('LanguageProvider on web', () => {
  const originalOS = Platform.OS;
  let reload: jest.Mock;

  beforeEach(async () => {
    (Platform as { OS: string }).OS = 'web';
    await AsyncStorage.clear();
    reload = jest.fn();
    (global as unknown as { window: unknown }).window = { location: { reload } };
    (global as unknown as { document: unknown }).document = {
      documentElement: { dir: '', lang: '' },
    };
  });

  afterEach(() => {
    (Platform as { OS: string }).OS = originalOS;
    delete (global as { window?: unknown }).window;
    delete (global as { document?: unknown }).document;
  });

  it('never reloads on mount, for a Hebrew (RTL) locale', async () => {
    await AsyncStorage.setItem('@karov/locale', 'he');
    const { findByTestId } = await render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(await findByTestId('probe')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });

  it('never reloads on mount, for an English (LTR) locale — the old bug looped for every locale, not just Hebrew', async () => {
    await AsyncStorage.setItem('@karov/locale', 'en');
    const { findByTestId } = await render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    expect(await findByTestId('probe')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });

  it('sets <html dir/lang> from the locale on mount instead of touching I18nManager', async () => {
    await AsyncStorage.setItem('@karov/locale', 'he');
    await render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    const doc = (global as unknown as { document: { documentElement: { dir: string; lang: string } } })
      .document;
    await waitFor(() => expect(doc.documentElement.dir).toBe('rtl'));
    expect(doc.documentElement.lang).toBe('he');
  });

  it('flips <html dir/lang> on setLocale without reloading', async () => {
    await AsyncStorage.setItem('@karov/locale', 'he');
    function Switcher() {
      const { locale, setLocale } = useLanguage();
      return (
        <Text testID="probe" onPress={() => setLocale('en')}>
          {locale}
        </Text>
      );
    }
    const { findByTestId } = await render(
      <LanguageProvider>
        <Switcher />
      </LanguageProvider>,
    );
    const probe = await findByTestId('probe');
    await fireEvent.press(probe);

    const doc = (global as unknown as { document: { documentElement: { dir: string; lang: string } } })
      .document;
    await waitFor(() => expect(doc.documentElement.dir).toBe('ltr'));
    expect(doc.documentElement.lang).toBe('en');
    expect(reload).not.toHaveBeenCalled();
  });
});
