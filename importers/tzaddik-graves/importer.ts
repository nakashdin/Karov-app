/**
 * Tzaddik Graves importer — Phase 4, DRY RUN ONLY.
 *
 * ⛔  NEVER writes to src/data/generated/
 * ⛔  NEVER calls rebuildAppDataset()
 * ✅  Output only: importers/tzaddik-graves/output/
 *
 * Run: node importers/tzaddik-graves/importer.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLocalities, isMain } from '../shared/utils.ts';
import { fetchOsmGraves } from './fetch-osm.ts';
import { fetchWikidataGraves } from './fetch-wikidata.ts';
import { validateGraves } from './validate.ts';
import { deduplicateGraves } from './dedup.ts';
import { MANUAL_SEEDS } from './seeds.ts';
import type { PreviewReport, MustHaveCheck, TzaddikGraveRaw } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const PREVIEW_FILE = join(OUT_DIR, 'graves.preview.json');
const REPORT_FILE = join(OUT_DIR, 'graves.report.json');
const APPROVED_FILE = join(OUT_DIR, 'approved_for_live.json');
const MANUAL_REVIEW_FILE = join(OUT_DIR, 'manual_review.json');
const REJECTED_FILE = join(OUT_DIR, 'rejected.json');

// ---------------------------------------------------------------------------
// Phase 4 quality gate — explicit classification lists
// ---------------------------------------------------------------------------

/**
 * IDs confirmed as non-graves in the quality audit:
 * synagogues, mikvehs, events, cities, yeshivot, Muslim/Druze sites, etc.
 */
