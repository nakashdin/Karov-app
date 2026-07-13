/**
 * Phase 2 — Wikidata SPARQL fetcher with smart filtering.
 * License: CC0 (Public Domain).
 *
 * Filters:
 *  - Query 1: graves/tombs in Israel (Q173387) with Hebrew labels
 *  - Query 2: Jewish religious figures (rabbi, tanna, amora, kabbalist, prophet)
 *             buried in Israel — NOT generic cities/cemeteries
 *  - Exclude: non-specific burial places (cities, regions, generic cemeteries)
 */
import { USER_AGENT, sleep } from '../shared/utils.ts';
import type { TzaddikGraveRaw } from './types.ts';

const ENDPOINT = 'https://query.wikidata.org/sparql';

// ---------------------------------------------------------------------------
// Query 1: Explicit grave/tomb entities in Israel with coordinates
// ---------------------------------------------------------------------------
const QUERY_GRAVES = `
SELECT DISTINCT ?grave ?graveLabel ?lat ?lon ?personLabel WHERE {
  { ?grave wdt:P31 wd:Q173387 . }
  UNION
  { ?grave wdt:P31 wd:Q614527 . }
  ?grave wdt:P17 wd:Q801 .
  ?grave wdt:P625 ?coord .
  BIND(geof:latitude(?coord) AS ?lat)
  BIND(geof:longitude(?coord) AS ?lon)
  OPTIONAL { ?grave wdt:P921 ?person }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "he,en". }
}
LIMIT 500
`;

// ---------------------------------------------------------------------------
// Query 2: Notable Jewish religious figures buried in Israel
// Occupations included: rabbi (Q1712387), tanna (Q193510), amora (Q215980),
//   kabbalist (Q205479), prophet (Q42857), Jewish religious leader (Q55637)
//   religious figure (Q15995642), sage (Q4964182)
// ---------------------------------------------------------------------------
const QUERY_RABBIS = `
SELECT DISTINCT ?person ?personLabel ?burialPlace ?burialPlaceLabel ?lat ?lon ?occupation ?occupationLabel WHERE {
  VALUES ?validOccupation {
    wd:Q1712387  wd:Q193510   wd:Q215980
    wd:Q205479   wd:Q42857    wd:Q55637
    wd:Q15995642 wd:Q4964182  wd:Q116
    wd:Q2259532  wd:Q350979
  }
  ?person wdt:P106 ?validOccupation .
  ?person wdt:P119 ?burialPlace .
  ?burialPlace wdt:P17 wd:Q801 .
  ?burialPlace wdt:P625 ?coord .
  BIND(geof:latitude(?coord) AS ?lat)
  BIND(geof:longitude(?coord) AS ?lon)
  BIND(?validOccupation AS ?occupation)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "he,en". }
}
LIMIT 500
`;

// ---------------------------------------------------------------------------
// Post-fetch filters
// ---------------------------------------------------------------------------

/**
 * Must-have Q-IDs — always included regardless of other filters.
 * These are confirmed Jewish holy grave sites.
 */
const MUST_HAVE_QIDS = new Set([
  'Q1302541',   // קבר רחל (Rachel's Tomb, Bethlehem)
  'Q204200',    // מערת המכפלה (Cave of Machpelah, Hebron)
  'Q1297538',   // קבר יוסף (Joseph's Tomb, Nablus)
  'Q5371188',   // קבר רשב"י
  'Q6653557',   // קבר רבי מאיר בעל הנס
  // Phase 5.5 — verified by Q-ID lookup
  'Q625219',    // קבר הרמב"ם, טבריה
  'Q5216485',   // קבר הבאבא סאלי, נתיבות
  'Q12410947',  // מערת רבי יהודה הנשיא, בית שערים
  'Q6970838',   // קבר יהושע בן נון, שומרון
  'Q6732917',   // קבר אבנר בן נר, חברון
  'Q119719894', // קבר עמוס הנביא, תקוע
  'Q2907254',   // קבר שמואל הנביא, ירושלים
  'Q492091',    // קבר זכריה הנביא, ירושלים
  'Q1708945',   // קבר בני חזיר, ירושלים
  'Q331729',    // יד אבשלום, ירושלים
]);

