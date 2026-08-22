# קרוב (Karov) — כל מה שיהודי צריך, קרוב אליך

אפליקציה למציאת מקומות שיהודי צריך בקרבת מקום — מסעדות כשרות, בתי כנסת, מקוואות, בתי חב״ד וקברי צדיקים — יחד עם תוכן יומי (פרשת שבוע, זמני היום, ברכות, תהילים).
עברית, RTL, ו‑**7,506 מקומות אמיתיים ב‑656 ערים**, שנארזים עם האפליקציה ועובדים גם ללא רשת.

A Hebrew-first, RTL app for finding kosher places across Israel, plus daily Jewish content. Runs on iOS, Android and the web from one React Native codebase.

---

## Stack

| | |
|---|---|
| Runtime | **Expo SDK 56** · React Native 0.85 · React 19.2 · TypeScript 6 (`strict`) |
| Navigation | React Navigation — native stack + bottom tabs |
| מפה | **Leaflet + OpenStreetMap** — WebView ב‑native, iframe ב‑web. בלי Google, בלי מפתחות API |
| חיפוש | MiniSearch, עם נרמול עברית (ניקוד, גרשיים) |
| שפות | he · en · es · ru · fr (`src/i18n`) |
| גופן | Heebo (`@expo-google-fonts/heebo`) |
| Backend | אין. הדאטה נארז עם האפליקציה. Supabase מחווט כמקור עתידי (`DATA_SOURCE`) |

**אילוצים:** בלי Google Maps · בלי שירותים בתשלום · דאטה חוקי/חינמי/מבוסס‑אמת · additive‑only, בלי מחיקות.

---

## הרצה

```bash
npm install
npm start          # Expo — a לאנדרואיד, i ל-iOS, w לדפדפן
```

| פקודה | מה היא עושה |
|---|---|
| `npm run web` / `android` / `ios` | הרצה על פלטפורמה מסוימת |
| `npm run verify` | **הצ'ק שה‑CI מריץ**: typecheck + lint + test + ולידציית דאטה |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `lint:fix` | ESLint (כולל שומרי הסף של ה‑design system וה‑i18n) |
| `npm test` / `test:watch` | Jest |
| `npm run data:validate` | בדיקת שלמות של `places.osm.json` |
| `npm run build:web` | `expo export --platform web` → `dist/` |

---

## מבנה הפרויקט

```
src/
  components/        רכיבים משותפים (PlaceCard, KosherBadge, FilterSheet, …)
    map/             MapView → LeafletMap (.tsx = WebView, .web.tsx = iframe)
    home/            כרטיסי מסך הבית
    karov-lev/       "קרוב ללב" — מידות ותוכן אישי
  context/           Filters · Location · Favorites · Language
  data/
    placesRepository.ts   נקודת הכניסה היחידה לדאטה (singleton)
    config.ts             מתג DATA_SOURCE: 'osm' (פעיל) | 'mock' | 'supabase'
    repository/           ממשק PlacesRepository + Osm/Mock/Supabase
    generated/            הדאטה החי — נבנה ע"י importers/ ו-scripts/
    seed/                 seed לדמו בלבד. אסור לייבא מחוץ ל-data/
    search/               אינדקס MiniSearch
    jewish-content/       קטלוג תוכן יומי + דירוג דטרמיניסטי
  hooks/             usePlaces, useParasha, useHalachicDate, …
  i18n/              כל טקסט ה-UI
  navigation/        RootNavigator · TabNavigator · טיפוסי מסלולים
  screens/           מסכים
  theme/             colors · spacing · typography — מקור האמת לעיצוב
  types/             Place · City · PlaceFilters · IssueReport
  utils/             geo · zmanim · openingHours · kosher · navigation
```

### חוקי הארכיטקטורה (נאכפים ב-ESLint)

1. **מסכים לא נוגעים בדאטה ישירות.** הכל דרך `placesRepository`. אסור לייבא מ-`data/generated/*` או מ-`data/seed/*` מחוץ לשכבת הדאטה.
2. **אין צבע גולמי מחוץ ל-`src/theme/`.** צבע חדש נכנס ל-`colors.ts`.
3. **אין מחרוזת עברית קשיחה** ב-`screens/`, `components/` או `navigation/` — הכל דרך `src/i18n` ו-`useLanguage()`.

כללים 2–3 הם כרגע `warn` עם backlog ידוע (ראה `docs/ARCHITECTURE_REVIEW.md`); הם עולים ל-`error` ספרייה‑ספרייה ככל שהיא מנוקה.

---

## הדאטה

`src/data/generated/places.osm.json` הוא מקור האמת בזמן ריצה. הוא נבנה מ:

| מקור | תפקיד |
|---|---|
| OpenStreetMap (Overpass) | בסיס — בתי כנסת, מסעדות, מקוואות |
| data.gov.il / CKAN | מקוואות רשמיים |
| ArcGIS REST (לפי עיר) | ספריות בתי כנסת עירוניות |
| מועצות דתיות (SabaiApps) | בתי כנסת ומקוואות |
| Chabad.org | בתי חב״ד |
| תעודות כשרות צהר | תוקף תעודה ופרטי כשרות |

הפרטים המלאים ב-[`DATA_SOURCES.md`](DATA_SOURCES.md) וב-[`importers/README.md`](importers/README.md).

**כללי ברזל:** additive‑only · אפס מחיקות · provenance לכל רשומה · גיבוי + שער ולידציה בכל merge.

`npm run data:validate` אוכף את זה: כשלים מבניים (id כפול, קואורדינטה מחוץ לישראל, טיפוס לא מוכר, `location` בצורת `{lat,lng}` שנופלת בשקט) מפילים את הבנייה; פערי איכות ידועים נעולים בתקרה ב-`scripts/data-quality-baseline.json` ואסור להם לגדול.

גיבויים היסטוריים של הדאטה יושבים ב-`data-backups/` — על הדיסק, מחוץ ל-git.

---

## תיעוד

| מסמך | תוכן |
|---|---|
| [`docs/ARCHITECTURE_REVIEW.md`](docs/ARCHITECTURE_REVIEW.md) | סקירה ארכיטקטונית, ממצאים לפי חומרה, ארכיטקטורת יעד, תוכנית CI/CD |
| [`STATUS.md`](STATUS.md) | דוח מצב — מה נבנה, כמה רשומות, מה פתוח |
| [`DATA_SOURCES.md`](DATA_SOURCES.md) | כל מקור דאטה ורישיונו |
| [`AGENTS.md`](AGENTS.md) | הנחיות לסוכנים העובדים על הריפו |

---

## רישוי וייחוס

הקוד: MIT ([`LICENSE`](LICENSE)).
הדאטה כולל רשומות מ‑OpenStreetMap, שמופצות תחת **ODbL** ומחייבות ייחוס — ראה `DATA_SOURCES.md`.
