/** A geographic coordinate. */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Kind of place. Drives which fields are relevant and how it's shown. */
export type PlaceType = 'restaurant' | 'fast_food' | 'cafe' | 'coffee_cart' | 'juice_bar' | 'ice_cream_parlor' | 'winery' | 'synagogue' | 'mikveh' | 'chabad_house' | 'tzaddik_grave';

/** Food category of a kosher establishment (restaurants only). */
export type KosherCategory = 'meat' | 'dairy' | 'parve';

/**
 * Kosher certification level / authority (restaurants only).
 * These are stable string keys; human labels live in `utils/kosher.ts`.
 */
export type KosherType =
  | 'kosher'
  | 'rabanut'
  | 'rabanut_beit_shean'
  | 'rabanut_mehadrin'
  | 'rabanut_mehadrin_jerusalem'
  | 'rabanut_mekomi'
  | 'rabanut_afula'
  | 'rabanut_tel_aviv'
  | 'mehadrin'
  | 'badatz_edah'
  | 'badatz_beit_yosef'
  | 'badatz_rubin'
  | 'badatz_kehilot'
  | 'rav_landa'
  | 'rav_machpud'
  | 'chatam_sofer'
  | 'other';

/** A city used for filtering. */
export interface City {
  id: string;
  name: string;
}

/** A place (kosher restaurant, synagogue, etc.). */
export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  description?: string;
  cityId: string;
  address: string;
  location: GeoPoint;
  phone?: string;
  /** Public website / homepage, when the source publishes one. */
  website?: string;
  /** Link to the menu page, when available. */
  menu?: string;
  instagram?: string;
  facebook?: string;
  openingHours?: string;
  /** ISO date (YYYY-MM-DD) the info was last verified by an admin. */
  lastVerifiedAt?: string;
  rating?: number;
  tags?: string[];
  /** Where this record came from (for attribution / trust). */
  source?: 'osm' | 'seed' | 'wikidata' | 'manual';
  /**
   * Accuracy of `location`. 'address' = an exact address geocode; 'city' = an
   * approximate city-centre point (show an "approximate location" hint). Absent
   * means an exact/native coordinate (e.g. OSM). */
  locationPrecision?: 'address' | 'city';

  // --- Restaurant-specific (optional) ---
  category?: KosherCategory;
  kosherType?: KosherType;
  /** Name of the certifying authority as printed on the certificate. */
  certifiedBy?: string;
  /** ISO date (YYYY-MM-DD) the kosher certificate is valid until. */
  certificateValidUntil?: string;

  // --- Synagogue-specific (optional) ---
  /** Prayer rite, e.g. אשכנז / ספרד / תימני. */
  nusach?: string;

  // --- Mikveh-specific (optional) ---
  /** Who the mikveh serves: 'נשים' | 'גברים' | 'כלים' (source-provided free string). */
  mikvehGender?: string;
  /** Attendant (בלן/בלנית) name, when the source publishes it. */
  attendant?: string;

  // --- Chabad-house-specific (optional) ---
  /** Rabbi / contact person running the Chabad house (שליח / איש קשר). */
  contactPerson?: string;
  /**
   * Services offered, as free Hebrew strings (e.g. תפילין, סעודות שבת, מניין,
   * סיוע במזון כשר, סיוע לתיירים). Additive — only Chabad houses set it today. */
  services?: string[];

  // --- Source / provenance (optional; additive, source-agnostic) ---
  /** Canonical source page for this record (e.g. a council directory listing). */
  sourceUrl?: string;
  /** Human-readable source/authority name (e.g. the religious council). */
  sourceName?: string;
  /**
   * Free-form per-source metadata kept for audit / later enrichment. Never
   * rendered raw to users. Optional, so existing synagogue/restaurant records
   * (which never set it) stay valid `Place` values — this is additive only.
   */
  extra?: Record<string, unknown>;
}
