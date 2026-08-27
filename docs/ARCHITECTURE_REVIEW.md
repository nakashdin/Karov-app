# סקירה ארכיטקטונית — קרוב (Karov)

> נערך: 2026-08-22 · על ענף `master` @ `d461639`
> היקף: ארכיטקטורה, design system, מוכנות רב-פלטפורמית (Web / iOS / Android), ותכנון CI/CD.
> כל ממצא אומת ישירות מול הקוד, מול `expo-doctor`, ומול build אמיתי (`expo export --platform web`).

---

## 0. תקציר מנהלים

הפרויקט הוא **מוצר Expo/RN בוגר עם ליבה ארכיטקטונית טובה מאוד ופריפריה שלא הדביקה אותה**.
שכבת הדאטה (`PlacesRepository`) ותת-מערכת התוכן היהודי (`jewish-content`) הן ברמה מקצועית אמיתית — ממשקים, provenance, טיפוסים מלאים, `tsc --strict` עובר נקי. מנגד, שכבת ה-UI עוקפת באופן שיטתי את ה-design system ואת ה-i18n שהיא עצמה מגדירה, ואין **שום** תשתית אכיפה: אפס טסטים, אפס lint, אפס CI.

לגבי המטרה שהצבת (Web + iOS + Android): **ה-Web עובד היום; iOS ו-Android מעולם לא נבנו.** אין `eas.json`, אין `expo-updates` מותקן, אין `runtimeVersion`, אין deep linking. במצב הנוכחי `eas build` לא ירוץ בלי שלב הקמה מלא.

### ציונים לפי ציר

| ציר | ציון | הערכה |
|---|---|---|
| Design patterns & separation of concerns | **7 / 10** | Repository pattern מצוין; דליפות שכבה ו-god components |
| Dynamic code / הימנעות מ-hardcoding | **4 / 10** | Theme ו-i18n קיימים — ורוב האפליקציה עוקפת אותם |
| Agent-ready / guardrails | **3 / 10** | תיעוד וטיפוסים חזקים, אבל אין טסטים/lint/CI שיעצרו רגרסיה |
| מוכנות רב-פלטפורמית | **5 / 10** | Web חי; native לא הוקם; PWA חלקי; אין ניתוב URL |
| CI/CD | **0 / 10** | לא קיים כלל |
| Type safety | **8 / 10** | `strict: true` עובר נקי; 37 `any` נקודתיים |
| ביצועים | **4 / 10** | 5.2MB JSON בתוך ה-bundle; מיון O(n log n) עם haversine על 7,506 רשומות |

**ציון משוקלל: ~5 / 10** — בסיס טוב, לא מוכן לייצור רב-פלטפורמי.

---

## 1. מה חזק — לא לשבור

אלה החלקים שצריכים להיות התבנית לכל השאר:

1. **`PlacesRepository` — Repository + Strategy pattern נכון.**
   `src/data/repository/PlacesRepository.ts` מגדיר חוזה; `Mock` / `Osm` / `Supabase` ממשים אותו; `src/data/placesRepository.ts` הוא factory יחיד ו-`src/data/config.ts:14` הוא המתג היחיד. זו בדיוק ההפרדה שמאפשרת להחליף backend בלי לגעת במסך אחד.

2. **`sanitizePlace` — Anti-Corruption Layer.**
   `src/data/repository/OsmPlacesRepository.ts:14-33` מנקה דאטה גולמי לפני שהוא נכנס לדומיין. רשומה פגומה אחת לא מפילה את האפליקציה. תבנית נכונה שראוי להרחיב.

3. **`jewish-content` — התת-מערכת החזקה בפרויקט.**
   `types.ts` עם `ContentType`/`Topic`/`LicenseStatus`, קטלוג מופרד לפי סוג, `repository.ts` עם דירוג דטרמיניסטי (FNV-1a + xorshift32) כדי שאותו יום ייתן אותו תוכן בלי שרת. Content-as-data, ניתן להרחבה בלי לגעת ב-UI.

4. **מודל הדומיין ב-`src/types/place.ts`.**
   מתועד, additive-only, שדות provenance (`source`, `sourceUrl`, `locationPrecision`, `certificateValidUntil`). מודל שנבנה מתוך הבנה של הדומיין ולא מתוך צורכי מסך.

5. **`tsc --strict` עובר נקי** על 142 קבצים / 29,802 שורות.

6. **הפשטת המפה** — `MapView.tsx` → `LeafletMap.tsx` (WebView) / `LeafletMap.web.tsx` (iframe) דרך platform extension. זו הדרך הנכונה, והיא כרגע **המקום היחיד בפרויקט** שמשתמש בה.

---

## 2. ממצאים — P0: חוסמי multi-platform

### P0-1 · אין CI/CD בכלל

אין תיקיית `.github`, ומעולם לא הייתה (`git log --all -- .github` ריק). אין `eas.json`. כל build הוא ידני ממחשב אחד. אין gate על PR, אין דרך לוודא ש-`master` נבנה, אין artifacts משוחזרים.

זה החסם המרכזי למוצר בשלוש פלטפורמות — פירוט מלא בפרק 5.

### P0-2 · iOS/Android מעולם לא נבנו — התשתית חסרה

