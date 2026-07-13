/**
 * Shared types for the data importers (the research → production pipeline).
 *
 * Every source (OSM, data.gov.il, …) maps its raw records onto the single
 * `NormalizedPlace` shape below. The combine step in `database.ts` then narrows
 * the app-supported types into the dataset the app actually reads.
 */
import type { Place } from '../../src/types/place.ts';

/**
 * Place categories the importers can produce.
 *
 * NOTE: the app's `PlaceType` (src/types/place.ts) currently supports only
 * 'synagogue' | 'restaurant'. 'mikveh' is imported ahead of app support — see
 * importers/mikvahs/README.md before wiring it into the app dataset.
 */
export type ImportType = 'synagogue' | 'restaurant' | 'fast_food' | 'mikveh';

/** Where a record originated (for attribution / trust). */
export type ImportSource = 'osm' | 'datagov' | 'seed';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** A locality used to assign each place to its nearest city (Hebrew name). */
export interface Locality {
  name: string;
  lat: number;
  lng: number;
}

/**
 * Common normalized record shape — the target schema every source maps to.
 * A superset of the app's `Place`: app-only fields (rating, kosherType, …) are
 * intentionally absent because no free source provides them reliably yet.
 */
export interface NormalizedPlace {
  id: string;
  name: string;
  type: ImportType;
  /** City name doubles as id (a real OSM locality name, consistent Hebrew). */
  cityId: string;
  address: string;
  location: GeoPoint;
  source: ImportSource;
  phone?: string;
  openingHours?: string;
  tags?: string[];
  /** Free-form per-source fields kept for later enrichment. */
  extra?: Record<string, unknown>;
}

/**
 * Output record of the synagogues importer (a LOCAL test artifact).
 *
 * This is intentionally separate from the app's `Place` (src/types/place.ts):
 * `sourceId`, `verifiedAt` and `isActive` do NOT exist on the app type, and we
 * must not break it — so they live here, in the importer layer only. Note the
 * shape also differs from `Place` on purpose (flat `lat`/`lng` instead of a
 * `location` object, `source: 'openstreetmap'`, `city` instead of `cityId`).
 */
export interface SynagoguePlace {
  type: 'synagogue';
  source: 'openstreetmap';
  /** Canonical OSM reference, e.g. "node/123456". */
  sourceId: string;
  name: string | null;
  lat: number | null;
  lng: number | null;
  city?: string;
  address?: string;
  phone?: string;
  /** ISO date (YYYY-MM-DD) the record was imported / verified. */
  verifiedAt: string;
  isActive: true;
}

/**
 * Raw mikveh record from data.gov.il AFTER text cleaning (whitespace only —
 * content is never altered). Mirrors the source fields; has NO coordinates.
 */
export interface MikvahRaw {
  sourceId: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  hoursSummer: string;
  hoursWinter: string;
  hoursShabbat: string;
  accessibility: string;
  forWomen: string;
  forMen: string;
  forDishes: string;
  brideRoom: string;
  responsible: string;
  council: string;
}

/**
 * Normalized mikveh — the importer's internal Place-like shape BEFORE
 * geocoding. `lat`/`lng` are intentionally ABSENT at this stage; they are added
 * later (step 3) by the geocoder. Importer-only fields (sourceId, verifiedAt,
 * isActive, extra) are not part of the app's `Place` type.
 */
export interface MikvahPlace {
  type: 'mikveh';
  source: 'datagov';
  sourceId: string;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  /** Summer hours, used as the primary display string. */
  openingHours?: string;
  verifiedAt: string;
  isActive: true;
  /** Source-specific fields kept for later use (not in the app Place). */
  extra: {
    hoursWinter?: string;
    hoursShabbat?: string;
    accessibility?: string;
    forWomen?: string;
    forMen?: string;
    forDishes?: string;
    brideRoom?: string;
    responsible?: string;
    council?: string;
  };
}

/** Geocoding precision for a mikveh coordinate. */
export type GeocodePrecision = 'address' | 'city' | 'failed';

/**
 * A mikveh AFTER geocoding (step 3). Only records that actually resolved are
 * written, so `lat`/`lng` are always present and `geocodePrecision` is never
 * 'failed' in the output file.
 */
export interface GeocodedMikvah extends MikvahPlace {
  lat: number;
  lng: number;
  geocodeQuery: string;
  geocodePrecision: 'address' | 'city';
  /** ISO date (YYYY-MM-DD) the coordinate was resolved. */
  geocodedAt: string;
}

/**
 * App-ready mikveh (steps 4-5). Built by extending the app's `Place` with all
 * fields EXCEPT `type` (so the shared fields keep identical types to `Place`),
 * then setting `type: 'mikveh'` and adding mikveh-only metadata.
 *
 * This is "app-ready" by construction: once `'mikveh'` is added to the app's
 * `PlaceType` (a later, approved step), an AppReadyMikvah minus its
 * `locationPrecision`/`extra` extras is structurally a valid `Place`. We do NOT
 * change `PlaceType` now, so `type: 'mikveh'` lives only in this importer layer.
 *
 * Provenance: the app's `Place.source` enum is only 'osm' | 'seed', so the real
 * source is kept in `extra.dataSource` rather than breaking that union.
 */
export interface AppReadyMikvah extends Omit<Place, 'type'> {
  type: 'mikveh';
  /** Coordinate accuracy: 'address' = exact, 'city' = approximate (city centre). */
  locationPrecision: 'address' | 'city';
  extra: {
    dataSource: 'data.gov.il';
    geocodeQuery: string;
    geocodePrecision: 'address' | 'city';
    accessibility?: string;
    forWomen?: string;
    forMen?: string;
    forDishes?: string;
    brideRoom?: string;
    responsibleWorker?: string;
  };
}

/** A raw Overpass/OSM element (`out center tags`). */
export interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Result of validating a batch of normalized records. */
export interface ValidationResult {
  valid: NormalizedPlace[];
  rejected: { record: Partial<NormalizedPlace>; reason: string }[];
}
