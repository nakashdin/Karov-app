# NATIONAL SYNAGOGUE EXPANSION — STRATEGY & ARCHITECTURE

| | |
|---|---|
| **Type** | Research & architecture only — **no code, no data, no import** |
| **Date** | 2026-06-19 |
| **Source of truth** | `docs/importers/SYNAGOGUE_IMPORT_STATUS.md` (this doc does NOT supersede it) |
| **Status** | Proposal — awaiting approval before any implementation |
| **Coordinate policy (DECIDED)** | **Original coordinates only.** No address-geocoding for synagogues. Address-only records get coordinates ONLY via authoritative point-match (GovMap/OSM); otherwise `held` — never invented. |

> מסמך זה הוא **תכנון בלבד**. הוא לא משנה דאטה חי, לא מייבא, ולא נוגע באפליקציה. כל מימוש עתידי כפוף ל-Golden Rules וללתהליך-הברזל המתועדים ב-`SYNAGOGUE_IMPORT_STATUS.md`.

> **🟢 STATUS UPDATE (2026-06-19) — ArcGIS: planned/POC → PRODUCTION / MERGED LIVE.**
> ה-GIS adapter (Phase 2 במסמך) מומש ומוזג לחי — אבל **ישירות מול שרתי ArcGIS REST עירוניים**, לא דרך GovMap (שהתברר token-gated/מפוצל). **8 ערים מחוברות:** תל אביב · חיפה · אשדוד · אשקלון · ירושלים · נהריה · מודיעין · נוף הגליל. **+1,291 בתי כנסת נטו** (קואורד׳ מקוריות, `outSR=4326`), 99 הועשרו, 20 held, 0 מחיקות. adapter גנרי (עיר = config). פירוט: `SYNAGOGUE_IMPORT_STATUS.md` §7A.

---

## 0. Framing — שתי תובנות שמשנות את הכיוון

1. **התקרה של המודל הנוכחי נמוכה.** המודל "מועצה אחת = אתר אחד" עובד, אבל מתוך 126 המועצות רק **~15 הן SabaiApps** (12%, מאומת ב-`council-domain-summary.json`). חיבור כל 126 המועצות לא ייתן כיסוי לאומי — לא כל בית כנסת שייך למועצה דתית עם דירקטורי דיגיטלי.
2. **המנוף האמיתי = אגרגטורים לאומיים, לא מועצות.** מקורות שבהם **adapter אחד = מאות ערים**: כיפה (`kipa.co.il`), GovMap הממשלתי, data.gov.il, Godaven. המעבר מ"קצירת עלים" (מועצה-מועצה) ל"מקורות-על" הוא השינוי הארכיטקטוני המרכזי.

**בסיס כיסוי:** הערכה תעשייתית (טעונה אימות) ~**11,000–13,000** בתי כנסת בישראל. החי = **2,739 → ~21–25% כיסוי**. כל המסמך עוסק בסגירת ה-75% הנותרים בצורה scalable.

> **השפעת מדיניות הקואורדינטות שנבחרה:** מאחר שהוחלט "רק קואורדינטות מקוריות", הערך נטו של מקורות עשירי-מטא-דאטה אך חסרי-קואורד׳ (כיפה, חלק מ-WP-other) **מותנה** בהתאמת-נקודה מוסמכת. רשומה שלא נמצאת לה קואורדינטה מוסמכת → `held`, לא מוזגת. זה מוריד את ה-net-gain הריאלי של אותם מקורות, ומעלה את חשיבות **GovMap/OSM כשכבת-קואורדינטות** שמזינה אותם.

---

## 1. National Source-Family Report

מבוסס על: הקוד החי (`resolve-councils.ts` → `detectCms`, 15/126 SabaiApps), הקטלוגים, וסקר-רשת. כל מספר שאינו מהקוד מסומן `est` (הערכה) או `?` (טעון אימות).

### A. מקורות per-site (מועצה/אתר בודד)

