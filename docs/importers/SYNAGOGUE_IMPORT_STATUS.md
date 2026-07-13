# SYNAGOGUE IMPORT STATUS — מקור האמת הרשמי

| | |
|---|---|
| **Version** | v5 |
| **Date** | 2026-06-24 |
| **Repository State** | after **ArcGIS 14 cities** merge + 14 councils + mikvah/GovMap merges + **Chabad-house category (74)** |
| **Parser Version** | councils: variant-aware v2 (waze/markers) · **ArcGIS REST adapter v1 (14 cities, production)** · Chabad multi-source importer v1 |
| **Resolver Version** | v1 (gov.il XLSX seed + md* heuristics + name-match guard) |
| **Generated From Live Data** | YES (`src/data/generated/places.osm.json`) |
| **Verification Status** | ✅ VERIFIED AGAINST LIVE DATA (counted directly from `places.osm.json`, 2026-06-24) |

> מסמך זה הוא **מקור האמת** של מערכת ייבוא בתי הכנסת. כל המספרים אומתו ישירות מהקבצים החיים (לא מהזיכרון). עדכן אותו בכל שינוי מצב.

---

## 0. Golden Rules (חוקי ברזל — לא לשבור)

1. **Never modify `places.osm.json` directly.** (אין לערוך את הדאטה החי ידנית.)
2. **Every import must go through:** `importer → preview → validation → backup → connect-live`.
3. **No deletions.** (0 מחיקות אי-פעם.)
4. **No overwriting existing fields.** (enrichment = מילוי שדות ריקים בלבד; `id` קיים נשמר.)
5. **Every new source requires provenance.** (כל רשומת מקור נושאת `provenance`.)
6. **The app never reads importer output directly** — only `src/data/generated/places.osm.json`.

> כל חריגה מהחוקים האלה אסורה ללא אישור מפורש. שינוי בדאטה החי מתבצע אך ורק דרך `connect-live.ts` (backup טרי + שער ולידציה המבטל על כל מחיקה/דריסה).

---

## 1. Executive Summary

"קרוב" היא אפליקציית מובייל (Expo/React Native/TypeScript, עברית RTL) למציאת מקומות שיהודי צריך בקרבת מקום. המאגר נבנה אך ורק ממקורות **חוקיים, חינמיים ואמיתיים**, additive בלבד, עם **0 מחיקות אי-פעם** ו-backups הפיכים בכל שלב.

**מסלול בתי הכנסת** הוא ההישג המרכזי: מ-1,590 בתי כנסת (OSM) ל-**4,419** דרך **שני מנועי-מקור גנריים** במקביל:
1. **14 מועצות דתיות** (WordPress **SabaiApps Directories Pro**) — **parser אחד variant-aware** (waze/markers) המכסה את כל המשפחה ללא קוד פר-מועצה (+1,125), ו-**resolver** שממפה את 126 המועצות הרשמיות לדומיינים.
2. **14 ערי ArcGIS REST** עירוניות (ESRI GIS פתוח) — **adapter גנרי אחד** שעיר = שורת config (+1,857).

הקואורדינטות מקוריות (אין geocoding לבתי כנסת; `outSR=4326` ל-ArcGIS). בנוסף נוספה **קטגוריית בתי חב״ד** (importer רב-מקורי, 74). כל חיבור עובר תהליך מבוקר: dry-run → preview → validation → backup → merge דרך שער ולידציה.

---

## 2. Current Live Statistics (מאומת — נספר ישירות מ-`places.osm.json`, 2026-06-24)

| מדד | ערך |
|---|---|
| **סך מקומות** (`places.osm.json`) | **5,535** |
| **בתי כנסת** | **4,419** |
| — מתוך OSM | **1,437** |
| — מתוך מועצות (14) | **1,125** |
| — מתוך ArcGIS עירוני (14 ערים) | **1,857** |
| מקוואות | **696** (gov.il 470 + seed/מועצות/GovMap 202 + OSM 24) |
| מסעדות כשרות | **346** |
| **בתי חב״ד** (קטגוריה חדשה) | **74** (OSM 9 + seed/manual 65), ב-44 ערים |
| **מועצות מחוברות** | **14** |
| **ערי ArcGIS מחוברות** | **14** |
| **ערים** (`cities.osm.json`) | **479** |
| **מחיקות אי-פעם** | **0** |