| נדרש | מצב |
|---|---|
| `eas.json` | ❌ לא קיים |
| `expo.extra.eas.projectId` / `owner` ב-`app.json` | ❌ לא קיים |
| `runtimeVersion` | ❌ לא קיים |
| `expo-updates` | ❌ לא מותקן — אבל **קיים `require` בקוד** |
| `app.config.ts` (קונפיג דינמי לסביבות) | ❌ `app.json` סטטי בלבד |

`src/context/LanguageContext.tsx:14` קורא ל-`require('expo-updates')` בתוך `try/catch`. אימתתי שהחבילה לא ב-`node_modules` **ולא ב-`package-lock.json`**, ושהקריאה נכנסת ל-bundle כפי שהיא. התוצאה: **מעבר שפה שדורש היפוך RTL לא מרענן את האפליקציה ב-native לעולם** — ה-`catch` בולע, `DevSettings` לא קיים ב-production, והמשתמש נשאר עם layout שבור עד סגירה ידנית של האפליקציה.

### P0-3 · Web App בלי URLs — אין `linking`

`App.tsx` יוצר `NavigationContainer` בלי prop `linking`, ואין `prefixes`. אימתתי — אין אזכור ל-`linking` בכל הפרויקט. המשמעות ל-Web:

- **כל האפליקציה חיה על URL אחד.** אי אפשר לשלוח קישור למסעדה.
- אין SEO ואין שיתוף — קטלני למוצר שכל הערך שלו הוא 7,506 מקומות שאנשים רוצים לשתף.
- כפתור Back של הדפדפן לא מסונכרן עם ה-stack.
- `scheme: "kosherapp"` מוגדר ב-`app.json` אבל אין מי שיטפל בו → deep links ו-Universal Links לא יעבדו ב-native.

זהו הפער הגדול ביותר בין "Expo app שרץ גם בדפדפן" לבין "Web App".

### P0-4 · 5.2MB JSON בתוך ה-bundle + עבודה סינכרונית ב-import

`OsmPlacesRepository.ts:5` עושה `import osmData from '../generated/places.osm.json'`. בזמן טעינת המודול, לפני רינדור ראשון:

- `:35-38` — parse ו-`map(sanitizePlace)` על **7,506 רשומות**
- `:39` — `sort` עם `localeCompare(…, 'he')` על 656 ערים (Intl — יקר)
- `:45` — `buildIndex()` בונה אינדקס MiniSearch מלא על 7,506 מסמכים, **סינכרונית על ה-JS thread**

תוצאות ה-build שמדדתי: **9.89MB raw / 1.25MB gzip, chunk יחיד, ללא code splitting**.

השלכות לפי פלטפורמה:
- **Web** — 1.25MB gzip לפני שמוצג פיקסל, ואז parse+index חוסמים. TTI גרוע במיוחד ב-3G/מכשיר בינוני.
- **Native** — כל עדכון דאטה (שדרוג כשרות, מסעדה חדשה) מחייב **build חדש וסבב חנות**. זה ההפך הגמור מהמטרה של מוצר דאטה חי.

### P0-5 · PWA לא שלם

מ-`dist/` שנבנה: אין `manifest.webmanifest`, אין service worker, אין offline shell. `scripts/patch-pwa.mjs` מזריק תגי `apple-*` בלבד → **ניתן להתקנה ב-iOS, לא ניתן להתקנה ב-Android**. בנוסף `dist/index.html` נבנה עם `lang="he"` אבל **בלי `dir="rtl"`**, למרות ש-`app.json` מצהיר `"dir": "rtl"`.

זו החמצה כפולה: כל הדאטה כבר bundled — האפליקציה *יכולה* לעבוד לגמרי offline, ואין SW שיממש את זה.

### P0-6 · Leaflet נטען מ-CDN חיצוני לתוך WebView פתוח

`src/components/map/leafletHtml.ts:55-64` טוען `leaflet@1.9.4` ו-`leaflet.markercluster@1.5.3` מ-`unpkg.com`, **בלי SRI ובלי fallback**. `LeafletMap.tsx:26` מגדיר `originWhitelist={['*']}`.

- **פונקציונלית:** אין מפה בלי אינטרנט — גם ב-native, גם כשכל הדאטה מקומי.
- **אבטחתית:** CDN צד-שלישי מזריק JS שרירותי ל-WebView עם whitelist פתוח.
- **תאימות:** חסימת CDN (רשת ארגונית, מדינה) שוברת פיצ'ר ליבה.

הפתרון: לארוז את Leaflet כ-asset מקומי (`expo-asset`), או להחליף ל-`react-native-maps`/`@maplibre/maplibre-react-native` ב-native ולהשאיר Leaflet ל-web בלבד.

### P0-7 · Nominatim — הפרת מדיניות שקטה

`src/hooks/useCityName.ts:28-31` שולח `User-Agent` ו-`Referer` ב-`fetch`. אלה **forbidden headers** בדפדפן — הם מושמטים בשקט. מדיניות השימוש של Nominatim מחייבת זיהוי; בלעדיו ה-IP חשוף לחסימה, ו-`catch {}` ריק אומר שהמשתמש לא יראה שום שגיאה — רק שם עיר שלא מופיע.

---

## 3. ממצאים — P1: חוב ארכיטקטוני

### P1-1 · ה-Design System קיים ורוב האפליקציה עוקפת אותו

`src/theme/` בנוי היטב: `colors.ts` (פלטה ממורכזת עם הערות למה כל צבע נבחר), `spacing.ts` (4pt grid + `radius` + `sizes` + `shadow`), `typography.ts`.

