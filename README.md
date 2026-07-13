# קרוב — Kosher Places (Israel) · MVP

אפליקציית מובייל למציאת מקומות כשרים בישראל. עברית, RTL, מהירה ופשוטה.
A native mobile MVP for finding kosher places in Israel. Hebrew, RTL, mock-data first, built to later connect to real data via Supabase.

## Stack
- **Expo** (SDK 56) + **React Native** + **TypeScript**
- **React Navigation** — bottom tabs (בית / מפה / רשימה) + native stack
- **MapLibre** + **OpenStreetMap** raster tiles (no Google, no API keys, no paid services)
- **Supabase** — wired as a future data source; the app currently runs on mock data
- No authentication yet

## Running

```bash
npm install
npx expo start
```

- **Expo Go**: the whole app runs, including a functional list-based map fallback.
- **Map (real MapLibre)**: MapLibre is a native module and does **not** run in Expo Go.
  To see the real map, build a dev client:
  ```bash
  npx expo prebuild
  npx expo run:android   # or run:ios (macOS)
  ```
  The app auto-detects the runtime: Expo Go → fallback, dev/standalone build → MapLibre.

## Project structure

```
src/
  components/        Reusable UI (PlaceCard, KosherBadge, Chip, FilterSheet, …)
    map/             MapView abstraction (Leaflet + OSM in a WebView / iframe)
  context/           Filters, Location, Favorites — app-wide state
  data/
    placesRepository.ts  THE data entry point — exports the placesRepository singleton
    config.ts        DATA_SOURCE switch ('mock' | 'supabase')
    seed/            ADMIN SEED DATA (places.seed.ts, cities.seed.ts) — edit these
    repository/      PlacesRepository interface + Mock + Supabase implementations
  lib/
    supabase.ts      Supabase client placeholder + setup notes (not wired yet)
  hooks/             usePlaces, usePlace, useCities, useLocation
  i18n/              Hebrew strings (single source of truth for UI text)
  navigation/        RootNavigator, TabNavigator, route types
  screens/           Home, Map, List, PlaceDetail, Report, Favorites
  theme/             colors, spacing, typography
  types/             Place, City, PlaceFilters, IssueReport
  utils/             geo (distance), navigation (Waze/dialer), kosher, placeType
```

All screens read data through hooks/actions that call `data/placesRepository.ts`.
No screen imports the seed/mock files directly.

## Features
1. **Home** — "מה יש סביבי?" CTA, shortcuts (restaurants / synagogues / favorites), nearby places
2. **Map** — Leaflet + OpenStreetMap (WebView/iframe), pins per place, tap → bottom card
3. **List** — search by name/city + sort (name / distance)
4. **Place detail** — info, Waze navigation, call, report, favorite toggle
5. **Filters** — city · kosher type · meat/dairy/parve
6. **Location** — foreground permission, shared across screens, default to central Israel
7. **Waze** — `openWaze()` deep-links into the app (web fallback) — `utils/navigation.ts`
8. **Report wrong info** — issue type + free text
9. **Admin seed** — `src/data/seed/*.seed.ts`
10. **Clean data layer** — screens depend only on `data/placesRepository.ts`

## Data

Real places come from **OpenStreetMap** (free, ODbL — attribution shown on the map).

```bash
node scripts/fetch-osm-places.mjs   # refresh src/data/generated/places.osm.json
```

It pulls synagogues + `diet:kosher` food places around the 8 cities (~895 places).
OSM has no official kosher-certification data, so those fields are intentionally
left empty — never fabricated. Switch sources with `DATA_SOURCE` in `data/config.ts`
(`osm` | `mock` | `supabase`).

## Connecting Supabase later

The data layer is the only thing that changes:

1. `npx expo install @supabase/supabase-js`
2. Fill `.env` from `.env.example`
3. Wire up `src/lib/supabase.ts` (`createClient`)
4. Implement `SupabasePlacesRepository` (map snake_case rows → domain types)
5. Flip `DATA_SOURCE` to `'supabase'` in `src/data/config.ts`

No screen or hook needs to change.

## Editing the data (admin)

Open `src/data/seed/places.seed.ts` and copy an entry. Each place needs a unique
`id`, a `cityId` that exists in `cities.seed.ts`, and a `location { latitude, longitude }`.