const QUALITY_REJECTED_IDS = new Map<string, string>([
  // אירועים
  ['wikidata-grave-Q111305015', 'הלוויה — לא קבר'],
  ['wikidata-grave-Q6937940',   'אירוע טרור — לא קבר'],
  // בתי כנסת
  ['wikidata-grave-Q2917076',   'בית כנסת האר"י האשכנזי'],
  ['wikidata-grave-Q16608199',  'בית כנסת רבי יוסף קארו'],
  ['wikidata-grave-Q16129798',  'בית כנסת בית יעקב יוסף'],
  ['osm-osm-node-10866619321',  'בית כנסת אליהו הנביא'],
  ['osm-osm-way-511100004',     'בית כנסת היכל הצדיק ברסלב'],
  // מקוואות
  ['wikidata-grave-Q30526880',  'מקווה האר"י — לא קבר'],
  // כנסיות / אתרים נוצריים
  ['wikidata-grave-Q1124878',   'כנסיית יוסף הקדוש'],
  ['wikidata-grave-Q540882',    'מערת תלפיות — ייחוס נוצרי (ישו)'],
  // אתרים מוסלמים/דרוזים
  ['wikidata-grave-Q2590976',   'מתחם נבי שועייב — אתר דרוזי'],
  ['wikidata-grave-Q6682025',   'נבי סבלאן — אתר דרוזי/מוסלמי'],
  ['wikidata-grave-Q6588897',   'נבי יעפורי — מקאם מוסלמי'],
  ['wikidata-grave-Q137656514', 'מקאם נבי אל-ח\'דר — מוסלמי'],
  ['wikidata-grave-Q6582124',   'קבר נבי יהודה — מוסלמי (לבנון)'],
  // בתי קברות כלליים
  ['wikidata-grave-Q124030938', 'בית קברות כללי'],
  // ערים ויישובים
  ['wikidata-grave-Q1218',      'ירושלים — עיר שלמה'],
  ['wikidata-grave-Q1177750',   'עיר דוד — אזור ארכאולוגי'],
  ['wikidata-grave-Q2889806',   'געש — קיבוץ'],
  ['wikidata-grave-Q2916378',   'קריית ענבים — יישוב (פילוסופית, לא צדיקה)'],
  ['wikidata-grave-Q1026840',   'נען — קיבוץ (לא צדיק)'],
  ['wikidata-grave-Q2371396',   'דגניה א — קיבוץ (א.ד. גורדון)'],
  ['wikidata-grave-Q1814658',   'אור עקיבא — עיר'],
  ['wikidata-grave-Q2890501',   'ניר עקיבא — קיבוץ'],
  ['wikidata-grave-Q2888667',   'בית יוסף — עיר'],
  ['wikidata-grave-Q2436968',   'מועצה אזורית מעלה יוסף'],
  ['wikidata-grave-Q2917286',   'תל יוסף — קיבוץ'],
  ['wikidata-grave-Q2890428',   'תלמי יוסף — קיבוץ'],
  ['wikidata-grave-Q12040826',  'נווה יוסף — שכונה'],
  ['wikidata-grave-Q4811271',   'ג\'וב יוסף — כפר'],
  ['wikidata-grave-Q2919879',   'כרמי יוסף — קיבוץ'],
  ['wikidata-grave-Q8071863',   'זכרון יוסף — שכונה'],
  ['wikidata-grave-Q2915392',   'שבות רחל — יישוב'],
  ['wikidata-grave-Q2130036',   'רמת רחל — קיבוץ/שכונה'],
  ['wikidata-grave-Q6779755',   'בית דב יוסף — מבנה'],
  ['wikidata-grave-Q16130084',  'בית יוסף באו'],
  // רחובות/מחלפים/נחלים
  ['wikidata-grave-Q6907785',   'רחוב רבי עקיבא — רחוב'],
  ['wikidata-grave-Q6586661',   'מחלף אור עקיבא מערב — מחלף כביש'],
  ['wikidata-grave-Q12039907',  'נחל יוסף — נחל'],
  ['wikidata-grave-Q11855552',  'גשר יוסף — גשר'],
  ['wikidata-grave-Q6636599',   'מחנה יוסף — שכונה'],
  ['wikidata-grave-Q6720613',   'בני יוסף — שכונה'],
  // כפילויות Phase 5
  ['wikidata-grave-Q125395543', 'כפילות — קבר יונתן בן עוזיאל (Wikidata); OSM נשמר'],
  ['osm-osm-node-8626554287',   'כפילות — רבי יהודה בר עילאי node (ציון 30); way-647373211 נשמר'],
  // כפילות Phase 6 — קבר דוד (30מ' ממקבילתו)
  ['osm-osm-way-161058945',     'כפילות — קבר דוד המלך (way-161058978) נשמר; שם מלא מועדף'],
  // ישיבות ואולפניות
  ['wikidata-grave-Q12408347',  'ישיבת בני עקיבא נתיב מאיר'],
  ['wikidata-grave-Q12408346',  'ישיבת בני עקיבא כפר הרא"ה'],
  ['wikidata-grave-Q6572357',   'ישיבת בני עקיבא קריית הרצוג'],
  ['wikidata-grave-Q7229951',   'ישיבת פורת יוסף'],
  ['wikidata-grave-Q7019907',   'ישיבת נתיבות יוסף'],
  ['wikidata-grave-Q6708975',   'ישיבת בני עקיבא אהל שלמה'],
  ['wikidata-grave-Q6673042',   'ישיבת בני עקיבא גבעת שמואל'],
  ['wikidata-grave-Q6994446',   'ישיבת בני עקיבא פרחי אהרן'],
  ['wikidata-grave-Q6816030',   'ישיבת בני עקיבא נחלים'],
  ['wikidata-grave-Q22056361',  'אולפנת בני עקיבא אמנה'],
  ['wikidata-grave-Q6720922',   'אולפנית בני עקיבא תל אביב'],
  ['wikidata-grave-Q6629296',   'אולפנת בני עקיבא מירון'],
  ['wikidata-grave-Q11289335',  'אולפן עקיבא'],
]);

/**
 * IDs that passed dedup but are suspicious — valid concept, needs human verification
 * before live (wrong name format, ambiguous attribution, etc.)
 */