ובכל זאת — **215 ליטרלים של צבע hex מחוץ ל-`src/theme/`**, ועוד 14 `rgba()`. דוגמאות:

- `src/components/home/DailyCarousel.tsx` — `#7B5EA7` חוזר 4 פעמים כליטרל, למרות ש-`colors.categoryCafe` הוא בדיוק אותו ערך.
- `src/components/home/NearbyHorizontalList.tsx:20-31` — מפת `TYPE_BG` שלמה של 12 צבעי רקע, מחוץ ל-theme.
- `src/screens/HomeScreen.tsx:42-49` — `ALL_SHORTCUTS` מערבב `colors.categoryCafe` (נכון) עם `bg: '#F0EAF8'` (ליטרל) **באותה שורה**.

בנוסף, `shadowOpacity`/`elevation` מוגדרים ידנית ב-5 מקומות למרות `shadow.card` / `shadow.raised`.

**המשמעות:** אי אפשר לעשות rebrand, ו-**dark mode לא ניתן למימוש** בלי לגעת בכל קובץ. `app.json` נעול על `"userInterfaceStyle": "light"` ואין שימוש ב-`useColorScheme` בשום מקום. ב-2026 זה פער תאימות אמיתי בשלוש הפלטפורמות.

חסר גם ב-theme עצמו: אין semantic tokens (`colors.text.primary`, `colors.bg.elevated`), אין `zIndex` scale (`zIndex: 10` פזור), אין motion tokens.

### P1-2 · i18n עם 5 שפות — ורוב הטקסט לא עובר דרכו

`src/i18n/` תומך ב-he/en/es/ru/fr עם טיפוס `Strings` נגזר. אבל:

- **224 ליטרלים בעברית** ב-`src/screens` ו-`src/components`.
- **רק 13 מתוך 57** קבצי `.tsx` משתמשים ב-`useLanguage`.
- `src/navigation/TabNavigator.tsx:67-71` — **שמות כל חמשת הטאבים מקודדים קשיח בעברית**, כשה-i18n כבר מכיל `tabs.home`.
- `src/screens/HomeScreen.tsx:40` — `HEBREW_DAYS` מערך קשיח.
- `src/data/jewish-content/types.ts` — `TOPIC_LABELS` ו-`CONTENT_TYPE_LABELS` בעברית בתוך שכבת הדאטה.

**המשמעות:** מעבר ל-EN מייצר UI מעורב שבור. או שמסירים את 4 השפות המתות, או שמכניסים את כל הטקסט ל-i18n — המצב הנוכחי הוא הגרוע משני העולמות.

חסר גם: `Intl.PluralRules` (יש `resultsCount: (n) => …` ידני), פורמט תאריך/מספר לפי locale, ואין זיהוי שפת מכשיר ב-`LanguageContext.tsx:41` (ברירת מחדל קשיחה `'he'` במקום `expo-localization`).

### P1-3 · דליפת שכבה: mock seed נכנס לנתיב ה-production

`src/data/repository/filterPlaces.ts:5-8`:

```ts
import { CITIES_SEED } from '../seed/cities.seed';
const CITY_NAME_BY_ID = Object.fromEntries(CITIES_SEED.map(c => [c.id, c.name]));
```

`filterPlaces` הוא הנתיב הפעיל של `OsmPlacesRepository`, אבל הוא בונה מפת ערים מה-**seed הפיקטיבי** ולא מ-`cities.osm.json` (656 ערים). ה-fallback לחיפוש טקסטואלי (`:79`) מחפש לכן בשמות ערים שגויים, ו-`MOCK_LATENCY_MS` וכל ה-seed נגררים ל-bundle של production.

### P1-4 · מימוש מיקום כפול

שתי מערכות מקבילות שעושות אותו דבר:
- `src/hooks/useLocation.ts` (74 שורות) — **קוד מת מוכח**, אין לו צרכן אחד.
- `src/context/LocationContext.tsx` + `src/utils/locationPermission.ts` (399 שורות) — המערכת החיה.

בנוסף, `LocationContext.tsx:22,64,106,112,145,155` שומרים מיקום ב-**`(window as any).__karovLoc`** — global משתנה על `window`, מחוץ ל-React, ב-7 מקומות. זה גם anti-pattern וגם לא בטוח בין פלטפורמות. אם צריך גישה מחוץ ל-React — module-level store עם subscribe, לא `window`.

### P1-5 · אין שכבת שירות ל-API מרוחק

8 קריאות `fetch` פזורות ב-hooks ובמסך, עם URLs inline:

| קובץ | שירות |
|---|---|
| `useParasha.ts:108`, `useJewishDayInfo.ts:115,120`, `ZmanimScreen.tsx:89-90` | hebcal.com |
| `useParashaSummary.ts:21` | sefaria.org |
| `useCityName.ts:28` | nominatim |

בכולם: אין timeout, אין retry, אין backoff, אין `AbortController`, אין base-URL מקונפג, אין טיפוס תגובה (`const items: any[]`), ו-**`catch {}` ריק בכל אחד** — כשל רשת נראה בדיוק כמו "אין נתונים".

זה בולט במיוחד כי `PlacesRepository` הוא דוגמה מושלמת להפשטה הזו. `ZmanimScreen.tsx` קורא ל-hebcal ישירות מתוך רכיב UI — בדיוק מה שהארכיטקטורה של הדאטה נבנתה כדי למנוע.

