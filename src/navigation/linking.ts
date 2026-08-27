import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * URL ↔ route mapping.
 *
 * Without this the whole web app lives at a single URL: a place cannot be
 * shared, search engines see one page, and the browser's back button has
 * nothing to work with. It also makes the `kosherapp://` scheme and any future
 * universal links actually resolve on native.
 *
 * Paths are the app's public surface — treat them as an API and keep them
 * stable. Hebrew is deliberately avoided in the path itself so links survive
 * copy/paste and messaging apps intact.
 */

/** Production web origin — links copied from the site keep working in the app. */
export const WEB_ORIGIN = 'https://karov-eta.vercel.app';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), WEB_ORIGIN],

  config: {
    // A deep link resolves to [Splash, <target>], so Back from a shared link
    // has somewhere to go instead of dead-ending.
    initialRouteName: 'Splash',
    screens: {
      Tabs: {
        path: '',
        screens: {
          Home: '',
          Favorites: 'favorites',
          Brachot: 'tefila',
          Zmanim: 'zmanim',
          Community: 'community',
        },
      },

      // ── Shareable content ────────────────────────────────────────────────
      PlaceDetail: 'place/:id',
      MapDetail: 'place/:placeId/map',
      ParashaDetail: 'parasha',
      KarovLevContent: 'karov-lev/:id',

      // ── Browsing ─────────────────────────────────────────────────────────
      List: 'list',
      FoodList: 'food',
      WhatsAround: 'around',
      KashruyotFilter: 'kashrut/:placeType',
      KarovLev: 'karov-lev',
      ElulSegula: 'elul',

      // ── Flows that should not be linkable from outside ───────────────────
      Splash: 'splash',
      Login: 'login',
      LocationPermission: 'location',
      Report: 'place/:placeId/report',
      AddPlace: 'add',
      KarovLevOnboarding: 'karov-lev/onboarding',
      MiddotSelection: 'karov-lev/middot',
    },
  },
};

/** Canonical public URL for a place — for share sheets and OG tags. */
export const placeUrl = (id: string): string => `${WEB_ORIGIN}/place/${encodeURIComponent(id)}`;