const MANUAL_REVIEW_IDS = new Set([
  'wikidata-grave-Q6843724',   // קברי המהנדסים — לא צדיקים
  'wikidata-grave-Q205976',    // הר הזיתים — שם בית עלמין כולל (שטיינזלץ בתוכו)
  'wikidata-grave-Q3117130',   // מערת יהושפט — ייחוס שנוי במחלוקת
  'wikidata-grave-Q6581399',   // קבר סית מנע — ייחוס לא ברור
  'wikidata-grave-Q2777361',   // פרוד — שם כפר, צריך שינוי ל"קבר ר' ישמעאל"
  'wikidata-grave-Q1018884',   // כאבול — שם כפר, צריך שינוי ל"קבר אבן עזרא"
  'wikidata-grave-Q2632879',   // כפר יאסיף — שגיאה! רמח"ל קבור בעכו
  'wikidata-grave-Q331729',    // יד אבשלום — מצבה/מונומנט, לא קבר ממש (ציון 40)
  // Phase 6 — ודאות חלקית, ממתינים לאימות ידני
  'osm-osm-way-161058978',     // קבר דוד המלך — נשמר אחרי הסרת כפילות, ודאות חלקית
  'osm-osm-node-1339404829',   // ציונו של חבקוק הנביא — ציון 42, ייחוס שנוי
  'osm-osm-node-7417569686',   // ציון התנא רבי יהודה בן בבא — ציון 60, זיהוי OSM בלבד
  'osm-osm-node-8281773511',   // קבר יהודה — ציון 60, ייחוס לא חד-משמעי
  'osm-osm-way-166098884',     // שמעון הצדיק — ללא "קבר" בשם
  'osm-osm-way-229650644',     // הצדיק האלקי — זהות לא ברורה
  'osm-osm-node-4488634668',   // אליהו הנביא (עין שריד) — ייתכן ביכ"נ
  'osm-osm-way-166389921',     // אליהו הנביא — לא מזוהה
  'osm-osm-way-183194389',     // אליהו הנביא — לא מזוהה
  'osm-osm-way-364023176',     // אליהו הנביא — לא מזוהה
  'osm-osm-way-784153750',     // אליהו הנביא — לא מזוהה
  'osm-osm-node-8626554294',   // רבי יוסי סראגוסי — ללא "קבר" בשם, ציון 30
]);

/**
 * Name/person overrides for specific Wikidata Q-IDs whose label is non-Hebrew
 * or lacks burial-person metadata. Applied post-dedup, pre-classification.
 */
const QID_ENRICHMENTS = new Map<string, {
  name?: string;
  buriedPerson?: string;
  city?: string;
  confidenceScore?: number;
  confidenceLevel?: 'high' | 'medium' | 'low';
  confidenceReason?: string;
}>([
  // --- Name fixes (non-Hebrew Wikidata labels) ---
  ['Q2907254', {
    name: 'קבר שמואל הנביא',
    buriedPerson: 'שמואל הנביא',
    city: 'ירושלים',
    confidenceScore: 85,
    confidenceLevel: 'high',
    confidenceReason: 'Wikidata Q2907254 | שם תוקן מ"נבי סמואל" | קואורדינטות מאומתות',
  }],
  // --- City completions (Wikidata records missing city from API) ---
  // coords 32.7662,35.5498 — טבריה (Tiberias)
  ['Q6653557',   { city: 'טבריה' }],
  // coords 32.8271,34.9701 — חיפה (Haifa, western Carmel area)
  ['Q120411618', { city: 'חיפה' }],
  // coords 31.7764,35.2391 — ירושלים (Kidron Valley)
  ['Q1708945',   { city: 'ירושלים' }],
  // coords 32.7032,35.1287 — בית שערים (Beit She'arim National Park)
  ['Q12410947',  { city: 'בית שערים' }],
  // coords 31.7762,35.2391 — ירושלים (Kidron Valley, adjacent to Q1708945)
  ['Q492091',    { city: 'ירושלים' }],
  // coords 31.4304,34.5855 — נתיבות
  ['Q5216485',   { city: 'נתיבות' }],
  // coords 31.6364,35.2098 — תקוע
  ['Q119719894', { city: 'תקוע' }],
  // coords 32.1186,35.1569 — תמנת סרח (traditional biblical name; Kifl Hares area, Samaria)
  ['Q6970838',   { city: 'תמנת סרח' }],
  // coords 32.7900,35.5372 — טבריה
  ['Q625219',    { city: 'טבריה' }],
]);

