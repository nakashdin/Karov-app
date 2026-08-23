# AGENTS.md — הנחיות לעבודה על הריפו הזה

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
This project is on **SDK 57** (React Native 0.86). Do not rely on remembered APIs — check the versioned page first.

---

## הפקודה שחייבת לעבור

```bash
npm run verify      # typecheck + lint + test + data:validate
```

אל תסיים משימה בלי שהיא עוברת. זה בדיוק מה שה‑CI מריץ (`.github/workflows/ci.yml`).

| בדיקה | פקודה | מה נכשל בה |
|---|---|---|
| טיפוסים | `npm run typecheck` | `tsc --strict`. חייב להיות נקי — הוא נקי היום |
| lint | `npm run lint` | **0 errors**. warnings = backlog ידוע, ראה למטה |
| טסטים | `npm test` | 233 טסטים (המספר גדל — הבדוק את הפלט בפועל, לא את המספר כאן) |
| דאטה | `npm run data:validate` | שלמות `places.osm.json` |

---

## גבולות ארכיטקטורה (נאכפים ב-ESLint, לא בכוונות טובות)

1. **הדאטה נגיש רק דרך `placesRepository`.**
   אסור `import` מ‑`src/data/generated/*` או מ‑`src/data/seed/*` מחוץ ל‑`src/data/`. ה‑seed הוא דמו פיקטיבי — אם הוא דולף לקוד ייצור, המשתמש רואה מקומות שלא קיימים.

2. **אין צבע גולמי מחוץ ל‑`src/theme/`.**
   `'#1E7A46'` בקומפוננטה = warning. הוסף ל‑`src/theme/colors.ts` וייבא מ‑`../theme`. בלי זה אין rebrand ואין dark mode.

3. **אין מחרוזת עברית קשיחה** ב‑`src/screens/`, `src/components/`, `src/navigation/`.
   הכל דרך `src/i18n/*.ts` ו‑`useLanguage()`. יש 5 שפות; מחרוזת קשיחה שוברת 4 מהן.

כללים 2–3 הם `warn` היום כי יש backlog ידוע (~900 מופעים, ראה `docs/ARCHITECTURE_REVIEW.md` §P1-1 ו‑§P1-2). **אל תוסיף מופעים חדשים.** כשספרייה מנוקה — העלה אותה ל‑`error` ב‑`eslint.config.js`.

---

## קבצים שנוצרים אוטומטית — לא לערוך ביד

| נתיב | נבנה ע"י |
|---|---|
| `src/data/generated/*.json` | `importers/` + `scripts/` |
| `dist/` | `expo export` |
| `scripts/data-quality-baseline.json` | `npm run data:baseline` |
| `data-backups/` | תמונות מצב היסטוריות — מחוץ ל‑git, לא לגעת |

---

## כללי הדאטה — אלה לא המלצות

- **Additive‑only. אפס מחיקות.** רשומה לא נמחקת אף פעם. אם היא שגויה — מתקנים אותה.
- **Provenance לכל רשומה.** `source` + `sourceUrl` + `lastVerifiedAt` ככל שאפשר.
- **מסעדה בלי כשרות לא נכנסת.** אין תעודה → אין רשומה.
- **`location` הוא תמיד `{ latitude, longitude }`.** הצורה `{ lat, lng }` נמחקת בשקט ע"י `sanitizePlace` והמקום נעלם מהאפליקציה בלי שגיאה. הוולידטור תופס את זה; `scripts/fix-location-shape.mjs` מתקן.
- **גיבוי לפני כל merge**, ואז `npm run data:validate`.

מקורות תוכן תורני: **רק Sefaria ו‑Chabad.org**. אסור לייחס לרש"י/רמב"ם/רד"ק בלי אימות מול המקור. זו תורה — טעות כאן היא לא באג.

---

## מה כן ומה לא בסקופ

- **`docs/ARCHITECTURE_REVIEW.md` הוא מפת הדרכים.** כל ממצא ממוספר (P0‑1, P1‑3, …). כשאתה מתקן — עדכן את הסטטוס שם.
- שינוי תוכן יומי = תוכן בלבד. בלי מסכי הגדרות ובלי העדפות משתמש, אלא אם התבקש.
- **פילטר הכשרות נשאר פשוט** (רבנות/בד"ץ ברמת קבוצה). המידע המפורט חי בכרטיס המקום, לא בפילטר.

---

## מלכודות ידועות

- **`window.__karovLoc`** — global על `window` ב‑`LocationContext`. לא להרחיב את השימוש; מיועד להסרה (P1‑4).
- **`src/theme/fonts.ts` עושה monkey‑patch ל‑`Text.render`** כדי למפות `fontWeight` למשפחת Heebo. שביר מול שדרוגי RN — אם טקסט מאבד משקל אחרי שדרוג, זה המקום.
- **23 סקריפטים ב‑`scripts/` מכילים נתיב מוחלט** (`C:\Users\...`). הם לא ירוצו ב‑CI ולא אצל אף אחד אחר.
- **אימות מסלול iOS אסור בדפדפן המובנה** — הוא מזדהה כאנדרואיד. לסמלץ את ה‑API החסר, לא לקבל תשובה "תקינה".
