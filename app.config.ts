import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic app config layered on top of app.json.
 *
 * app.json holds everything that is true for every build. This file adds only
 * what differs per environment, so development / preview / production can be
 * installed side by side on the same device and are never confused for each
 * other in a crash report or a store listing.
 *
 * The variant is chosen by APP_VARIANT, which eas.json sets per build profile.
 * Locally: `npm run start:dev` / `start:preview`.
 */

type Variant = 'development' | 'preview' | 'production';

const VARIANT: Variant = (() => {
  const raw = process.env.APP_VARIANT;
  return raw === 'development' || raw === 'preview' ? raw : 'production';
})();

const BASE_ID = 'com.karov.app';

const IDENTIFIER: Record<Variant, string> = {
  development: `${BASE_ID}.dev`,
  preview: `${BASE_ID}.preview`,
  production: BASE_ID,
};

const NAME: Record<Variant, string> = {
  development: 'קרוב (dev)',
  preview: 'קרוב (preview)',
  production: 'קרוב',
};

const SCHEME: Record<Variant, string> = {
  development: 'kosherapp-dev',
  preview: 'kosherapp-preview',
  production: 'kosherapp',
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: NAME[VARIANT],
  slug: config.slug ?? 'kosher-app',
  scheme: SCHEME[VARIANT],

  /**
   * `fingerprint` hashes the native runtime on every build, so EAS Update can
   * never ship a JS bundle to a binary that cannot run it. That safety matters
   * more here than the extra builds it costs, because JS-only changes (which
   * includes every dataset refresh) are the common case.
   */
  runtimeVersion: { policy: 'fingerprint' },

  updates: {
    ...config.updates,
    // Filled in by `eas update:configure`. Until then OTA is inert, which is
    // the correct default — a wrong URL is worse than none.
    ...(process.env.EXPO_UPDATE_URL ? { url: process.env.EXPO_UPDATE_URL } : {}),
    fallbackToCacheTimeout: 0,
  },

  ios: {
    ...config.ios,
    bundleIdentifier: IDENTIFIER[VARIANT],
  },

  android: {
    ...config.android,
    package: IDENTIFIER[VARIANT],
  },

  extra: {
    ...config.extra,
    variant: VARIANT,
    eas: {
      ...(config.extra?.eas ?? {}),
      // Written by `eas init`; env var lets CI inject it without a commit.
      ...(process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : {}),
    },
  },
});