// ---------------------------------------------------------------------------
// Must-have checklist — Phase 3: multi-signal verification
// ---------------------------------------------------------------------------

interface MustHaveDef {
  name: string;
  /** Authoritative Wikidata Q-ID(s) for this site */
  qids?: string[];
  /** Expected bounding box (±~3km) — rules out wrong sites with similar names */
  area: { latMin: number; latMax: number; lngMin: number; lngMax: number };
  /** Name patterns — only used when Q-ID and coords both match */
  namePatterns: RegExp[];
  /** Valid OSM historic/amenity types for this site */
  validTypes?: RegExp[];
  note?: string;
}

const GRAVE_TYPE_RE = /tomb|shrine|grave|burial|historic|מקאם/i;

const MUST_HAVES: MustHaveDef[] = [
  {
    name: 'קבר רחל',
    qids: ['Q1302541'],
    area: { latMin: 31.69, latMax: 31.76, lngMin: 35.17, lngMax: 35.24 },
    namePatterns: [/קבר רחל/i, /rachel.*tomb/i, /tomb.*rachel/i, /kever.*rachel/i],
    validTypes: [GRAVE_TYPE_RE],
  },
  {
    name: 'מערת המכפלה',
    qids: ['Q204200'],
    area: { latMin: 31.50, latMax: 31.55, lngMin: 35.08, lngMax: 35.14 },
    namePatterns: [/מערת המכפלה/i, /cave.*machpelah/i, /machpelah/i, /ibrahimi/i],
  },
  {
    name: 'קבר יוסף',
    qids: ['Q1297538'],
    area: { latMin: 32.19, latMax: 32.24, lngMin: 35.26, lngMax: 35.31 },
    namePatterns: [/קבר יוסף/i, /joseph.*tomb/i, /tomb.*joseph/i],
  },
  {
    name: 'קבר רבי שמעון בר יוחאי (רשב"י)',
    qids: ['Q5371188'],
    area: { latMin: 32.97, latMax: 33.01, lngMin: 35.45, lngMax: 35.52 },
    namePatterns: [/שמעון בר יוחאי/i, /rashbi/i, /bar yochai/i, /רשב"י/i],
  },
  {
    name: 'קבר רבי מאיר בעל הנס',
    qids: ['Q6653557'],
    area: { latMin: 32.77, latMax: 32.82, lngMin: 35.52, lngMax: 35.57 },
    namePatterns: [/מאיר בעל הנס/i, /meir baal/i, /בעל הנס/i],
  },
  {
    name: 'קבר רבי עקיבא',
    area: { latMin: 32.76, latMax: 32.81, lngMin: 35.51, lngMax: 35.55 },
    namePatterns: [/קבר.*עקיבא/i, /עקיבא.*קבר/i, /tomb.*akiva/i, /kever.*akiva/i],
  },
  {
    name: 'קבר האר"י הקדוש',
    area: { latMin: 32.95, latMax: 32.98, lngMin: 35.48, lngMax: 35.51 },
    namePatterns: [/קבר.*האר/i, /האר.*קבר/i, /ציון.*האר/i, /tomb.*ari/i, /kever.*ari/i],
  },
  {
    name: 'קבר רבי נחמן מברסלב',
    area: { latMin: 48.7, latMax: 48.8, lngMin: 30.2, lngMax: 30.3 }, // אומן, אוקראינה
    namePatterns: [/נחמן מברסלב/i, /nachman.*breslov/i],
    note: 'מחוץ לגבולות ישראל (אומן, אוקראינה) — מחוץ לסקופ הנוכחי',
  },
];

function inArea(
  r: TzaddikGraveRaw,
  area: MustHaveDef['area'],
): boolean {
  if (r.lat == null || r.lng == null) return false;
  return r.lat >= area.latMin && r.lat <= area.latMax &&
         r.lng >= area.lngMin && r.lng <= area.lngMax;
}

function checkMustHaves(records: TzaddikGraveRaw[]): MustHaveCheck[] {
  return MUST_HAVES.map((def) => {
    for (const r of records) {
      const confirmedBy: ('qid' | 'coords' | 'name')[] = [];

      // 1. Q-ID match (strongest signal)
      if (def.qids && r.wikidataId && def.qids.includes(r.wikidataId)) {
        confirmedBy.push('qid');
      }

      // 2. Coords in expected area
      if (inArea(r, def.area)) {
        confirmedBy.push('coords');
      }

      // 3. Name pattern match
      const nameText = [r.name, r.buriedPerson, r.buriedPersonHe].filter(Boolean).join(' ');
      if (def.namePatterns.some((p) => p.test(nameText))) {
        confirmedBy.push('name');
      }

      // Require at least 2 signals, or Q-ID alone (authoritative)
      const qualified =
        confirmedBy.includes('qid') ||
        (confirmedBy.includes('coords') && confirmedBy.includes('name'));

      if (qualified) {
        return {
          name: def.name,
          found: true,
          foundAs: r.name || undefined,
          sourceId: r.sourceId,
          note: def.note,
          confirmedBy,
          expectedArea: def.area,
        };
      }
    }
    return {
      name: def.name,
      found: false,
      note: def.note,
      expectedArea: def.area,
    };
  });
}

// ---------------------------------------------------------------------------
// Suspicious records (low confidence or ambiguous)
// ---------------------------------------------------------------------------
function findSuspicious(records: TzaddikGraveRaw[]): TzaddikGraveRaw[] {
  return records.filter((r) => r.confidenceLevel === 'low' || (r.confidenceScore || 0) < 45);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export async function importTzaddikGraves(): Promise<PreviewReport> {
  const verifiedAt = new Date().toISOString().slice(0, 10);
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  קברי צדיקים — Phase 2 Dry Run         ║');
  console.log('╚══════════════════════════════════════════╝\n');

  console.log('▶ שולף ערים מ-OSM…');
  const localities = await fetchLocalities();

  console.log('\n▶ מקור 1: OpenStreetMap (3 שאילתות)');
  const osmRaw = await fetchOsmGraves(localities, verifiedAt);

  console.log('\n▶ מקור 2: Wikidata SPARQL (2 שאילתות עם סינון)');
  const wikidataRaw = await fetchWikidataGraves(verifiedAt);

  // Inject manual seeds (fill verifiedAt)
  const seeds = MANUAL_SEEDS.map((s) => ({ ...s, verifiedAt }));
  console.log(`\n▶ Seeds ידניים: ${seeds.length} רשומות`);

  // Validate separately for stats
  const osmVal = validateGraves(osmRaw);
  const wdVal = validateGraves(wikidataRaw);
  const seedVal = validateGraves(seeds);

  const allValid = [...osmVal.valid, ...wdVal.valid, ...seedVal.valid];
  const allRejected = [...osmVal.rejected, ...wdVal.rejected];

  console.log('\n▶ דה-דופליקציה cross-source…');
  const { unique, merged } = deduplicateGraves(allValid);

  // Apply Q-ID enrichments (name/person fixes for non-Hebrew Wikidata labels)
  for (const r of unique) {
    if (r.wikidataId && QID_ENRICHMENTS.has(r.wikidataId)) {
      Object.assign(r, QID_ENRICHMENTS.get(r.wikidataId));
    }
  }

  // Phase 4: classify into 3 buckets
  const qualityRejected: { record: TzaddikGraveRaw; reason: string }[] = [];
  const manualReview: TzaddikGraveRaw[] = [];
  const approved: TzaddikGraveRaw[] = [];

  for (const r of unique) {
    if (QUALITY_REJECTED_IDS.has(r.sourceId)) {
      qualityRejected.push({ record: r, reason: QUALITY_REJECTED_IDS.get(r.sourceId)! });
    } else if (MANUAL_REVIEW_IDS.has(r.sourceId)) {
      r.manual_review_required = true;
      r.manual_review_reason = r.manual_review_reason || 'סומן לבדיקה ידנית בביקורת Phase 4';
      manualReview.push(r);
    } else {
      approved.push(r);
    }
  }

  // Must-have checklist
  const mustHaveCheck = checkMustHaves(unique);
  const suspicious = findSuspicious(unique);

  // Confidence breakdown (approved only)
  const confBreakdown = { high: 0, medium: 0, low: 0 };
  for (const r of approved) confBreakdown[r.confidenceLevel || 'low']++;

  const needsReview = manualReview.length;

  const report: PreviewReport = {
    runDate: new Date().toISOString(),
    phase: 'phase-4',
    sources: {
      osm: { fetched: osmRaw.length, accepted: osmVal.valid.length },
      wikidata: { fetched: wikidataRaw.length, accepted: wdVal.valid.length },
    },
    totals: {
      fetched: osmRaw.length + wikidataRaw.length,
      accepted: allValid.length,
      rejected: allRejected.length,
      duplicates: osmVal.duplicates + wdVal.duplicates,
      merged: merged.length,
      final: unique.length,
    },
    confidence: confBreakdown,
    mustHaveCheck,
    rejected: allRejected,
    merged,
    records: unique,
    suspicious,
    approved,
    manualReview,
    qualityRejected,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(PREVIEW_FILE, JSON.stringify(approved, null, 2), 'utf8');
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
  writeFileSync(APPROVED_FILE, JSON.stringify(approved, null, 2), 'utf8');
  writeFileSync(MANUAL_REVIEW_FILE, JSON.stringify(manualReview, null, 2), 'utf8');
  writeFileSync(REJECTED_FILE, JSON.stringify(qualityRejected, null, 2), 'utf8');

  // Summary
  const found = mustHaveCheck.filter((c) => c.found).length;
  const missing = mustHaveCheck.filter((c) => !c.found && !c.note).length;
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║         סיכום Phase 4 — Clean Dataset   ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║ OSM:       שולפו ${String(osmRaw.length).padStart(4)} | אושרו ${String(osmVal.valid.length).padStart(4)}     ║`);
  console.log(`║ Wikidata:  שולפו ${String(wikidataRaw.length).padStart(4)} | אושרו ${String(wdVal.valid.length).padStart(4)}     ║`);
  console.log(`║ Seeds:     ${String(seeds.length).padStart(4)}                          ║`);
  console.log(`║ נפסלו (validation): ${String(allRejected.length).padStart(4)}              ║`);
  console.log(`║ מוזגו:     ${String(merged.length).padStart(4)}                          ║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║ ✅ מאושרות ל-live:     ${String(approved.length).padStart(4)}              ║`);
  console.log(`║ ⚠️  לבדיקה ידנית:     ${String(manualReview.length).padStart(4)}              ║`);
  console.log(`║ ❌ נדחו (quality):    ${String(qualityRejected.length).padStart(4)}              ║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║ אמינות (approved): 🟢 ${confBreakdown.high} | 🟡 ${confBreakdown.medium} | 🔴 ${confBreakdown.low} ║`);
  console.log(`║ Must-have: ${found}/${mustHaveCheck.length} נמצאו | ${missing} חסרים        ║`);
  console.log('╠══════════════════════════════════════════╣');
  if (missing > 0) {
    console.log('║ ⚠️  חסרים must-have:');
    for (const c of mustHaveCheck.filter((c) => !c.found && !c.note)) {
      console.log(`║   - ${c.name}`);
    }
  }
  console.log(`║ ✅ approved_for_live.json`);
  console.log(`║ ⚠️  manual_review.json`);
  console.log(`║ ❌ rejected.json`);
  console.log(`║ 📄 graves.report.json`);
  console.log('╚══════════════════════════════════════════╝\n');

  return report;
}

if (isMain(import.meta.url)) {
  importTzaddikGraves().catch((e) => { console.error('שגיאה:', e); process.exit(1); });
}
