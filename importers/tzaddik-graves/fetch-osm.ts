/**
 * Phase 2 — OSM fetcher for Jewish holy graves & shrines.
 * License: ODbL (attribution required).
 *
 * Extended queries:
 *   1. historic=tomb + religion=jewish
 *   2. historic=shrine + religion=jewish
 *   3. amenity=place_of_worship + religion=jewish  (filtered post-fetch by name)
 *   4. Specific must-have sites by name tag
 */
import { fetchOverpass, nearestLocality, osmCoords, osmId, sleep } from '../shared/utils.ts';
import type { Locality, OsmElement } from '../shared/types.ts';
import type { TzaddikGraveRaw } from './types.ts';

const IL_BBOX = '29.3,34.2,33.5,35.95';

// --- Overpass queries --------------------------------------------------------

/** Query 1: explicit tombs with jewish religion tag */
const QUERY_TOMBS = `[out:json][timeout:90];
(
  nwr["historic"="tomb"]["religion"="jewish"](${IL_BBOX});
  nwr["historic"="memorial"]["religion"="jewish"]["memorial"="tomb"](${IL_BBOX});
  nwr["tomb"="yes"]["religion"="jewish"](${IL_BBOX});
);
out center tags;`;

/** Query 2: shrines with jewish religion tag */
const QUERY_SHRINES = `[out:json][timeout:90];
(
  nwr["historic"="shrine"]["religion"="jewish"](${IL_BBOX});
  nwr["historic"="wayside_shrine"]["religion"="jewish"](${IL_BBOX});
);
out center tags;`;

/** Query 3: Jewish places of worship — will be filtered by name */
const QUERY_WORSHIP = `[out:json][timeout:120];
(
  nwr["amenity"="place_of_worship"]["religion"="jewish"](${IL_BBOX});
);
out center tags;`;

/**
 * Query 4: Targeted must-have sites by name (Hebrew + English).
 * Catches sites that may use different historic= tags or be tagged as mosques/churches
 * but are known Jewish holy sites.
 */
const QUERY_MUSTHAAVE = `[out:json][timeout:90];
(
  nwr[name~"קבר רחל",i](${IL_BBOX});
  nwr["name:he"~"קבר רחל",i](${IL_BBOX});
  nwr[name~"rachel",i](${IL_BBOX});
  nwr[name~"מערת המכפלה",i](${IL_BBOX});
  nwr[name~"machpelah",i](${IL_BBOX});
  nwr[name~"ibrahimi",i](${IL_BBOX});
  nwr[name~"קבר יוסף",i](${IL_BBOX});
  nwr["name:he"~"קבר יוסף",i](${IL_BBOX});
  nwr[name~"joseph.*tomb",i](${IL_BBOX});
  nwr[name~"tomb.*joseph",i](${IL_BBOX});
  nwr[name~"רבי עקיבא",i](${IL_BBOX});
  nwr[name~"rabbi akiva",i](${IL_BBOX});
  nwr[name~"האר.י",i](${IL_BBOX});
  nwr["name:he"~"האר",i](${IL_BBOX});
  nwr[name~"ari.*tomb",i](${IL_BBOX});
  nwr[name~"luria",i](${IL_BBOX});
);
out center tags;`;

// ---------------------------------------------------------------------------

/**
 * Patterns that POSITIVELY indicate a grave/tomb/shrine.
 * "ציון" removed — too many false positives from synagogue names (שערי ציון etc.)
 */
const GRAVE_NAME_PATTERNS = [
  /קבר/i,
  /מערת/i,
  /גל.עד/i,
  /tomb/i,
  /grave/i,
  /shrine/i,
  /burial/i,
  /sepulch/i,
  /מקאם/i,
  /ציון התנא/i,   // specific: "ציון התנא ר' פלוני"
  /ציון ה/i,      // "ציון הרב" etc.
  /kever/i,
  /הצדיק/i,
  /הנביא/i,
];

/** Specific must-have names — accept even if no generic pattern matches */
const MUST_HAVE_NAMES = [
  'קבר רחל', "rachel's tomb", 'rachel tomb', 'kever rachel', 'tomb of rachel',
  'מערת המכפלה', 'cave of machpelah', 'machpelah', 'ibrahimi',
  'קבר יוסף', "joseph's tomb", 'tomb of joseph', 'kever yosef',
  'קבר רבי עקיבא', 'rabbi akiva', 'tomb of akiva',
  'קבר האר"י', 'ari tomb', 'tomb of ari', 'luria tomb',
  'קבר רבי נחמן', 'nachman',
];

/** Reject names that start with these — they are synagogues or generic places */
const REJECT_PREFIXES = ['בית כנסת', 'בי"כ', "בי'כ", 'היכל', 'מרכז'];

function nameMatchesGrave(name: string): boolean {
  const lower = name.toLowerCase();
  // Reject synagogue names
  if (REJECT_PREFIXES.some((p) => name.startsWith(p))) return false;
  // Accept must-haves
  if (MUST_HAVE_NAMES.some((n) => lower.includes(n.toLowerCase()))) return true;
  // Accept by pattern
  return GRAVE_NAME_PATTERNS.some((p) => p.test(name));
}