**קריטי לרב-פלטפורמיות:** ב-Web הקריאות האלה כפופות ל-CORS ו-CSP; ב-native לא. מקור נפוץ לבאג "עובד בסימולטור, שבור בדפדפן".

### P1-6 · אין ניהול state לשרת, אין ErrorBoundary, אין telemetry

- `usePlaces.ts` מממש cache/loading/error ידנית עם `JSON.stringify(filters)` כמפתח תלות (`:24`) — הרצה מחדש על כל שינוי אובייקט. אין dedup, אין stale-while-revalidate. זה re-implementation חלקי של TanStack Query.
- **אין `ErrorBoundary` בכל הפרויקט.** חריגה ברינדור = מסך לבן, בשלוש הפלטפורמות.
- אין Sentry / crash reporting / analytics. באפליקציה שתרוץ בשלוש פלטפורמות, אין לך שום דרך לדעת שמשהו נשבר.

### P1-7 · אחסון מקומי לא מופשט

53 קריאות `AsyncStorage` ישירות ב-**23 קבצים**, כולל מתוך מסכים (`HomeScreen.tsx:82,93`, `ListScreen`, `LoginScreen`, `SplashScreen`). מפתחות כליטרלים מפוזרים (`'@karov/auth'` בשני קבצים, `'@karov/favoriteSynagogue'` מוגדר ב-`HomeScreen.tsx:59`).

אין רישום מפתחות מרוכז, אין schema, אין versioning/migration, אין טיפוסים — `JSON.parse` גולמי לתוך `any`. שינוי מבנה של ערך שמור ישבור התקנות קיימות בשקט.

ל-Web זו גם בעיה נפרדת: `AsyncStorage` על localStorage מוגבל ל-~5MB, סינכרוני-חוסם, ונמחק ב-Safari אחרי 7 ימי חוסר שימוש (ITP).

### P1-8 · ביצועים: מיון על כל מאגר הנתונים בכל render

`src/screens/HomeScreen.tsx:102-110`:

```ts
const list = [...places];                                        // עותק של 7,506
list.sort((a,b) => distanceKm(location,a.location) - distanceKm(location,b.location));
return list.slice(0, isDesktop ? 8 : 6);                         // כדי לקחת 6
```

`usePlaces()` בלי פילטרים מחזיר את כל 7,506 הרשומות. המיון מבצע `distanceKm` (haversine) **פעמיים בכל השוואה** — כ-**190,000 חישובי haversine** כדי לבחור 6 פריטים, בכל שינוי מיקום. על ה-JS thread, במסך הבית.

נכון: decorate-sort-undecorate (7,506 חישובים במקום 190,000), או selection של top-K ב-O(n).

בנוסף `NearbyHorizontalList.tsx:88` ו-`HomeScreen.tsx:284` מרנדרים ב-`.map()` בתוך `ScrollView` במקום רשימה מווירטואלת.

### P1-9 · God components

15 קבצי `.tsx` מעל 400 שורות; 16,374 שורות סה"כ בקבצים האלה:

| קובץ | שורות |
|---|---|
| `BrachotScreen.tsx` | 1,260 |
| `PlaceDetailScreen.tsx` | 1,198 |
| `HomeScreen.tsx` | 1,005 |
| `ListScreen.tsx` | 746 |

`HomeScreen` לבדו מנהל 7 פיסות state, 3 קריאות AsyncStorage, ניווט, לוגיקת פילטרים, חישוב מרחקים, ו-4 מודאלים. אין הפרדת container/presentation, ולוגיקה עסקית יושבת ברכיבים.

### P1-10 · תיעוד שנפרד מהמציאות

`README.md` מתאר **MapLibre** (הוחלף ב-Leaflet), טאבים `בית/מפה/רשימה` (בפועל: `Home/Favorites/Brachot/Zmanim/Community`), ו-`DATA_SOURCE: 'mock' | 'supabase'` (בפועל `'osm'`). `STATUS.md` (עודכן 2026-07-08) מצהיר **5,535 מקומות** — בפועל **7,506**, ומצהיר "מובייל בלבד, לא אתר" — בסתירה למטרה הנוכחית.

זה קריטי במיוחד לעבודה עם agents: agent שיקרא את `README.md` יקבל תמונה שגויה של הסטאק.

### P1-11 · קוד מת ו-repo bloat

- `src/screens/MapScreen.tsx` (162 שורות) — **לא רשום בשום navigator**, לא נגיש.
- `src/hooks/useLocation.ts` — אין צרכן.
- `web/index.html` (6.7KB) — דף נחיתה שה-build לא נוגע בו.
- `src/data/generated/` = **82MB**, מתוכם ~77MB קבצי `.backup.json` / `.bak-*` **מנוהלים ב-git**. 28 קבצי גיבוי, כולל שלושה זוגות זהים.
- `scripts/` = **180 קבצים** — סקריפטים חד-פעמיים (`fix-golda.mjs`, `fix-humus-eli-encoding.mjs`, `fix-burgers-remove-koko.mjs`), קבצי `.log`/`.err`, ו-`places-before-hours.json` (3MB).

`.git` הוא 17MB היום ויגדל בכל snapshot. גיבויים שייכים ל-git עצמו, לא ל-`src/`.

---

## 4. ממצאים — P2: איכות ותחזוקה

