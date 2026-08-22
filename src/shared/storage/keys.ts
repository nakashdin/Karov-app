/**
 * Every persisted key in the app, in one place.
 *
 * Before this registry the keys were declared ad hoc across 23 files, in four
 * different naming conventions, and three files each declared their own copy of
 * `@karov/favoriteSynagogue`. A typo in any of them was a silently empty read.
 *
 * ── Do not "tidy" these strings ──────────────────────────────────────────────
 * The inconsistent prefixes below (`@karov/`, `karov:`, `@karov_`, `karov/`)
 * are the values already written to real devices. Renaming one orphans that
 * user's data — their favourites, their chosen middot, their language. If a key
 * must change, it needs a migration in `migrations.ts`, not an edit here.
 */

export const StorageKey = {
  // ── Account & session ──────────────────────────────────────────────────────
  auth: '@karov/auth',
  deviceId: '@karov/deviceId',
  locale: '@karov/locale',

  // ── Preferences ────────────────────────────────────────────────────────────
  nusach: '@karov/nusach',
  favoriteSynagogue: '@karov/favoriteSynagogue',
  /** Legacy shape: `karov:` prefix, set before the `@karov/` convention. */
  favorites: 'karov:favorites',

  // ── קרוב ללב — daily content personalisation ───────────────────────────────
  categoryPreferences: '@karov/categoryPreferences',
  categoryPreferencesDecided: '@karov/categoryPreferencesDecided',
  selectedTopics: '@karov/selectedTopics',
  selectedMiddot: '@karov/selectedMiddot',
  middahProgress: '@karov/middahProgress',
  contentHistory: '@karov/contentHistory',
  dailyContentType: '@karov/dailyContentType',

  // ── Remote-response caches ─────────────────────────────────────────────────
  parasha: '@karov/parasha',
  hebrewDateToday: '@karov/hebrewDateToday',

  // ── Community submissions (legacy `@karov_` prefix) ────────────────────────
  submissions: '@karov_submissions',

  // ── Location permission flow (legacy unprefixed) ───────────────────────────
  locReloadCount: 'karov/loc-reload-count',
  locWasBlocked: 'karov/loc-was-blocked',
} as const;

export type StorageKeyName = keyof typeof StorageKey;

/**
 * Keys parameterised by a value. Kept here so the prefixes stay discoverable
 * and a cache sweep can find them.
 */
export const StorageKeyFor = {
  jewishDayRaw: (isoDate: string) => `@karov/jewishDayRaw_${isoDate}`,
  parashaSummary: (topicSlug: string) => `@karov/parashaSummary_${topicSlug}`,
  cityName: (lat: number, lng: number) =>
    `@karov/cityName_${Math.round(lat * 100)}_${Math.round(lng * 100)}`,
} as const;

/** Prefixes owned by dynamic keys — used when clearing caches wholesale. */
export const DYNAMIC_KEY_PREFIXES = [
  '@karov/jewishDayRaw_',
  '@karov/parashaSummary_',
  '@karov/cityName_',
] as const;