| # | משפחה | CMS/Platform | נפוצות | קואורד׳ | כתובת | טלפון | נוסח | זמני תפילה | REST | Static/JS | חוקיות | קושי |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **SabaiApps Directories Pro** | WordPress + plugin | **15/126** (מאומת) | ✅ מקורי (waze/markers) | ✅ | ✅ | ✅ | חלקי | ✅ `wp-json/.../synagogues_dir_ltg` + `X-WP-Total` | Server-HTML + JSON markers | `/directory-synagogues/` מותר ברוב | 🟢 נמוך (בנוי) |
| 6 | **WordPress-other / מועצות גדולות** | WP themes / custom | 7+ (י-ם `rabanut.org.il`, ת"א `rabanut.co.il`, רחובות `dat-rehovot.co.il`, אשדוד `ashdodmd.org`, חיפה `mdhaifa.org`) | חלקי? (חלק address-only) | ✅ | חלק | חלק | חלק | חלק `wp-json` | מעורב | פר-אתר | 🟠 בינוני–גבוה |
| 7 | **Wix** | Wix Data Collections | 2 (`mdmotzkin.org`, `datit-bh.org.il`) | חלק? | ✅ | ? | ? | ? | Wix Data API (פנימי) | **JS-rendered** | לבדוק | 🟠 בינוני |
| 3c | **Custom municipal** | פורטל ייעודי | 14 (`custom`: מבשרת, זכרון יעקב, רמת-הגולן…) | משתנה | משתנה | — | — | — | לרוב לא | מעורב | פר-אתר | 🔴 גבוה |

### B. מקורות-על (aggregator — adapter אחד → ערים רבות) — הלב האסטרטגי

| # | משפחה | Platform | כיסוי פוטנציאלי | קואורד׳ | כתובת | זמני תפילה | REST/API | Static/JS | חוקיות | קושי |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | **כיפה — `kipa.co.il/בתי-כנסת`** | פורטל לאומי custom | 🟢🟢 לאומי (כל עיר) — est 8,000–11,000 | ❓ לא ידוע (כנראה address-only) | ✅ | ✅ (בולט) | ❓ | Server-HTML, **חוסם בוטים (403)** | ⚠️ **ToS + anti-bot — חייב בירור** | 🔴 גבוה |
| 4 | **GovMap — `govmap.gov.il`** | ArcGIS ממשלתי (layers פר-רשות) | 🟢 רשויות שפרסמו שכבה (חיפה `lay=217786`…) — est אלפים | ✅✅ **רשמי מוסמך** | חלק | ❌ | ✅ ArcGIS REST/WFS | API | 🟢 open-gov — מצוין | 🟠 בינוני |
| 5 | **data.gov.il + datacity.org.il** | CKAN (open data) | 🟡 רשויות בודדות (כפ"ס מאומת) | לפעמים | ✅ | ❌ | ✅ CKAN API (הכי נקי) | API/CSV | 🟢 open-data — מצוין | 🟢 נמוך |
| 8 | **Godaven — `godaven.com`** | מאגר minyan עולמי | 59k עולמי; ישראל est 1,500–3,000 (הטיה דתי-לאומי/אנגלו) | ✅ (map) | ✅ | ✅ | ❓ | מעורב | ⚠️ ToS | 🟠 בינוני |
| 9 | **hagabay.net + אפליקציות מניין** (ShulTime/Tefila-Finder/ShulCloud) | אינדקסים/אפליקציות | משתנה; backends סגורים | חלק | חלק | ✅ | לרוב סגור | JS/app | ⚠️ ToS — סגור | 🔴 גבוה/לא-כדאי |

**הערת ניקיון נתונים:** הקטלוג מראה `merged: 12` בעוד החי = 14 (חדרה+גבעת זאב חוברו אחרי ההרצה האחרונה של ה-resolver). הקטלוג לא מתעדכן אוטומטית → ראיה לצורך ב-resolver-as-subsystem עם `lastVerified` (§5).

---

## 2. Coverage Estimation

> `est` = הערכות גסות לתכנון. "Net gain" מנכה חפיפה עם 2,739 הקיימים (ה-dedup/enrich הקיים סופג חפיפה כ-enrichment). **תחת מדיניות "קואורד׳ מקוריות בלבד", net-gain של מקורות address-only מותנה בהתאמה ל-GovMap/OSM.**

| משפחה | ערים בהישג | סינגוגות (gross est) | חפיפה | Net gain (est) | מותנה-קואורד׳? |
|---|---|---|---|---|---|
| 1. SabaiApps (יתרה) | ~3–5 + חדשות | 300–700 | בינונית | **+200–500** | לא (קואורד׳ מקוריות) |
| 4. GovMap (GIS) | רשויות עם שכבה | 3,000–6,000 | גבוהה | **+1,500–3,000 coords** | לא (הוא מקור הקואורד׳) |
| 5. data.gov.il/CKAN | רשויות שפרסמו | 500–1,500 | בינונית | **+300–800** | חלקי |
| 6. WP-other ערים-ענק | י-ם, ת"א, חיפה, אשדוד, רחובות | 2,500–4,000 | נמוכה | **+2,000–3,500** | **כן** (חלק address-only) |
| 7. Wix | 2 | 60–150 | נמוכה | **+50–120** | חלקי |
| 2. כיפה (אגרגטור) | לאומי | 8,000–11,000 | חופף-חלקית הכל | **+3,000–6,000** gross | **כן — חזק** (כנראה address-only) |
| 8. Godaven | לאומי (מוטה) | 1,500–3,000 | גבוהה במרכז | **+400–1,000** | לא (יש map) |
| 3c/9. custom/אפליקציות | פזור | — | — | **שולי** | — |

**מסקנה:** WP-other (ערים-ענק) + GovMap (קואורד׳) + CKAN (נקי) לבד → ~5,000–6,000 בלי האגרגטור הבעייתי. כיפה היא ה-path היחיד לכיסוי-כמעט-מלא, אך תחת מדיניות הקואורד׳ המחמירה ה-net שלה תלוי כולו בכיסוי ההתאמה ל-GovMap/OSM → **feasibility spike חובה**.

---

## 3. ROI Ranking

ציון 1–5 (5=מצוין).

| דירוג | משפחה | מאמץ | סינגוגות net | תחזוקתיות | שימושיות-חוזרת | חוקיות/סיכון | ROI |
|---|---|---|---|---|---|---|---|
| #1 | **SabaiApps (סיום)** | 5 | 2 | 5 | 5 | 5 | 🟢 גבוה מאוד (בנוי) |
| #2 | **GovMap (GIS)** | 3 | 4 | 4 | 5 | 5 | 🟢 גבוה (גב-קואורד׳ לאומי) |
| #3 | **CKAN/data.gov.il** | 4 | 3 | 5 | 5 | 5 | 🟢 גבוה (הנקי/חוקי ביותר) |
| #4 | **WP-other (י-ם+ת"א)** | 2 | 5 | 3 | 3 | 4 | 🟡 בינוני-גבוה |
| #5 | **כיפה** | 1 | 5 | 2 | 4 | 2 (anti-bot+ToS) | 🟡 מותנה → spike קודם |
| #6 | **Godaven** | 3 | 2 | 3 | 3 | 3 | 🟡 בינוני (חפיפה) |
| #7 | **Wix** | 3 | 1 | 3 | 4 | 4 | 🟠 נמוך |
| #8 | **custom/אפליקציות** | 1 | 1 | 1 | 1 | 2 | 🔴 לא-כדאי כעת |

**עיקרון:** קודם ממצים את הבנוי והחוקי (1), אז בונים שני adapters גנריים רב-פעמיים (GovMap + CKAN), אז ערים-ענק (WP-other), ורק אחרי spike — האגרגטור הלאומי.

---

## 4. Implementation Roadmap

> כל שלב עובר את תהליך-הברזל הקיים: `importer → preview (dry-run) → validation → backup טרי → connect-live (שער ולידציה, 0 מחיקות)`. שום שלב לא מתחיל בלי אישור מפורש.

**Phase 0 — Foundation refactor** (~3–5 ימים)
- מה: plugin-based adapters + הפרדת Discovery/Resolve/Adapt (§5).
- Gain: 0 סינגוגות, מכפיל מהירות לכל שלב הבא. סיכון: רגרסיה ב-parser → mitigation: golden-tests (snapshot של ה-normalized ל-14 המועצות). תלות: אין.

**Phase 1 — מיצוי SabaiApps** (~2–3 ימים)
- מה: discovery על 88 הלא-פתורות לזיהוי SabaiApps נוספים; חיבור היתרה (כולל variant הרצליה). Gain: +200–500. סיכון: נמוך. תלות: Phase 0 (רצוי).

**Phase 2 — ArcGIS GIS adapter** ✅ **DONE (production, 2026-06-19)** — **ה-coordinate backbone**
- מומש **ישירות מול ArcGIS REST עירוני** (לא GovMap — token-gated). 8 ערים מחוברות, **+1,291 בתי כנסת** מקוריי-קואורד׳, 99 enriched, 20 held, 0 מחיקות. adapter גנרי (עיר = config). ראה `SYNAGOGUE_IMPORT_STATUS.md` §7A.

**Phase 3 — CKAN / data.gov.il adapter** (~2–4 ימים)
- מה: adapter גנרי ל-CKAN; סריקת data.gov.il + datacity. Gain: +300–800 (נקי). סיכון: כיסוי מפוצל. תלות: Phase 0.

**Phase 4 — WP-other ערים-ענק** (~4–8 ימים, פר-עיר)
- מה: adapters לי-ם (`rabanut.org.il`) ות"א (`rabanut.co.il`) תחילה, אז חיפה/אשדוד/רחובות. Gain: +2,000–3,500. סיכון: כל אתר ייחודי; address-only תלוי ב-reconciliation מ-Phase 2. תלות: **Phase 2** (קואורד׳).

**Phase 5 — Kipa feasibility spike → decision gate** (~2–3 ימים spike)
- מה: spike בלבד — (1) בירור ToS/חוקי, (2) האם יש קואורד׳ או רק כתובת, (3) anti-bot, (4) % התאמה ל-GovMap/OSM. רק אם ירוק → adapter (~5–8 ימים). Gain: +3,000–6,000 gross (net תלוי בהתאמת-קואורד׳). סיכון: **ToS + anti-bot + תלות-קואורד׳**. תלות: Phase 2 + go/no-go.

**Phase 6 — Godaven / Wix / long-tail** (אופציונלי). Gain: +500–1,000. עדיפות נמוכה.

**מצטבר (לפני כיפה):** 2,739 → ~5,500–6,500 (~50%). **עם כיפה (אם ירוק):** → ~9,000–11,000 (~80%+).

---

## 5. Architecture Recommendations

**הכללת adapters** — ממשק יחיד:
```
interface SourceAdapter {
  family: string;                       // 'sabai' | 'wp-other' | 'gis' | 'ckan' | 'wix'
  detect(ctx): number;                  // ציון-ביטחון 0–1 (fingerprint)
  fetch(source): Promise<RawRecord[]>;  // משיכה (HTML/REST/ArcGIS/CKAN)
  normalize(raw): CouncilPlace[];       // → אותו CouncilPlace קיים
}
```
ה-parser הנוכחי (waze/markers) הופך ל-`SabaiAdapter`. **ה-dedup/enrich/connect לא משתנים** — תואם ל-§13 ב-STATUS ("הוסף מסלולי-חילוץ, לא לוגיקת-מיזוג").

**הפרדת Discovery מ-Import — כן.** שלוש תת-מערכות:
- **Discovery** — crawl + fingerprint → catalog.
- **Resolve** — שם-ישות → domain/endpoint/family + `confidence` + `lastVerified`.
- **Import** — adapter dispatch → normalize → merge.

**Resolver כתת-מערכת — כן.** מגבלה קיימת בקוד (שורה 8): *Node לא יכול WebSearch*, ולכן הגילוי תקוע על prefill+seed+md*. הפתרון: שלב discovery מבוסס-agent (WebSearch) שמזין catalog מתמשך עם `lastVerified` (פותר גם את `merged:12 vs 14`).

**CMS detection אוטומטי — כן.** `detectCms` (שורה 121) הוא הגרעין → **fingerprint registry**: כל adapter תורם `detect()`, נבחר בעל הציון הגבוה. מקור חדש = fingerprint חדש, בלי `if/else` מרכזי.

**Adapters plugin-based — כן (ההמלצה המרכזית).** registry + dispatch לפי `detect()`. משפחה חדשה = קובץ plugin אחד, אפס שינוי ב-core.

**תמיכה באלפי מקורות — registry-driven + idempotent + incremental:**
1. **Source-type abstraction** — `'council' | 'aggregator' | 'gis' | 'opendata'`. קריטי: מקור אחד → N ערים (כיפה/GovMap), לא רק 1:1. ה-`provenance` הקיים פר-רשומה כבר תומך בריבוי-מקורות.
2. **Coordinate Reconciliation stage (חדש) — תחת המדיניות "קואורד׳ מקוריות בלבד":** רשומה address-only מקבלת קואורד׳ **רק** ע"י התאמת-נקודה מוסמכת (GovMap/OSM) ברדיוס+שם; אחרת **`held`** — לא ממציאים, לא geocoding-by-address. זה מה שהופך מקורות חסרי-קואורד׳ לשמישים בלי לשבור את ה-Golden Rule.
3. **Idempotency** — ה-`sourceId` היציב (`djb2`) כבר מאפשר re-crawl בלי כפילויות. הוסף `lastSeen` (בלי מחיקה — Golden Rule #3).
4. **Verification gate + held-queue** — קיים; הרחב ל-conflict-review queue מתויג פר-batch (פותר Known Issue #6).
5. **Scheduler** — re-crawl תקופתי פר-מקור לפי `lastVerified`.

**הארכיטקטורה המומלצת (זרימה):**
```
Discovery(agent+WebSearch) → Catalog(persistent, lastVerified)
   → Resolver(domain/endpoint/family)
   → Adapter Registry [sabai|wp-other|gis|ckan|wix]  (plugin, detect()-dispatch)
   → Normalize → CouncilPlace
   → Coordinate Reconciliation (GovMap/OSM match | held)        ← חדש
   → [קיים ויציב] dedup → enrich → validation gate → backup → connect-live
```
השכבה התחתונה (dedup→connect) **נשארת כפי שהיא** — היא ההישג היציב. כל החדשנות בשכבת ה-ingestion שמעליה.

---

## 6. Sources (סקר-רשת, 2026-06-19)

- data.gov.il — מאגרי מידע ממשלתיים · datacity (כפר סבא) — dataset בתי כנסת
- GovMap — שכבת בתי כנסת חיפה (`govmap.gov.il/?lay=217786`)
- כיפה — `kipa.co.il/בתי-כנסת/` (לאומי, פר-עיר; חוסם בוטים 403)
- מועצה דתית רחובות (`dat-rehovot.co.il/batei-kneset/`) · ת"א (`rabanut.co.il`) · חיפה (`mdhaifa.org`) · אשדוד (`ashdodmd.org`)
- Godaven (`godaven.com`) · ShulTime (`shultime.com`) · hagabay (`hagabay.net`)

---

**STRATEGY DOCUMENT — RESEARCH & PLANNING ONLY. No live data, code, or app touched.**