| # | ממצא | ראיה |
|---|---|---|
| P2-1 | **אפס טסטים** | אין `*.test.*` / `*.spec.*` / `__tests__` בכל הפרויקט |
| P2-2 | **אפס lint/format** | אין `eslint.config.*`, אין `.prettierrc` — אבל יש `eslint-disable` ב-8 מקומות שלא עושים כלום |
| P2-3 | **נגישות מינימלית** | 18 props של נגישות בסך הכל על 57 רכיבים. `Pressable` בלי `accessibilityRole`, אייקונים בלי label. חסימה לחנויות ולתקן הנגישות הישראלי |
| P2-4 | **Hermes V1 memory regression** | `expo-doctor`: SDK 56 עם Hermes 250829098.0.10 — מושפע מרגרסיית זיכרון ידועה. תוקן ב-0.16 / RN 0.86.2 / SDK 57 |
| P2-5 | **5 חבילות לא מסונכרנות** | `react-native-screens` 4.25.2 (נדרש ~4.26.0), `expo` 56.0.12 (נדרש ~56.0.20), `expo-constants`, `expo-location`, `@expo/metro-runtime` |
| P2-6 | **פונט אייקונים מלא ב-build** | ה-export כולל את כל 19 משפחות `@expo/vector-icons` (~3.5MB, מתוכן MaterialCommunityIcons 1.3MB) — בשימוש: Ionicons בלבד |
| P2-7 | **`applyHeeboFont` עושה monkey-patch ל-`Text.render`** | `src/theme/fonts.ts:52-79` — פותר בעיה אמיתית (משקלים בפונט מותאם), אבל שביר מול שדרוגי RN. עדיף `<AppText>` |
| P2-8 | **37 שימושי `any`** | רובם `Ionicons name={x as any}` — נפתר עם `keyof typeof Ionicons.glyphMap` |
| P2-9 | **אין רישוי/ייחוס ל-OSM ב-UI** | הדאטה תחת ODbL; אין מסך attribution. חובה משפטית לפני פרסום בחנויות |

---

## 5. תוכנית CI/CD — עיצוב מלא

> אומת מול התיעוד הרשמי: `docs.expo.dev/eas/json`, `docs.expo.dev/build-reference/app-versions`, `docs.expo.dev/eas-update/github-actions`, `docs.expo.dev/versions/v56.0.0/sdk/updates`.

### 5.1 עקרון מנחה — שני מסלולי שחרור

הקריטי ביותר: **הפרדה בין שינוי JS/דאטה לבין שינוי native.**

```
שינוי JS או דאטה  →  EAS Update (OTA)     →  דקות, בלי חנות
שינוי native/SDK  →  EAS Build → Submit   →  ימים, דרך חנות
שינוי כלשהו       →  Vercel (Web)         →  דקות
```

עם `runtimeVersion.policy = "fingerprint"`, EAS מחשב hash של ה-runtime הנייטיב ומונע אוטומטית שליחת OTA לא-תואם. **זו המדיניות הנכונה לפרויקט הזה** לפי התיעוד של SDK 56.

### 5.2 תנאי סף (לפני שכותבים workflow אחד)

```bash
npx expo install expo-updates          # P0-2 — גם מתקן את reloadApp השבור
npx eas-cli@22 init                    # יוצר extra.eas.projectId
npx eas-cli@22 update:configure        # מגדיר updates.url
```

ב-`app.json` (או עדיף — `app.config.ts`, ראה 6.2):
```json
"runtimeVersion": { "policy": "fingerprint" }
```

### 5.3 `eas.json`

```jsonc
{
  "cli": {
    "version": ">= 13.0.0",
    "appVersionSource": "remote",   // מומלץ מ-EAS CLI 12.0.0 ומעלה
    "requireCommit": true
  },
  "build": {
    "base": {
      "node": "22.20.0",
      "env": { "EXPO_PUBLIC_ENV": "production" }
    },
    "development": {
      "extends": "base",
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "ios": { "simulator": true },
      "env": { "EXPO_PUBLIC_ENV": "development" }
    },
    "preview": {
      "extends": "base",
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_ENV": "staging" }
    },
    "production": {
      "extends": "base",
      "distribution": "store",
      "channel": "production",
      "autoIncrement": true,          // עם appVersionSource=remote → versionCode/buildNumber
      "android": { "buildType": "app-bundle" },
      "ios": { "resourceClass": "m-medium" }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./secrets/play-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "$EXPO_APPLE_ID",
        "ascAppId": "$EXPO_ASC_APP_ID",
        "appleTeamId": "$EXPO_APPLE_TEAM_ID"
      }
    }
  }
}
```

### 5.4 מבנה ה-workflows

**`.github/workflows/ci.yml`** — שער על כל PR. חייב להיות ראשון.
```yaml
name: CI
on:
  pull_request:
  push: { branches: [master] }
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit                 # עובר נקי היום — נועלים את זה
      - run: npx expo lint --max-warnings=0   # אחרי הקמת ESLint
      - run: npm test -- --ci                 # אחרי הקמת Jest
      - run: npx expo-doctor
      - run: npx expo export --platform web   # build smoke — כשל build לא מגיע ל-master
      - name: Bundle budget
        run: |
          SIZE=$(gzip -c dist/_expo/static/js/web/*.js | wc -c)
          echo "gzip: $((SIZE/1024))KB"
          test "$SIZE" -lt 1500000 || { echo "::error::bundle over budget"; exit 1; }
```
ה-budget מתחיל ב-1.5MB (מעל 1.25MB הנוכחי) ויורד בכל אבן דרך של פרק 6 — כך שגודל ה-bundle לא יכול להידרדר שוב בשקט.

