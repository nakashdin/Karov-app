/**
 * Source configuration + types for the Chabad-house (בית חב״ד) importer —
 * the LEGAL FALLBACK pipeline.
 *
 * Background (see importers/chabad/README.md): there is NO open government
 * dataset that lists the ~941 physical Chabad houses. The only near-complete
 * source (chabad.org Locator) is legally gated (ToS forbids bulk extraction).
 * So this importer composes ONLY openly-licensed sources, accepting partial
 * coverage by design:
 *   1. OpenStreetMap (ODbL)        — has coordinates, sparse (~47 elements).
 *   2. data.gov.il amutot registry — addresses, NO coords (→ GovMap geocode).
 *   3. Wikidata (CC0)              — fully free, very sparse.
 *
 * Like every importer here it is ADDITIVE-ONLY and never merges Chabad houses
 * INTO synagogues; see build-preview.ts (dry-run) and connect-live.ts (gated).
 */

/** Where a raw Chabad record originated. */
export type ChabadOrigin = 'osm' | 'datagov' | 'wikidata' | 'manual';

/** A user-curated entry in manual.json (highest trust; always treated as a
 * house). Coordinates optional — geocoded via GovMap from `address` + `city`. */
export interface ManualEntry {
  name: string;
  city: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
  contactPerson?: string;
  services?: string[];
  sourceUrl?: string;
  note?: string;
}

/** A raw Chabad record, pre-geocode / pre-dedup. The common shape all three
 * fetchers map onto. Coordinates may be absent (data.gov.il). */
export interface ChabadRaw {
  /** Stable per-source id, e.g. `osm-node-123`, `amuta-580123456`, `wd-Q42`. */
  sourceId: string;
  origin: ChabadOrigin;
  name: string;
  city?: string;
  /** Free address (street + number, or settlement). */
  address?: string;
  lat?: number | null;
  lng?: number | null;
  phone?: string;
  website?: string;
  /** Rabbi / שליח / contact person, when published. */
  contactPerson?: string;
  /** Services offered (free Hebrew strings), when published. */
  services?: string[];
  /** Canonical source page (per-record, when available). */
  sourceUrl?: string;
  /** Whether the name looks like an actual house ("בית חב״ד <מקום>") vs a fund/
   * school/regional body — used to score, never to silently drop. */
  likelyHouse?: boolean;
  /** Per-source raw fields, kept for audit (never rendered to users). */
  raw?: Record<string, unknown>;
}

/** A Chabad record AFTER coordinate resolution (native or geocoded). */
export interface ChabadGeo extends ChabadRaw {
  lat: number;
  lng: number;
  /** 'native' = source coords (OSM/Wikidata); others = GovMap geocode result. */
  coordSource: 'native' | 'govmap-address' | 'govmap-city';
  locationPrecision: 'address' | 'city';
  geocodeQuery?: string;
  geocodeLabel?: string;
}

// --- Source licenses / attribution -----------------------------------------

export const LICENSES = {
  osm: { id: 'ODbL', attribution: '© OpenStreetMap contributors (ODbL)', commercialOk: true },
  datagov: { id: 'gov-open', attribution: 'מאגר עמותות — משרד המשפטים · data.gov.il', commercialOk: 'verify' },
  wikidata: { id: 'CC0', attribution: 'Wikidata (CC0)', commercialOk: true },
  manual: { id: 'manual-curated', attribution: 'הזנה ידנית (מאומת ידנית)', commercialOk: true },
} as const;

// --- data.gov.il amutot (Ministry of Justice non-profit registry) ----------

export const DATAGOV_AMUTOT = {
  portalUrl: 'https://data.gov.il',
  /** "מאגר עמותות וחברות לתועלת הציבור" → resource "עמותות רשומות" (verified live). */
  resourceId: 'be5b7935-3922-45d4-9638-08871b17ec95',
  /** Full-text queries to pull Chabad-affiliated organizations (deduped by id). */
  queries: ['בית חב', 'חב"ד', 'חבד', 'Chabad', 'צעירי אגודת חב'],
  pageSize: 1000,
  /** Field names are discovered at runtime from CKAN `result.fields`; these are
   * the Hebrew header *patterns* used to locate each logical field. */
  fieldHints: {
    name: [/שם.*עמות.*עברית/, /שם.*עמות/, /^שם$/],
    status: [/סטטוס/, /מצב/],
    city: [/ישוב/, /יישוב/, /עיר/],
    street: [/רחוב/],
    houseNo: [/מספר.?בית|מס.?בית|בית/],
    zip: [/מיקוד/],
    regNum: [/מספר.?עמותה|מס.?עמותה|מזהה/],
  } as Record<string, RegExp[]>,
} as const;

// --- Wikidata (CC0) ---------------------------------------------------------

/** Chabad organizations/centres located in Israel, with coordinates when present.
 * Permissive: matches items whose Hebrew/English label mentions Chabad and that
 * are located in Israel (P17=Q801). Sparse by nature — tolerated. */
export const WIKIDATA_SPARQL = `
SELECT ?item ?itemLabel ?coord ?cityLabel WHERE {
  ?item wdt:P17 wd:Q801 .
  ?item rdfs:label ?lbl .
  FILTER( CONTAINS(?lbl, "חב\\"ד") || CONTAINS(LCASE(?lbl), "chabad") || CONTAINS(LCASE(?lbl), "lubavitch") )
  OPTIONAL { ?item wdt:P625 ?coord . }
  OPTIONAL { ?item wdt:P131 ?city . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "he,en". }
}
LIMIT 500`;

export const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';

// --- OpenStreetMap (Overpass) ----------------------------------------------

/** Narrowed Overpass query: Jewish religious places whose name/operator matches
 * Chabad. Scoped to the `religion=jewish` subset first (indexed) so it does not
 * time out on a full-country name scan. */
export const OVERPASS_QUERY = `[out:json][timeout:180];
area["ISO3166-1"="IL"]->.il;
nwr["religion"="jewish"](area.il)->.jew;
(
  nwr.jew["name"~"חב"];
  nwr.jew["name"~"Chabad",i];
  nwr.jew["operator"~"חב|Chabad",i];
);
out center tags;`;

// --- helpers shared across the chabad importer ------------------------------

/** Matches a Hebrew/Latin "Chabad" token (חב״ד / חבד / Chabad / Lubavitch). */
export const CHABAD_RE = /חב["'׳״]?ד|chabad|lubavitch/i;

/** Looks like a physical Chabad HOUSE ("בית חב״ד …") rather than (a) a geographic
 * feature in Kfar Chabad village — station/interchange/street/the village itself —
 * or (b) an institution/fund/yeshiva. Best-effort; used to gate write-ready, never
 * to silently drop (non-house Chabad-named items are reported separately). */
export function looksLikeHouse(name: string): boolean {
  // geographic features & non-house landmarks → not a house
  if (/תחנת|מחלף|רחוב|שיכון|בניין|מבנה|770|כיכר|גשר|צומת|מועצה\s*אזורית/i.test(name)) return false;
  if (/^כפר\s*חב|^kfar\s*chabad/i.test(name.trim())) return false; // the village
  // institutions → not a "house"
  if (/קרן|מוסדות|ישיב|תלמוד\s*תורה|כולל|גן\s|בית\s*ספר|בית\s*המדרש|אגודת|עמותת\s*תושבי/i.test(name)) return false;
  // positive: an actual Chabad house / center
  if (/בית\s*חב["'׳״]?ד|בתי\s*חב["'׳״]?ד|chabad house|צעירי\s*חב|בית\s*חב/i.test(name)) return true;
  return CHABAD_RE.test(name);
}