/** Wikidata Q-IDs of generic locations to exclude (cities, regions) */
const EXCLUDE_BURIAL_QIDS = new Set([
  'Q33935',   // תל אביב-יפו
  'Q41621',   // חיפה
  'Q41843',   // באר שבע
  'Q207350',  // רחובות
  'Q192225',  // נתניה
  'Q192807',  // רמת גן
  'Q190828',  // פתח תקווה
  'Q192213',  // חולון
  'Q152436',  // כפר סבא
  'Q152379',  // הוד השרון
  'Q152467',  // בני ברק (עיר — לא קבר)
  'Q151920',  // טבריה (עיר)
  'Q152396',  // דימונה
  'Q198399',  // זכרון יעקב
  'Q188336',  // צפת (עיר)
  'Q104028',  // יהודה (אזור)
  'Q48175',   // ארץ הקודש (אזור)
  'Q201051',  // ראשון לציון
  'Q126084',  // עכו (עיר)
  'Q60956',   // אשקלון
  'Q193785',  // הר תבור (נוצרי)
  'Q187499',  // אל-באהג'ה (בהאי)
  'Q205333',  // גת שמנים (נוצרי)
  'Q187702',  // כנסיית הקבר (נוצרי)
]);

/** Name patterns that signal a non-Jewish or irrelevant entry */
const EXCLUDE_NAME_PATTERNS = [
  /^ארץ הקודש$/, /^יהודה$/, /^ישראל$/,
  // Non-Jewish religious sites
  /גן הקבר/, /garden tomb/i,      // Christian site
  /מקדש הבאב/, /shrine.*bab/i,    // Baha'i
  /אגודה המשיחית/, /apostolic/i,   // Christian
  /טמפלרי/, /templar/i,            // Templar
  /אל-איברהימי/,                    // OK actually to include machpelah under this name
];

/** Name patterns for generic cemeteries (not specific tzaddik graves) */
const GENERIC_CEMETERY_PATTERNS = [
  /^בית הקברות /,
  /^בית העלמין /,
  /^בית קברות /,
  /^בי"ח הקברות/,
  /^בית עלמין /,
];

/** Name patterns that signal it IS a specific grave/shrine */
const GRAVE_NAME_PATTERNS = [/קבר/, /מערת/, /ציון/, /tomb/i, /shrine/i, /burial/i, /מקאם/i, /kever/i];

function looksLikeGrave(name: string): boolean {
  return GRAVE_NAME_PATTERNS.some((p) => p.test(name));
}

function isGenericCemetery(name: string): boolean {
  return GENERIC_CEMETERY_PATTERNS.some((p) => p.test(name));
}

function shouldExclude(graveQid: string, name: string): boolean {
  if (MUST_HAVE_QIDS.has(graveQid)) return false; // never exclude must-haves
  if (EXCLUDE_BURIAL_QIDS.has(graveQid)) return true;
  if (EXCLUDE_NAME_PATTERNS.some((p) => p.test(name))) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Query 3: Must-have sites by Q-ID only (no free label search — prevents flood)
// ---------------------------------------------------------------------------
const QUERY_MUSTHAVE_WD = `
SELECT DISTINCT ?item ?itemLabel ?lat ?lon WHERE {
  VALUES ?item {
    wd:Q1302541  wd:Q204200   wd:Q1297538  wd:Q5371188  wd:Q6653557
    wd:Q2621762  wd:Q1084424
    wd:Q625219   wd:Q5216485  wd:Q12410947 wd:Q6970838  wd:Q6732917
    wd:Q119719894 wd:Q2907254 wd:Q492091   wd:Q1708945  wd:Q331729
  }
  OPTIONAL { ?item wdt:P625 ?coord . BIND(geof:latitude(?coord) AS ?lat) BIND(geof:longitude(?coord) AS ?lon) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "he,en". }
}
LIMIT 30
`;

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
interface Binding { value: string }

async function sparql(query: string, label: string): Promise<Record<string, Binding>[]> {
  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.results.bindings;
    } catch (e) {
      console.warn(`  [Wikidata/${label}] attempt ${attempt}: ${(e as Error).message}`);
      if (attempt < 3) await sleep(attempt * 5000);
      else throw e;
    }
  }
  return [];
}