**פירוק בתי הכנסת:** OSM(1,437) + מועצות(1,125) + ArcGIS(1,857) = **4,419**.
**5 קטגוריות חיות:** בתי כנסת 4,419 · מקוואות 696 · מסעדות 346 · בתי חב״ד 74 = **5,535**.
**שינוי מ-v4 (4,907):** +6 ערי ArcGIS (+566 בתי כנסת), קטגוריית חב״ד חדשה (74), מקוואות 531→696.

---

## 3. Current Architecture

```
[gov.il PDF/XLSX]
      │
      ▼
  Resolver  (resolve-councils.ts)  →  council-domain-catalog.json
      │  (domain + variant)
      ▼
  sources.ts  (CouncilSource config + COUNCILS map)
      │
      ▼
  Importer  (importer.ts)  →  output/<id>.normalized.json + reports
      │
      ▼
  Parser    (parse.ts)     →  variant-aware extraction
      │
      ▼
  Validation (בתוך importer + שער ב-connect)
      │
      ▼
  Preview   (build-merged-preview.ts)  →  places.with-councils.preview.json + reports  [dry-run]
      │  (approval)
      ▼
  Connect   (connect-live.ts)  →  backup → validation gate → places.osm.json + cities.osm.json
      │
      ▼
  Live Dataset  →  נקרא ע"י האפליקציה דרך OsmPlacesRepository
```

| קובץ | אחריות |
|---|---|
| `resolve-councils.ts` | **Resolver** — שם מועצה → דומיין (seed XLSX + md*), אימות CMS/variant/count, מפיק catalog/summary/manual-review |
| `sources.ts` | **Config** — `CouncilSource` לכל מועצה + טיפוסים (`CouncilRaw`/`CouncilPlace`/`Variant`) + `COUNCILS` map |
| `importer.ts` | **Orchestration** — `X-WP-Total`, `settings_cache_id`, משיכת עמודים עד `maxPages`, parser, validation, כתיבת raw/normalized + 4 דוחות |
| `parse.ts` | **Parser** — `detectVariant` + מסלולי waze/markers + `normName`/`jsonUnescape`/hash + enrichment |
| `build-merged-preview.ts` | **Preview** — dedup+enrich מול live (dry-run), כותב preview + new/enriched/conflicts/over300/rejected |
| `build-preview-dedup.ts` | **Preview-analysis** — ניתוח dedup בלבד (ללא קובץ ממוזג) |
| `connect-live.ts` | **Connect** — backup טרי → שער ולידציה (0 מחיקות) → כתיבת live + בניית cities מחדש → held-reports |

**עיקרון:** האפליקציה קוראת **רק** את `places.osm.json`; שכבת ה-importers מנותקת לחלוטין (Node ESM, `importers/tsconfig.json` נפרד, לא משפיע על בילד Expo).

---

## 4. Parser Design

ה-parser (`parse.ts`) מטפל ב-SabaiApps Directories Pro. הוא **variant-aware**: לכל עמוד מזהה את הווריאנט ובוחר מסלול חילוץ.

### detectVariant(html)
ספירת `waze.com/ul?ll=` מול מערך markers (`"lat":NUM,"lng":NUM`). אם `waze ≥ max(2, cards*0.3)` → **waze**, אחרת אם יש markers → **markers**.

### waze variant (cards primary)
- מקור: עמוד הדירקטורי, כרטיסים מופרדים ב-`data-name="entity_field_post_title"`.
- **שם + permalink:** anchor `<a … data-content-name="synagogues_dir_ltg" …>NAME</a>`; אם אין anchor → טקסט ה-div (כמו יהוד).
- **קואורדינטות:** מקישור Waze `ll=lat,lng` שבכרטיס (מקוריות, WGS84).
- **כתובת:** span `drts-location-address` (fallback: טקסט קישור ה-Waze).
- שדות: נוסח (`field_field_type`), טלפון גבאי (`field_field_gabphone`), כתובת גבאי, שיעורים.