function pickName(tags: Record<string, string>): string | null {
  return tags['name:he'] || tags.name || tags['name:en'] || null;
}

function pickBuriedPerson(tags: Record<string, string>): string | undefined {
  return (
    tags['subject:he'] ||
    tags.subject ||
    tags['historic:name:he'] ||
    tags['historic:name'] ||
    undefined
  );
}

/** Determine OSM sub-type for confidence scoring */
function osmSubtype(tags: Record<string, string>): string {
  if (tags['historic'] === 'tomb') return 'tomb';
  if (tags['historic'] === 'shrine') return 'shrine';
  if (tags['historic'] === 'memorial') return 'memorial';
  if (tags['amenity'] === 'place_of_worship') return 'worship';
  if (tags['amenity'] === 'grave_yard') return 'graveyard';
  return 'other';
}

function toRaw(
  el: OsmElement,
  localities: Locality[],
  verifiedAt: string,
  queryLabel: string,
): TzaddikGraveRaw | null {
  const tags = el.tags || {};
  const coords = osmCoords(el);
  const lat = coords?.latitude ?? null;
  const lng = coords?.longitude ?? null;

  const name = pickName(tags);

  const city =
    lat != null && lng != null
      ? nearestLocality(lat, lng, localities) || tags['addr:city'] || undefined
      : tags['addr:city'] || undefined;

  const street = [tags['addr:street'], tags['addr:housenumber']]
    .filter(Boolean)
    .join(' ')
    .trim();
  const address = street ? `${street}, ${city || ''}`.trim() : city;

  return {
    sourceId: `osm-${osmId(el)}`,
    source: 'osm',
    name,
    lat,
    lng,
    city,
    address: address || undefined,
    phone: tags['contact:phone'] || tags.phone || undefined,
    buriedPerson: pickBuriedPerson(tags),
    osmId: `${el.type}/${el.id}`,
    hillula: tags['hillula'] || tags['festival:date'] || undefined,
    verifiedAt,
    extra: {
      osmType: el.type,
      osmSubtype: osmSubtype(tags),
      osmQuery: queryLabel,
      osmTags: tags,
      wikidataTag: tags.wikidata,
    },
  };
}

export async function fetchOsmGraves(
  localities: Locality[],
  verifiedAt: string,
): Promise<TzaddikGraveRaw[]> {
  console.log('[OSM] שולף קברי צדיקים — Phase 2 (3 שאילתות)…');

  const results: TzaddikGraveRaw[] = [];
  const seenIds = new Set<string>();

  function add(raw: TzaddikGraveRaw | null) {
    if (!raw) return;
    if (seenIds.has(raw.sourceId)) return;
    seenIds.add(raw.sourceId);
    results.push(raw);
  }

  async function safeOverpass(query: string, label: string): Promise<OsmElement[]> {
    try {
      await sleep(2000); // polite pause between queries
      const data = await fetchOverpass(query, label);
      return data.elements || [];
    } catch (e) {
      console.warn(`  [OSM] שאילתה ${label} נכשלה לחלוטין: ${(e as Error).message} — ממשיך ללא תוצאות`);
      return [];
    }
  }

  // Query 1: tombs
  const tombEls = await safeOverpass(QUERY_TOMBS, 'osm-tombs');
  console.log(`  [OSM] שאילתה 1 (tombs): ${tombEls.length} אלמנטים`);
  for (const el of tombEls) add(toRaw(el, localities, verifiedAt, 'tomb'));

  // Query 2: shrines
  const shrineEls = await safeOverpass(QUERY_SHRINES, 'osm-shrines');
  console.log(`  [OSM] שאילתה 2 (shrines): ${shrineEls.length} אלמנטים`);
  for (const el of shrineEls) add(toRaw(el, localities, verifiedAt, 'shrine'));

  // Query 3: places of worship — filter by name
  const worshipEls = await safeOverpass(QUERY_WORSHIP, 'osm-worship');
  console.log(`  [OSM] שאילתה 3 (worship raw): ${worshipEls.length} אלמנטים`);
  let worshipAccepted = 0;
  for (const el of worshipEls) {
    const tags = el.tags || {};
    const name = pickName(tags);
    if (!name) continue;
    if (!nameMatchesGrave(name)) continue;
    const raw = toRaw(el, localities, verifiedAt, 'worship-filtered');
    if (raw) { add(raw); worshipAccepted++; }
  }
  console.log(`  [OSM] שאילתה 3 (worship filtered): ${worshipAccepted} אושרו`);

  // Query 4: targeted must-have sites by name
  const mustHaveEls = await safeOverpass(QUERY_MUSTHAAVE, 'osm-musthave');
  console.log(`  [OSM] שאילתה 4 (must-haves raw): ${mustHaveEls.length} אלמנטים`);
  let mustHaveAccepted = 0;
  for (const el of mustHaveEls) {
    const raw = toRaw(el, localities, verifiedAt, 'musthave');
    if (raw) { add(raw); mustHaveAccepted++; }
  }
  console.log(`  [OSM] שאילתה 4 (must-haves added): ${mustHaveAccepted} נוספו`);

  console.log(`[OSM] סה"כ ייחודיים: ${results.length}`);
  return results;
}