const v = (b: Record<string, Binding>, k: string): string | undefined => b[k]?.value || undefined;
const qid = (uri?: string) => uri?.replace('http://www.wikidata.org/entity/', '') || '';

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
export async function fetchWikidataGraves(verifiedAt: string): Promise<TzaddikGraveRaw[]> {
  const results: TzaddikGraveRaw[] = [];
  const seenIds = new Set<string>();

  // --- Query 1: grave entities ---
  let q1: Record<string, Binding>[] = [];
  try {
    q1 = await sparql(QUERY_GRAVES, 'graves');
    console.log(`[Wikidata] שאילתה 1 (graves): ${q1.length} תוצאות`);
  } catch (e) { console.warn(`[Wikidata] שאילתה 1 נכשלה: ${(e as Error).message}`); }

  for (const b of q1) {
    const graveUri = v(b, 'grave') || '';
    const id = `wikidata-grave-${qid(graveUri)}`;
    const lat = parseFloat(v(b, 'lat') || '');
    const lon = parseFloat(v(b, 'lon') || '');
    if (isNaN(lat) || isNaN(lon)) continue;

    const graveQid = qid(graveUri);
    const name = v(b, 'graveLabel');
    if (!name) continue;
    if (shouldExclude(graveQid, name)) continue;

    if (seenIds.has(id)) continue;
    seenIds.add(id);

    results.push({
      sourceId: id,
      source: 'wikidata',
      name,
      lat,
      lng: lon,
      buriedPerson: v(b, 'personLabel'),
      wikidataId: graveQid,
      verifiedAt,
      extra: { sparqlQuery: 'graves', wikidataUri: graveUri },
    });
  }

  await sleep(2000);

  // --- Query 2: rabbis/religious figures ---
  let q2: Record<string, Binding>[] = [];
  try {
    q2 = await sparql(QUERY_RABBIS, 'rabbis');
    console.log(`[Wikidata] שאילתה 2 (rabbis/figures): ${q2.length} תוצאות`);
  } catch (e) { console.warn(`[Wikidata] שאילתה 2 נכשלה: ${(e as Error).message}`); }

  const burialPlaceCounts = new Map<string, number>();
  for (const b of q2) {
    const bpUri = v(b, 'burialPlace') || '';
    const bpQid = qid(bpUri);
    burialPlaceCounts.set(bpQid, (burialPlaceCounts.get(bpQid) || 0) + 1);
  }

  for (const b of q2) {
    const bpUri = v(b, 'burialPlace') || '';
    const bpQid = qid(bpUri);
    const personUri = v(b, 'person') || '';
    const personQid = qid(personUri);

    const lat = parseFloat(v(b, 'lat') || '');
    const lon = parseFloat(v(b, 'lon') || '');
    if (isNaN(lat) || isNaN(lon)) continue;

    const burialPlaceLabel = v(b, 'burialPlaceLabel') || '';
    const personLabel = v(b, 'personLabel') || '';
    const occupation = qid(v(b, 'occupation') || '');

    // Skip generic locations
    if (shouldExclude(bpQid, burialPlaceLabel)) continue;

    // Skip generic cemeteries unless they're a must-have
    if (isGenericCemetery(burialPlaceLabel) && !MUST_HAVE_QIDS.has(bpQid)) continue;

    // If burial place has many people (>8) and doesn't look like a specific grave, it's a cemetery
    const count = burialPlaceCounts.get(bpQid) || 1;
    const looksSpecific = looksLikeGrave(burialPlaceLabel) || looksLikeGrave(personLabel);
    if (count > 8 && !looksSpecific && !MUST_HAVE_QIDS.has(bpQid)) continue;

    const id = `wikidata-grave-${bpQid || personQid}`;
    if (seenIds.has(id)) {
      // Enrich existing with person if missing
      const existing = results.find((r) => r.sourceId === id);
      if (existing && !existing.buriedPerson && personLabel) {
        existing.buriedPerson = personLabel;
        existing.extra = { ...existing.extra, additionalPerson: personLabel };
      }
      continue;
    }
    seenIds.add(id);

    // Choose best name: burial place if specific, else person name
    const name = looksSpecific ? burialPlaceLabel : (burialPlaceLabel || personLabel);

    results.push({
      sourceId: id,
      source: 'wikidata',
      name: name || null,
      lat,
      lng: lon,
      buriedPerson: personLabel || undefined,
      wikidataId: bpQid || personQid,
      verifiedAt,
      extra: {
        sparqlQuery: 'rabbis',
        personQid,
        burialPlaceQid: bpQid,
        occupation,
        burialPlacePersonCount: count,
      },
    });
  }

  await sleep(2000);

  // --- Query 3: must-have sites by Q-ID and Hebrew name ---
  let q3: Record<string, Binding>[] = [];
  try {
    q3 = await sparql(QUERY_MUSTHAVE_WD, 'musthave');
    console.log(`[Wikidata] שאילתה 3 (must-haves): ${q3.length} תוצאות`);
  } catch (e) { console.warn(`[Wikidata] שאילתה 3 נכשלה: ${(e as Error).message}`); }

  for (const b of q3) {
    const itemUri = v(b, 'item') || '';
    const itemQid = qid(itemUri);
    const lat = parseFloat(v(b, 'lat') || '');
    const lon = parseFloat(v(b, 'lon') || '');
    if (isNaN(lat) || isNaN(lon)) continue;

    const id = `wikidata-grave-${itemQid}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const name = v(b, 'itemLabel');
    if (!name) continue;

    results.push({
      sourceId: id,
      source: 'wikidata',
      name,
      lat,
      lng: lon,
      wikidataId: itemQid,
      verifiedAt,
      extra: { sparqlQuery: 'musthave', wikidataUri: itemUri, isMustHave: MUST_HAVE_QIDS.has(itemQid) },
    });
  }

  console.log(`[Wikidata] סה"כ ייחודיים אחרי סינון: ${results.length}`);
  return results;
}