### markers variant (markers primary)
- מקור: מערך ה-markers של המפה (`"content":"<HTML>","lat":NUM,"lng":NUM`).
- שם + כתובת + coords מתוך כל marker entry (content מפוענח ב-`jsonUnescape`).
- **enrichment:** נוסח/טלפון/**כתובת** מהכרטיס לפי **התאמת-שם מנורמלת** (best-effort; אם >1 התאמה → `ambiguousEnrich`, לא מנחשים).
- **card-address fallback (תיקון step1):** אם כתובת ה-marker ריקה → לוקחים את כתובת הכרטיס באותו join-שם.

### sourceId
- עם permalink → `rc-<councilId>-<wpId>` (wpId מ-`drts-entity-<id>` או slug).
- בלי permalink → `rc-<councilId>-h<djb2(normName+'|'+address)>` — **יציב בין ריצות**.

### provenance (פר-רשומה בדאטה החי)
- חדש: `{ source:'religious-council', council, sourceUrl }`
- מועשר: `{ enrichedBy:'religious-council', council, sourceId, fields:[...] }`
- (האפליקציה מתעלמת מהשדה דרך ה-cast ב-repository; קיים לייחוס/אמון.)

### normalization
- `normName` — הסרת "בית כנסת"/קיצורים, ניקוד, גרשיים → טוקנים. משמש ל-sourceId + enrichment join.
- `jsonUnescape` — פענוח `\uXXXX`, `\/`, `\"` בתוך marker content.
- `cleanAddress` — הסרת פסיק מוביל; `normPhone` — הוספת 0 מוביל לטלפון ישראלי 9-ספרתי; פענוח HTML-entities בטלפון (חלק מהמועצות מערפלות).

---

## 5. Matching Logic

מתבצע ב-`build-merged-preview.ts` (preview) ו-`connect-live.ts` (live), זהה.

### dedup (פנימי, בתוך מועצה)
לפי **`sourceId` בלבד**. **לעולם לא לפי קואורדינטות** (בתי כנסת באותו בניין חולקים נקודה לגיטימית).

### fuzzy matching (מועצה ↔ live)
לכל רשומת מועצה: סריקת בתי כנסת קיימים ברדיוס ≤600מ׳; `nameSim` = Jaccard של טוקנים אחרי `fuzzyNorm` (הסרת prefix + `וו→ו` + `יי→י`) עם **boost ל-0.85 אם שם אחד מוכל בשני**.

### thresholds
| סף | ערך |
|---|---|
| match — מרחק | ≤150מ׳ (קרוב) · ≤300מ׳ (תקרה מוחלטת) |
| match — דמיון | ≥0.6 (במרחק ≤150) · ≥0.8 (שם חזק) |
| conflict — דמיון | ≥0.3 (במרחק ≤150) |
| over300 — חלון | sim≥0.8 ו-300<d≤600 |

### החלטה (לפי הסדר)
```
isMatch    = d≤300 AND ((d≤150 AND sim≥0.6) OR sim≥0.8)   → Enriched
isConflict = !match AND d≤150 AND 0.3≤sim<0.6              → Conflict (held)
isOver300  = !match AND sim≥0.8 AND 300<d≤600              → Over300 (held)
else                                                       → New
```

### enrichment rules
- **רק מילוי שדות ריקים** (nusach/phone/address) — לעולם לא דריסת ערך קיים. **id נשמר.**
- אם רשומת מועצה שנייה מתאימה לאותו קיים שכבר הועשר → מצורפת כ-New (לא מועשר פעמיים).

### דוגמאות
- `"אבא יוסף" → "בית כנסת אבא יוסף"` | 43מ׳ | sim 0.85 → **Enriched** [nusach,phone,address]
- `"חסד לאברהם" ↔ "תורת חסד"` | 140מ׳ | sim 0.33 → **Conflict** (לא מוזג)
- `"חתם סופר" ↔ "חתם סופר"` | 504מ׳ | sim 1.0 → **Over300** (לא מוזג)
- `"אבי עזרי"` (פ"ת) — אין התאמה → **New**

---

## 6. Resolver

`resolve-councils.ts` — ממפה את 126 המועצות הרשמיות לדומיינים.

- **רשימת היקום:** חולצה מ-PDF רשמי של gov.il (`Supported_Bodies_1.4_MoazotDatiyot.pdf`) → **126 שמות** מוטמעים בסקריפט.
- **catalog בנוי כך:** prefill ל-22 מועצות מאומתות (confidence 1.0) → seed דומיינים מ-XLSX/חיפוש → ניחושי md* fallback → לכל מועמד: verify (reachability, name-match, robots, `/directory-synagogues/`, `X-WP-Total`, CMS, variant) → ניקוד confidence → שורת catalog.
- **שימוש ב-XLSX:** המקור הטוב ביותר לדומיינים — `רשימת מועצות דתיות לאתר המשרד.xlsx` של gov.il מכיל **עמודת אימייל**, וממנה חולץ הדומיין הרשמי (פילטור ספקים חינמיים gmail/walla/ISP). נתן ~27 דומיינים רשמיים.
- **seeds:** `SEED_DOMAINS` (XLSX+חיפוש) עוברים את ה-verify pipeline **בלי דרישת name-match** (מקור רשמי מהימן, גם אם האתר JS-rendered או העיר שונתה: נצרת עילית↔נוף הגליל). ניחושי md* **כן** דורשים name-match (מונע התנגשויות, למשל mdm=מרחבים ≠ מגדל).
- **מגבלת Node מול WebSearch:** סקריפט node **לא יכול להריץ WebSearch**, לכן הגילוי האוטומטי מוגבל ל-prefill + seed + md*. פתירת השאר דורשת חיפוש per-council (manual/batched).
- **תוצאה נוכחית:** **38/126 דומיינים נפתרו**, 15 SabaiApps, 2 ready, 88 unresolved.
- **פלטים:** `council-domain-catalog.json` · `council-domain-summary.json` · `manual-review.json`.

---

## 7. Connected Councils (14)

| מועצה | domain | variant | records (valid) | status |
|---|---|---|---|---|
| פתח תקווה | mpt.org.il | waze | 367 | ✅ merged |
| נתניה | mdn.org.il | waze | 140 | ✅ merged |
| גבעת שמואל | mdgs.org.il | waze | 40 | ✅ merged |
| יהוד | ydat.org.il | waze | 29 | ✅ merged |
| מרחבים | mdm.org.il | markers | 21 | ✅ merged |
| ראש העין | mdrh.org.il | markers | 128 | ✅ merged |
| גני תקווה | mdgt.org.il | markers | 19 | ✅ merged |
| באר שבע | mdb7.org.il | markers | 165 | ✅ merged |
| לוד | mdlod.org.il | markers | 97 | ✅ merged |
| בית שאן | rbs.org.il | markers | 69 | ✅ merged |
| מרום גליל | mdmg.org.il | markers | 28 | ✅ merged |
| קרית ארבע | mdk4.org.il | markers | 19 | ✅ merged |
| חדרה | haderamd.org.il | markers | 125 | ✅ merged ⚠️ (ראה Known Issues #1) |
| גבעת זאב | mdgz.org | markers | 62 | ✅ merged |
| **סך valid** | | | **1,309** | |

---

## 7A. ArcGIS Municipal GIS Layers (14 cities — PRODUCTION, merged live)

מקור שני, נפרד מהמועצות: שכבות ESRI ArcGIS REST עירוניות פתוחות. **adapter גנרי אחד** (`importers/arcgis/`) מכסה את כל הערים — עיר = config בלבד, אפס שינוי לוגיקת-adapter. **14 ערים חיות** (`cities.ts` מכיל 16 קונפיגים; 2 טרם חוברו). סך בתי כנסת מ-ArcGIS בדאטה החי: **1,857**. קואורדינטות מקוריות-מוסמכות (השרת מחזיר `outSR=4326` — כולל הסטת-הדאטום הישראלי ~77מ׳ שממיר TM טהור מחמיץ). conflicts/over300 נשמרים held כמו במועצות.

| עיר | endpoint (layer) | WKID | valid | new | enriched | held | cityId |
|---|---|---|---|---|---|---|---|
| תל אביב | IView2/MapServer/568 | 2039 | 484 | 445 | 30 | 9 | תל אביב–יפו |
| חיפה | Haifa_Community_Public/MapServer/10 | 2039 | 268 | 239 | 25 | 6 | חיפה |
| אשדוד | mapt_reka/MapServer/13 (`pub_build_types=230`) | 2039 | 279 | 273 | 5 | 1 | אשדוד |
| אשקלון | synagogue/FeatureServer/0 | 3857 | 190 | 177 | 11 | 2 | אשקלון |
| ירושלים | BaseLayers/MapServer/66 | 2039 | 80 | 58 | 21 | 1 | ירושלים |
| נהריה | bate_kneset_2025/FeatureServer/1 | 3857 | 71 | 68 | 3 | 0 | נהריה |
| מודיעין | GeoInterestPoints/MapServer/0 (`LIKE '%בית כנסת%'`) | 2039 | 23 | 18 | 4 | 1 | מודיעין-מכבים-רעות |
| נוף הגליל | city_map/FeatureServer/1 | 2039 | 15 | 15 | 0 | 0 | נוף הגליל |
| **סה"כ Batch 1+2** | | | **1,410** | **1,291** | **99** | **20** | |

### Batch 3+ (6 ערים נוספות — merged live, מספרים חיים מאומתים 2026-06-24)
| עיר | בתי כנסת בדאטה החי (`source=arcgis:<id>`) |
|---|---|
| מודיעין עילית | 155 |
| חולון | 109 |
| הרצליה | 81 |
| לוד | 78 |
| אור עקיבא | 32 |
| קרית אונו | 12 |
| **סה"כ Batch 3+** | **467** |

> פירוק new/enriched/held פר-אצווה ל-Batch 3+ נמצא ב-`importers/arcgis/output/<city>/` (דוחות נדרסים פר-אצווה — Known Issue #6). הספירה כאן היא לפי `source` בדאטה החי. **סך כל 14 הערים החיות = 1,857.**

**עקרונות שהוטמעו:** `outSR=4326` תמיד · native coordinates only (אין geocoding) · id יציב פר-רשומה (`idField` בקונפיג ל-ת"א שאין בה OBJECTID) · `cleanPhone` (טלפון "0" מסונן) · **cityId לפי התאמת-שם** לתווית קיימת (לא גאוגרפיה — גוש דן מבולגן) · שער-ולידציה (0 מחיקות, אין דריסה, מקוואות+מסעדות+Batch-קודם שמורים).

**מצב adapter:** **production-ready.** עיר פתוחה חדשה = שורת config ב-`cities.ts` + merge מבוקר.

---

## 8. Known Issues

| # | בעיה | מיקום | חומרה | פתרון מתוכנן | חוסם? |
|---|---|---|---|---|---|
| 1 | **91 כתובות חדרה מציגות "בית שאן"** (שכפול-תבנית מ-rbs.org.il; coords/cityId תקינים) | live (cityId=חדרה) | 🟠 בינונית (תצוגה בלבד) | rollback `pre-step2` → fix: החלפת סיומת-העיר ב-`cityId` ב-parse/mapper → re-merge | לא |
| 2 | Resolver מיפה רק 38/126 (88 לא-פתורות) | catalog | 🟡 הרחבה | per-council search (node לא יכול WebSearch) | לא |
| 3 | הרצליה (mdh.org.il) — variant חסר (count=0, אין waze/markers) | parser | 🟡 | לבדוק היכן ה-coords → variant שלישי | לא |
| 4 | ירושלים/ת"א — WordPress-other ללא adapter | parser | 🟠 (ערך גבוה) | adapter WP-other | לא |
| 5 | held conflicts/over300 (24 מצטבר) לא נסקרו | reports | 🟢 נמוכה | סקירה ידנית | לא |
| 6 | דוחות held/preview נדרסים פר-אצווה (רק step2 שמור) | output/reports | 🟢 נמוכה | לתייג דוחות לפי batch | לא |
| 7 | ~~`STATUS.md` לא עודכן~~ → **נפתר** (עודכן ל-v4: 4,030 בתי כנסת, 8 ערי ArcGIS) | STATUS.md | ✅ נפתר | — | לא |
| 8 | Beer Sheva: 11 רשומות בלי כתובת נפסלו (אין card-match) | importer | 🟢 נמוכה | לקבל (אין מקור) | לא |
| 9 | **ירושלים GIS דקה** — רק 80/357 שמישים (277 ללא שם); סכמה שם+נקודה בלבד | ArcGIS | 🟡 כיסוי | מקור משלים לירושלים | לא |
| 10 | ת"א — כיסוי טלפון נמוך (`tel_bet_cneset` ריק לרוב; טלפון-גבאי לא ממופה) | ArcGIS config | 🟢 נמוכה | למפות `tel_gabay` אם נדרש | לא |
| 11 | מודיעין — נוסח לא ממופה (טמון ב-`InterestPointTypeIDDesc`) | ArcGIS config | 🟢 נמוכה | לחלץ נוסח מהסיומת | לא |
| 12 | `cityId` בגוש דן ב-OSM-base מבולגן (שכונות/ערים-שכנות; וריאציות ת"א) | live (קיים מראש) | 🟢 נמוכה | רשומות ArcGIS חדשות כבר בתווית קנונית מותאמת-שם; ניקוי base נפרד | לא |

**אף בעיה אינה חוסמת.** #1 (חדרה) היא היחידה שמשפיעה על דאטה חי קיים (תצוגה בלבד).

---

## 9. Roadmap

**הושלם (production):**
- ✅ **ArcGIS REST adapter** — **14 ערים פתוחות**, **+1,857 בתי כנסת**, adapter גנרי (עיר = config).
- ✅ **GovMap geocoder** — מקור קואורדינטות ישראלי אמין לרחובות (ITM→WGS84), שימש למקוואות שחסרו קואורדינטות.
- ✅ **קטגוריית בתי חב״ד** — importer רב-מקורי חוקי (OSM+amutot+Wikidata+manual), **74 בתים ב-44 ערים** (תקרת מקורות פתוחים).

**הבא (טרם התחיל):**
1. **CKAN adapter** (data.gov.il + DataCity) — מקוואות לאומי + כשרות לאומי (רבנות) + dgpsync עירוני; adapter גנרי אחד, ריבוי-סוגים.
2. **DatInfo** — אפיון פלטפורמת-מועצות שנייה (many-for-one).
3. **עוד ערי ArcGIS פתוחות** — config בלבד (2 קונפיגים קיימים טרם חוברו).
4. **מקור משלים לירושלים** — ה-GIS דק (80/357); WP-other/אגרגטור (Known Issue #9).
5. **תיקון חדרה** (Known Issue #1) — rollback → fix cityId → re-merge.
6. **Resolver מלא** — 88 מועצות לא-פתורות (per-council search).
7. **בתי חב״ד ל-≥90%** — פנייה רשמית לצעירי אגודת חב״ד (chabad.org Locator חסום ב-ToS).

---

## 10. Commit History (milestones, לא git)

```
# יסוד
- Set up Kosher app (Expo/RN/TS, RTL, Leaflet)
- Imported OSM synagogues + restaurants (1,936 places)
- Built modular importers/ layer (synagogues/restaurants/shared)

# מקוואות
- Built Mikveh importer (data.gov.il) + geocoding (Nominatim, 470/606)
- Built Mikveh → Place mapper + preview merge
- Connected Mikveh to live (PlaceType+=mikveh, UI, approx-location) → 2,406

# מועצות דתיות — תשתית
- Researched sources → identified SabaiApps Directories Pro
- Built variant-aware Parser (waze + markers)
- Built additive dedup/enrichment (fuzzy match, conflicts/over300)

# מועצות דתיות — חיבורים
- Connected first 7 councils → 1,590 → 2,246
- Connected second batch (5: Beer Sheva/Lod/Beit She'an/Marom Galil/Kiryat Arba) → 2,586
    · fix: markers address fallback from card
- Connected third batch (Hadera + Givat Ze'ev) → 2,739
    · known issue: Hadera addresses show "בית שאן" (UNFIXED)

# גילוי
- Built Discovery catalog (SabaiApps scan)
- Extracted official 126-council list (gov.il PDF)
- Built domain Resolver (resolve-councils.ts)
    · fix: name-match guard for md* collisions
    · seed from gov.il XLSX emails (38/126 resolved)

# ArcGIS (מקור עירוני — production)
- Built generic ArcGIS REST adapter (config-per-city, outSR=4326; ITM datum-shift lesson)
- POC Haifa → extended to 8 cities via CONFIG ONLY (reusability proven)
- Quality review + fixes (TLV idField from UniqueId, Ashdod phone="0" filtered)
- Merged Batch 1 (TLV/Haifa/Ashdod/Ashkelon) → 3,871 · Batch 2 (J'lem/Nahariya/Modiin/Nof HaGalil) → 4,030
- Stabilization: validate-live.ts (12/12 pass), STATUS v4

# ArcGIS הרחבה + חב״ד (v5)
- Extended ArcGIS to 14 cities (Batch 3+: Modiin Illit/Holon/Herzliya/Lod/Or Akiva/Kiryat Ono) → +566 synagogues
- Adopted GovMap as IL street geocoder (ITM→WGS84) for coordinate-less mikvahs
- Built legal Chabad-house importer (OSM+amutot+Wikidata+manual) → new chabad_house category, 74 houses / 44 cities

# נוכחי
- LIVE: 5,535 places · 4,419 synagogues · 696 mikvahs · 346 restaurants · 74 chabad houses · 14 councils · 14 ArcGIS cities · 479 cities · 0 deletions ever
```

---

## 11. Repository Files

### Importers — `importers/religious-councils/`
| קובץ | תפקיד |
|---|---|
| `sources.ts` | קונפיג 14 מועצות + טיפוסים + COUNCILS map |
| `parse.ts` | parser variant-aware (waze/markers + enrichment + normalization) |
| `importer.ts` | תזמור משיכה + validation + דוחות per-council |
| `build-merged-preview.ts` | preview merge additive (dry-run) |
| `build-preview-dedup.ts` | ניתוח dedup (preview) |
| `connect-live.ts` | merge אמיתי + שער ולידציה + backup |
| `resolve-councils.ts` | resolver דומיינים → catalog |

### ArcGIS — `importers/arcgis/` (production)
| קובץ | תפקיד |
|---|---|
| `cities.ts` | config + registry-entry פר-עיר (16 קונפיגים, 14 חיות) + טיפוס `ArcgisSourceConfig` (endpoint/wkid/idField/fieldMap) |
| `adapter.ts` | `ArcgisRestAdapter` גנרי (`SourceAdapter` של unified): fetch (`outSR=4326`, pagination) + normalize (field-map + reproject + cleanPhone) |
| `itm.ts` | reprojection ITM(2039)/WebMercator(3857)→WGS84 + לקח הסטת-הדאטום |
| `preview.ts` | סיווג additive מול חי (new/enriched/conflicts/over300), סמנטיקה זהה למועצות |
| `run-haifa.ts` · `run-city.ts <id>` | runners dry-run פר-עיר → `output/<city>/` |
| `connect-batch1.ts` · `connect-batch2.ts` | merge אמיתי מבוקר (backup → שער → live), cityId לפי התאמת-שם |
| `validate-live.ts` | בדיקת ייצוב read-only (12 invariants) → `output/validation-report.json` |

### Chabad — `importers/chabad/` (production, קטגוריה נפרדת)
| קובץ | תפקיד |
|---|---|
| `importer.ts` | importer רב-מקורי (OSM ODbL + data.gov.il עמותות + Wikidata CC0 + `manual.json`) + GovMap geocode, dry-run |
| `connect-live.ts` | merge גדור (backup → שער → live), שמירת-מרחק למניעת כפילויות בריצה חוזרת |
| `manual.json` | הזנה ידנית מאומתת (trust הכי גבוה) |
| `output/reports/` | `summary` · `preview` · `write-ready` · `connect-summary` |

### Output — `importers/religious-councils/output/`
- `<id>.raw.json` · `<id>.normalized.json` (פר-מועצה) · `places.with-councils.preview.json`
- `council-domain-catalog.json` · `council-domain-summary.json` · `manual-review.json`
- `reports/<id>.{summary,rejected,duplicates,diagnostics}.json`
- `reports/{new,enriched,conflicts,over300m,rejected,merge-summary}.json` (preview, פר-אצווה)
- `reports/{connect-summary,connect-held-conflicts,connect-held-over300}.json` (live, step2)

### Live data — `src/data/generated/`
- `places.osm.json` (**5,535** — המאגר החי) · `cities.osm.json` (**479 ערים**)

### Backups (הפיכים)
| קובץ | מצב |
|---|---|
| `places.osm.premikveh.backup.json` | 1,936 (לפני מקוואות) |
| `places.osm.precouncils.backup.json` | 2,406 (לפני 7 המועצות) |
| `places.osm.pre-step1.backup.json` | 3,062 (לפני 5 המועצות) |
| `places.osm.pre-step2.backup.json` | 3,402 (לפני חדרה+גבעת זאב) |
| `places.osm.pre-council-mikveh.backup.json` | 3,555 (לפני מיזוג מקוואות-מועצות) |
| **`places.osm.pre-arcgis-batch1.backup.json`** | **3,616** (לפני ArcGIS Batch 1) |
| **`places.osm.pre-arcgis-batch2.backup.json`** | **4,748** (לפני ArcGIS Batch 2) |
| + מקבילי `cities.osm.*.backup.json` | |

### App (שונה במסגרת המקוואות, לא במועצות)
`src/types/place.ts` · `src/utils/placeType.ts` · `src/i18n/he.ts` · `HomeScreen/MapScreen/ListScreen/PlaceCard/PlaceBottomCard/PlaceDetailScreen.tsx` · `components/map/leafletHtml.ts`

---

## 12. Recovery Guide

**מקבל את הפרויקט בפעם הראשונה:**

1. **מאיפה מתחילים:** קרא מסמך זה + `STATUS.md` (ראשי). הדאטה החי = `src/data/generated/places.osm.json`. הקוד = `importers/religious-councils/`. Node 24 מריץ `.ts` ישירות.
2. **הרצת preview** (dry-run, לא נוגע בחי):
   ```bash
   node importers/religious-councils/importer.ts <council-id>      # משיכת מועצה
   node importers/religious-councils/build-merged-preview.ts        # preview merge
   ```
   עדכן `COUNCIL_IDS` ב-`build-merged-preview.ts` למועצות האצווה.
3. **merge אמיתי** (רק אחרי preview+אישור):
   ```bash
   node importers/religious-councils/connect-live.ts               # backup → gate → live
   ```
   עדכן `COUNCIL_IDS` + שם ה-backup (`pre-stepN`) ב-`connect-live.ts`.
4. **שחזור backup:** העתק את `places.osm.<stage>.backup.json` חזרה ל-`places.osm.json` (וכן cities). הכל הפיך.
5. **הוספת מועצה חדשה:** הוסף `CouncilSource` ל-`sources.ts` (id/city/domain) + ל-`COUNCILS`; הרץ importer; אם markers/waze — נתמך מיד. אמת ב-catalog שהיא SabaiApps.
6. **הוספת adapter חדש** (משפחת CMS לא נתמכת): ראה Future Extension Guide.
7. **אימות:** `npx tsc -p importers/tsconfig.json --noEmit` + `npx tsc --noEmit` (אפליקציה).

---

## 13. Future Extension Guide

**עקרונות ארכיטקטורה — אסור לשבור:**
- **Additive-only:** לעולם לא למחוק/לדרוס רשומה קיימת. enrichment = מילוי שדות ריקים בלבד; id קיים נשמר.
- **תהליך מבוקר תמיד:** dry-run → preview → validation → **backup טרי** → merge דרך **שער ולידציה** (שמבטל על כל מחיקה/רשומה לא-תקינה).
- **אין dedup לפי קואורדינטות בלבד** — תמיד שם+מרחק.
- **conflicts/over300 לא ממוזגים בכוח** — נשמרים בדוחות.
- **provenance לכל רשומת מקור.** **בלי המצאת דאטה** (חסר → ריק/נדחה, לא מנוחש).
- האפליקציה קוראת רק `places.osm.json` — שכבת importers מנותקת.

**הוספת משפחת CMS חדשה (adapter):**
1. זהה את הפלטפורמה (CMS fingerprint ב-resolver).
2. הוסף מסלול חילוץ חדש ל-`parse.ts` (כמו waze/markers) או קובץ adapter נפרד אם המבנה שונה מהותית.
3. עדכן `detectVariant` לזהות את הווריאנט.
4. החזר את אותו `CouncilRaw`/`CouncilPlace` — כך ה-dedup/enrich/connect לא משתנים.
5. בדוק על מועצה אחת (dry-run) לפני הרחבה.

**עקרון:** הוסף **מסלולי-חילוץ** למקור, לא לוגיקת-מיזוג חדשה. ה-dedup/connect הם משותפים ויציבים.

---

**SYNAGOGUE IMPORT STATUS VERIFIED AGAINST LIVE DATA ✓**