**`.github/workflows/data-validate.yml`** — שער ייעודי לדאטה, מופעל ב-`paths: ['src/data/generated/**']`. מריץ סכמה + בדיקות שפיות (קואורדינטות בגבולות ישראל, אין `id` כפול, כל רשומת מסעדה עם כשרות, אין רגרסיה בספירה). זה מה שמגן על ליבת המוצר.

**`.github/workflows/web-deploy.yml`** — Vercel על `push: master`. להעביר את ה-build מ-Vercel ל-Actions (`vercel deploy --prebuilt`) כדי שאותו artifact שנבדק ב-CI הוא זה שנפרס. סודות: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

**`.github/workflows/preview.yml`** — לפי התבנית הרשמית של Expo: `expo/expo-github-action@v8` + `expo/expo-github-action/preview@v8` עם `eas update --auto`. מפרסם QR בתגובה ל-PR. סוד: `EXPO_TOKEN`.

**`.github/workflows/eas-update.yml`** — OTA לייצור על `push: master`, מסונן ב-`paths-ignore` לקבצי native/config:
```yaml
- run: eas update --branch production --message "${{ github.event.head_commit.message }}"
```

**`.github/workflows/eas-build.yml`** — `workflow_dispatch` + `push: tags: ['v*']`:
```yaml
- run: eas build --platform all --profile production --non-interactive --auto-submit
```

**`.github/workflows/data-refresh.yml`** — `schedule: cron` שבועי. מריץ importers, ואם יש diff → פותח PR אוטומטי עם דוח שינויים. הופך תחזוקת דאטה מ-180 סקריפטים ידניים לתהליך נשלט.

### 5.5 הגנות repo

- Branch protection על `master`: PR חובה, `verify` כ-required check, `requireCommit: true` ב-EAS.
- Dependabot / Renovate על `npm` + `github-actions` (מטפל ב-P2-4/P2-5 באופן שוטף).
- Environments: `production` עם approval ידני ל-`eas-build`.
- `EXPO_TOKEN`, `VERCEL_*`, `EXPO_APPLE_*` כ-repository secrets בלבד.

---

## 6. ארכיטקטורת יעד

### 6.1 הדאטה יוצא מה-bundle — השינוי בעל המנוף הגבוה ביותר

זה פותר במכה אחת את P0-4, את בעיית עדכון הדאטה ב-native, ומקצר משמעותית את ה-TTI ב-web:

```
┌─────────────────────────────────────────────────┐
│  build-time:  places.osm.json                   │
│    → פיצול לפי אזור/סוג + מניפסט עם hash        │
│    → העלאה ל-CDN (Vercel Blob / Supabase Storage)│
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  runtime:  RemotePlacesRepository                │
│    • seed מינימלי ב-bundle (עובד ביום 0 offline) │
│    • רענון ברקע לפי hash במניפסט                 │
│    • cache מתמיד (SQLite ב-native / IndexedDB)   │
│    • buildIndex אסינכרוני אחרי paint ראשון       │
└─────────────────────────────────────────────────┘
```

הממשק `PlacesRepository` **כבר תומך בזה** — זו הוספת מימוש רביעי ל-`config.ts:14`, בלי לגעת במסך אחד. זו העדות הטובה ביותר לכך שהארכיטקטורה המקורית נכונה.

### 6.2 `app.config.ts` במקום `app.json`

קונפיג דינמי לפי `EXPO_PUBLIC_ENV`: `bundleIdentifier` נפרד לכל סביבה (`com.karov.app.dev`) כדי שאפשר להתקין dev/staging/prod במקביל, שם אפליקציה עם סיומת, ו-`extra` מוזרק. `app.json` סטטי לא מאפשר את זה.

### 6.3 שכבות היעד

```
app/            App.tsx, providers, linking config, ErrorBoundary
├─ navigation/  navigators + linking (URL ↔ route) ← חסר היום
├─ screens/     תצוגה בלבד — לוגיקה יורדת ל-hooks
├─ features/    ← חדש: places/ · content/ · zmanim/ · karov-lev/
│                 כל feature: components + hooks + services + types
├─ shared/
│  ├─ ui/       primitives של design system (AppText, Card, Button…)
│  ├─ theme/    tokens סמנטיים + light/dark
│  ├─ storage/  ← חדש: מפתחות ממורכזים + schema + migration
│  └─ api/      ← חדש: HTTP client (timeout/retry/abort) + hebcal/sefaria/geocode clients
└─ data/        repositories (קיים, לשמר)
```

שלוש התיקיות המסומנות `חדש` הן בדיוק ההפשטות שחסרות; שאר המבנה כבר קיים ותקין.

### 6.4 "Agentic code" — מה חסר כדי שסוכנים יעבדו כאן בבטחה

הקוד **קריא** לסוכנים (טיפוסים טובים, הערות שמסבירות *למה*, `AGENTS.md` קיים) אבל **לא בטוח** להם — אין שום מנגנון שיעצור שינוי שגוי:

