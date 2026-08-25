/** A geographic coordinate. */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Kind of place. Drives which fields are relevant and how it's shown. */
export type PlaceType = 'restaurant' | 'fast_food' | 'cafe' | 'coffee_cart' | 'juice_bar' | 'ice_cream_parlor' | 'bakery' | 'winery' | 'synagogue' | 'mikveh' | 'chabad_house' | 'tzaddik_grave';

/** Sub-category for restaurants. */
export type PlaceSubType = 'fast_food' | 'chef_restaurant';

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
  | 'tzohar'
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
  /** Sub-category within the type (restaurants only). */
  subType?: PlaceSubType;
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
  tiktok?: string;
  openingHours?: string;
  /** ISO date (YYYY-MM-DD) the info was last verified by an admin. */
  lastVerifiedAt?: string;
  rating?: number;
  tags?: string[];
  /** Where this record came from (for attribution / trust). */
  source?: 'osm' | 'seed' | 'wikidata' | 'manual' | 'tzohar';
  /**
   * Accuracy of `location`. 'exact' = synced against Waze, the most accurate
   * source available in Israel (see docs/coordinates-backlog.md); 'address' =
   * a geocoded street address; 'city' = an approximate city-centre point (show
   * an "approximate location" hint — see PlaceCard/PlaceBottomCard/
   * PlaceDetailScreen). Absent means an untouched native coordinate (e.g. OSM),
   * which is not the same claim as 'exact' and should not be treated as one.
   */
  locationPrecision?: 'exact' | 'address' | 'city';
  /** Which geocoder produced `location`, when it didn't come from the original source as-is. */
  locationSource?: 'waze' | 'nominatim';

  // --- Restaurant-specific (optional) ---
  category?: KosherCategory;
  /** Legacy field — original certification key. Do not remove. */
  kosherType?: KosherType;
  /** 'regular' | 'mehadrin' — the kashrut standard level. */
  kosherLevel?: 'regular' | 'mehadrin';
  /** High-level certification group: 'rabbinate' | 'badatz' | 'independent' | 'unknown'. */
  kosherAuthorityGroup?: 'rabbinate' | 'badatz' | 'independent' | 'unknown';
  /** Specific certifying body key (null when group is known but body is not). */
  kosherAuthority?: string | null;
  /** Name of the certifying authority as printed on the certificate. */
  certifiedBy?: string;
  /** Canonical certifying body (src/data/kashrut/authorities.ts). null when the evidence names a level but no authority. */
  certifierId?: string | null;
  /**
   * ISO date (YYYY-MM-DD) the kosher certificate is valid until. Only ever
   * set from a real certificate document (see `kosherCertUrl`) — never
   * inferred, extrapolated, or copied from a sibling branch. Its absence
   * means Karov doesn't have the certificate for this branch, NOT that the
   * business lost its certification; see `utils/certificate.ts` for the
   * runtime state this drives (valid / expired / unknown / none). Currently
   * only populated for Tzohar (the one certifying body we have permission to
   * publish certificate data for), but the field itself is authority-agnostic
   * — any future authorized source sets the same three fields together
   * (`certifiedBy`, `kosherCertUrl`, `certificateValidUntil`).
   */
  certificateValidUntil?: string;
  /**
   * ISO date (YYYY-MM-DD) the certificate was issued, when the source
   * publishes it. Not currently extracted from any source — modeled for
   * forward compatibility, left unset rather than guessed.
   */
  certificateIssuedAt?: string;
  /**
   * Kashrut standards printed on the certificate itself. Populated from the
   * Tzohar certificate PDFs by importers/tzohar/extract-cert-expiry.mjs.
   */
  kosherDetails?: {
    /** Closed on Shabbat and Jewish holidays. */
    shabbatClosed?: boolean;
    /** Bishul Yisrael in lighting and food preparation. */
    bishulYisrael?: boolean;
    /** No concern of chametz she'avar alav haPesach. */
    noChametz?: boolean;
    /** Leafy greens from insect-free cultivation. */
    vegChecked?: boolean;
    /** Chalav Yisrael dairy (as opposed to imported). */
    chalavYisrael?: boolean;
    /** Certificate states it is not a local-rabbinate hechsher. */
    notRabbanut?: boolean;
  };

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

  // --- Media ---
  /** Primary photo URL (hosted on Supabase Storage or any CDN). */
  imageUrl?: string;
  /** URL to the kosher certificate document (PDF or image). */
  kosherCertUrl?: string;

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