| חסם | פתרון |
|---|---|
| אין טסטים → אין דרך לדעת שרגרסיה קרתה | Jest + `@testing-library/react-native`. להתחיל ב-pure logic: `filterPlaces`, `openingHours`, `zmanim`, `searchEngine`, `jewish-content/repository` — מכוסים בקלות, מספקים ערך מיידי |
| אין lint → סטייה מהקונבנציה לא נתפסת | ESLint + כללים מותאמים שאוסרים על hex ליטרלי מחוץ ל-`theme/` ועל מחרוזות עברית מחוץ ל-`i18n/`. זה הופך את P1-1 ו-P1-2 מבלתי-פתירים ל-נשמרים אוטומטית |
| תיעוד לא נכון (P1-10) → סוכן פועל על הנחות שגויות | `README` שנוצר מהקוד; בדיקת CI שמאמתת ספירות ב-`STATUS.md` מול `places.osm.json` |
| 180 סקריפטים חד-פעמיים ללא חוזה | לאחד ל-CLI אחד עם תתי-פקודות + dry-run + סכמת פלט אחידה; לארכב את השאר |
| `AGENTS.md` = שורה אחת | להרחיב: אילו קבצים נוצרים אוטומטית, כללי הדאטה (additive-only, 0 מחיקות), פקודות אימות, גבולות שכבה |

---

---

## מצב יישום — עודכן 2026-08-22

| # | ממצא | מצב |
|---|---|---|
| P0-1 | אין CI/CD | ✅ 6 workflows: `ci` · `data-validate` · `web-deploy` · `preview` · `eas-update` · `eas-build` |
| P0-2 | native לא הוקם | ✅ `expo-updates` + `app.config.ts` (3 וריאנטים) + `eas.json`. ⏳ נותר: `eas init` + `eas update:configure` (דורש חשבון) |
| P0-3 | אין deep linking | ✅ `src/navigation/linking.ts` + rewrites ב-Vercel + הגנה ב-SplashScreen |
| P0-4 | 5.2MB בתוך ה-bundle | ⏳ שלב 4. bundle ירד מ-1.25MB ל-**1.19MB** gzip, budget נאכף ב-CI ואומת על PR חי |
| P0-5 | PWA חלקי | ✅ manifest · service worker · `dir="rtl"` · OG/Twitter · shortcuts |
| P0-6 | Leaflet מ-CDN | ✅ מקובע מקומית (`vendor/leaflet-assets.ts`). אין יותר בקשה חיצונית ל-WebView |
| P0-7 | Nominatim — headers נחסמים | ✅ זיהוי דרך `email` param + `retries: 0` לפי המדיניות |
| P1-1 | 215 צבעים קשיחים | ⏳ נמדד: 129 ערכים ייחודיים, 11 כבר קיימים ב-theme. ההמרה + dark mode פתוחים |
| P1-2 | 224 מחרוזות עברית | ⏳ נמדד: 668 מופעים. הוחלט **להשלים** את 5 השפות, לא להסיר |
| P1-3 | דליפת `CITIES_SEED` | ✅ הוזרק דרך פרמטר + כלל ESLint שחוסם חזרה + טסט רגרסיה |
| P1-4 | מימוש מיקום כפול | ✅ `useLocation.ts` נמחק · `window.__karovLoc` → `context/locationCache.ts` |
| P1-5 | אין שכבת API | ✅ `src/shared/api/` — client עם timeout/retry/abort/שגיאות מוטפסות + hebcal/sefaria/geocode |
| P1-6 | אין ErrorBoundary / telemetry | ✅ ErrorBoundary. ⏳ Sentry פתוח |
| P1-7 | אחסון לא מופשט | ✅ `src/shared/storage/` — רישום מפתחות + get/set מוטפסים. ⏳ 4 מסכים עדיין קוראים ישירות |
| P1-8 | מיון O(n log n) עם haversine | ✅ `nearestBy`/`sortedByDistance`/`withinRadius` — **21.4× פחות** חישובים, תוצאה זהה |
| P1-9 | God components | ⏳ פתוח |
| P1-10 | תיעוד לא נכון | ✅ README · STATUS · AGENTS נכתבו מחדש מול המציאות |
| P1-11 | קוד מת ו-repo bloat | ✅ 82MB → 6.3MB ב-`src/data/generated`; MapScreen/useLocation/web נמחקו |
| P2-1 | אפס טסטים | ✅ **132 טסטים** ב-9 קבצים |
| P2-2 | אפס lint | ✅ ESLint עם שומרי סף ארכיטקטוניים (0 errors) + Prettier |
| P2-3 | נגישות | ⏳ פתוח |
| P2-4 | Hermes V1 regression | ✅ **SDK 57 + RN 0.86**. expo-doctor: 21/21 עוברות, אפס בעיות |
| P2-5 | חבילות לא מסונכרנות | ✅ `expo install --check` נקי |
| P2-6 | 19 פונטי אייקונים | ✅ ייבוא ישיר של Ionicons — **19 → 1** פונט |
| P2-9 | אין ייחוס ל-OSM | ✅ ODbL + כל המקורות ב-AboutModal |

### באגים שהתגלו ותוקנו בדרך (לא היו בסקירה)

1. **12 מקומות בלתי-נראים** — `location: {lat,lng}` במקום `{latitude,longitude}` גרם ל-`sanitizePlace` למחוק אותן בשקט. תוקנו בדאטה, ב-3 הסקריפטים שיצרו את זה, ונאכף בוולידטור.
2. **BOM ב-8 קבצים חיים** — `cities.osm.json` שבר `JSON.parse` בכל כלי חיצוני.
3. **`require('expo-updates')` לחבילה לא מותקנת** — מעבר שפה עם היפוך RTL לא רענן את האפליקציה לעולם.
4. **`onPress={load}`** ב-ZmanimScreen העביר אירוע מגע כארגומנט — נתפס ע"י tsc אחרי החתימה החדשה.
5. **אי-התאמה הלכתית** — `useJewishDayInfo` מבקש מ-Hebcal לוח **חו"ל** (בלי `i=on`) בעוד `useParasha` מבקש `geo=il`. שני מקורות חלוקים על אילו ימים הם יום טוב. **לא שיניתי — זו החלטה הלכתית שלך.**


### מצב GitHub (אומת מול ה-API)

| | |
|---|---|
| ענף | `chore/architecture-review` — 11 קומיטים, נדחף |
| PR | [#1](https://github.com/nakashdin/Karov-app/pull/1) |
| CI | **ירוק** — `CI` · `Dataset` · `EAS Preview` כולם success על PR אמיתי |
| Environment | `production` קיים |
| `EXPO_TOKEN` | ❌ לא מוגדר — `preview` ו-`eas-update` **מדלגים** (לא נכשלים) |
| Branch protection | ❌ חסום: *"Upgrade to GitHub Pro or make this repository public"* |

### סעיף 8 — דאטה

| | לפני | אחרי |
|---|---|---|
| `unknownCityId` | 28 | **0** |
| `missingCityId` | 18 | **8** (כולם ללא כתובת) |
| ערים ברשימה | 656 | **679** |
| כפילויות אמיתיות | — | **35 מוזגו** (`extra.mergedFrom` שומר provenance) |
| `foodWithoutKashrut` | 20 | 20 — **פתוח**: 18 יקבים + 2 רי-בר שדורשים אימות כשרות ממקור רשמי |


## 7. Roadmap מומלץ

### שלב 0 — עצירת הדימום (~שבוע)
1. `ci.yml` עם `tsc --noEmit` + `expo export` smoke — **לפני כל שאר העבודה**
2. ESLint + Prettier + Jest, גם אם מתחילים עם 3 קבצי טסט
3. הסרת קבצי גיבוי מ-`src/data/generated/` (28 קבצים / ~77MB)
4. מחיקת קוד מת: `MapScreen.tsx`, `useLocation.ts`, `web/index.html`
5. סנכרון 5 החבילות (`npx expo install --check`)
6. עדכון `README.md` + `STATUS.md` למציאות

### שלב 1 — פתיחת המסלול הנייטיב (~שבועיים)
7. `expo-updates` + `eas init` + `runtimeVersion: fingerprint`
8. `eas.json` + `app.config.ts` לשלוש סביבות
9. build ראשון: `eas build -p all --profile preview` — **זה כנראה יחשוף בעיות שלא נראות עד שבונים באמת**
10. `preview.yml` + `eas-update.yml` + `eas-build.yml`
11. `ErrorBoundary` + Sentry

### שלב 2 — הפיכת ה-Web ל-Web App אמיתי (~שבועיים)
12. `linking` config → URL לכל מקום (`/place/:id`) — פותח שיתוף ו-SEO
13. `manifest.webmanifest` + service worker + offline shell
14. `dir="rtl"` ב-HTML הנבנה
15. Leaflet מקומי במקום unpkg
16. תיקון P1-8 (מיון) + הוצאת פונטי אייקונים מיותרים

### שלב 3 — פירעון החוב הארכיטקטוני (~חודש)
17. `shared/api` + `shared/storage` + מיגרציה של 8 ה-`fetch` ו-53 קריאות ה-AsyncStorage
18. תיקון דליפת `CITIES_SEED` (P1-3) והסרת `window.__karovLoc` (P1-4)
19. Design tokens סמנטיים → הכנסת 215 הצבעים ל-theme → dark mode
20. הכרעה על i18n: להשלים 224 המחרוזות, או להסיר 4 שפות
21. פירוק 4 ה-god components
22. נגישות: `accessibilityRole`/`accessibilityLabel` לכל אלמנט אינטראקטיבי + מסך attribution ל-OSM

### שלב 4 — הדאטה יוצא מה-bundle
23. `RemotePlacesRepository` + מניפסט + cache מתמיד + `buildIndex` אסינכרוני
24. `data-refresh.yml` — עדכון דאטה אוטומטי דרך PR
25. הורדת ה-budget ב-`ci.yml` לערך החדש

---

## 8. השורה התחתונה

הליבה שנבנתה כאן — repository pattern, מודל דומיין, provenance, תת-מערכת התוכן — **טובה מספיק כדי לשאת מוצר בשלוש פלטפורמות**. היא לא הבעיה.

הבעיה היא שהיא נבנתה כ-MVP למובייל (`STATUS.md`: *"מובייל בלבד — לא אתר"*) ומאז גדלה פי כמה בלי ששכבת האכיפה גדלה איתה. אין CI, אין טסטים, אין lint — ולכן כל דפוס טוב שהוגדר (theme, i18n, repository) נשחק בהדרגה בקצוות: 215 צבעים קשיחים, 224 מחרוזות עקופות, seed שדולף לייצור.

**הסדר הנכון הוא לא לתקן את 215 הצבעים קודם.** הוא להקים את שער ה-CI, ואז לתקן — כי אחרת הם יחזרו. ואחריו, פתיחת מסלול ה-native: `eas build` ראשון יחשוף דברים שאף סקירה סטטית לא יכולה לחשוף.
