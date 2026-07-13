/**
 * Source registry + types for the **mikvah** SabaiApps "Directories Pro"
 * importer variant (Phase 1).
 *
 * Lineage: this is the mikvah sibling of the synagogue
 * `religious-councils/sources.ts`. Same plugin family, same councils, but a
 * DIFFERENT directory: URL `/directory-mikvah/` and WP post type
 * `mikvah_dir_ltg` (vs `/directory-synagogues/` + `synagogues_dir_ltg`).
 *
 * DRY-RUN / ADDITIVE-ONLY. These sources are scraped read-only from public
 * directory pages; nothing is written to the app DB, nothing is merged.
 *
 * Council list = the 16 sources classified `needs-variant` (SabaiApps) in
 * `output/mikvah-domain-catalog.json`. The shared post type + URL pattern were
 * confirmed live (e.g. mpt.org.il exposes wp-json/wp/v2/mikvah_dir_ltg).
 */

/** WP post type + directory slug for the mikvah Directories-Pro variant. */
export const MIKVAH_POST_TYPE = 'mikvah_dir_ltg';
export const MIKVAH_DIR_SLUG = 'directory-mikvah';

export interface MikvahCouncilSource {
  id: string;
  city: string;
  council: string;
  domain: string;
  /** Public directory page, e.g. https://mpt.org.il/directory-mikvah/ */
  directoryUrl: string;
  /** REST count probe: …/wp-json/wp/v2/mikvah_dir_ltg?per_page=1 (x-wp-total). */
  countUrl: string;
  perPage: number;
}

/** Which extraction path produced a record (mirrors the synagogue parser). */
export type MikvahVariant = 'waze' | 'markers';

/** Raw mikvah record extracted from a listing card (pre-normalization). */
export interface MikvahCouncilRaw {
  sourceId: string;
  sourceUrl: string | null; // listing permalink when present, else null
  name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  /** Directory category — typically gender: גברים / נשים / כלים. */
  category?: string;
  phone?: string;
  /** Secondary contact phone (SabaiApps field_hopephone), when present. */
  hopePhone?: string;
  /** Attendant name (בלנית/בלן) — SabaiApps field_balanit_name. */
  balanit?: string;
  /** Opening-hours free text — SabaiApps field_open_hours. */
  openHours?: string;
  /** All labelled `field_*` values captured generically (source metadata). */
  fields?: Record<string, string>;
  // diagnostics
  variant: MikvahVariant;
  nameSource: 'anchor' | 'text' | 'marker';
  coordSource: 'waze' | 'markers' | null;
  enriched?: boolean;
  ambiguousEnrich?: boolean;
}

/**
 * Normalized dry-run mikvah record (importer-internal; NOT an app Place, NOT
 * merged, NOT geocoded).
 *
 * NOTE on the type tag: Phase-1 spec asks for `type: 'mikvah'`. The existing
 * data.gov.il pipeline uses `'mikveh'` (see shared/types.ts `ImportType`). That
 * spelling split is intentionally left for the Unified-Importer phase to
 * reconcile — flagged in the summary, not silently changed here.
 */
export interface MikvahCouncilPlace {
  sourceId: string;
  type: 'mikvah';
  source: 'religious-council';
  council: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  openingHours: string | null;
  lat: number | null;
  lng: number | null;
  /** 'exact' when native coords exist; 'none' when coordinates are missing. */
  locationPrecision: 'exact' | 'none';
  sourceUrl: string | null;
  /** Mikvah gender/category (גברים/נשים/כלים) when the source exposes it. */
  category: string | null;
  variant: MikvahVariant;
  verifiedAt: string;
  /** Raw per-source metadata kept for later enrichment (attendant, fields…). */
  raw: Record<string, unknown>;
}

const src = (
  id: string,
  city: string,
  council: string,
  domain: string,
): MikvahCouncilSource => ({
  id,
  city,
  council,
  domain,
  directoryUrl: `https://${domain}/${MIKVAH_DIR_SLUG}/`,
  countUrl: `https://${domain}/wp-json/wp/v2/${MIKVAH_POST_TYPE}?per_page=1`,
  perPage: 150,
});

/** 16 SabaiApps mikvah councils (needs-variant in the discovery catalog). */
export const MIKVAH_COUNCILS: Record<string, MikvahCouncilSource> = {
  'petah-tikva': src('petah-tikva', 'פתח תקווה', 'המועצה הדתית פתח תקווה', 'mpt.org.il'),
  netanya: src('netanya', 'נתניה', 'המועצה הדתית נתניה', 'mdn.org.il'),
  'beer-sheva': src('beer-sheva', 'באר שבע', 'המועצה הדתית באר שבע', 'mdb7.org.il'),
  'rosh-haayin': src('rosh-haayin', 'ראש העין', 'המועצה הדתית ראש העין', 'mdrh.org.il'),
  lod: src('lod', 'לוד', 'המועצה הדתית לוד', 'mdlod.org.il'),
  hadera: src('hadera', 'חדרה', 'המועצה הדתית חדרה', 'haderamd.org.il'),
  'marom-galil': src('marom-galil', 'מרום גליל', 'המועצה הדתית מרום גליל', 'mdmg.org.il'),
  merchavim: src('merchavim', 'מרחבים', 'המועצה הדתית מרחבים', 'mdm.org.il'),
  herzliya: src('herzliya', 'הרצליה', 'המועצה הדתית הרצליה', 'mdh.org.il'),
  'givat-zeev': src('givat-zeev', 'גבעת זאב', 'המועצה הדתית גבעת זאב', 'mdgz.org'),
  'givat-shmuel': src('givat-shmuel', 'גבעת שמואל', 'המועצה הדתית גבעת שמואל', 'mdgs.org.il'),
  'beit-shean': src('beit-shean', 'בית שאן', 'המועצה הדתית בית שאן', 'rbs.org.il'),
  'ganei-tikva': src('ganei-tikva', 'גני תקווה', 'המועצה הדתית גני תקווה', 'mdgt.org.il'),
  'kiryat-arba': src('kiryat-arba', 'קרית ארבע', 'המועצה הדתית קרית ארבע', 'mdk4.org.il'),
  sderot: src('sderot', 'שדרות', 'המועצה הדתית שדרות', 'mdsderot.org.il'),
  'nof-hagalil': src('nof-hagalil', 'נוף הגליל', 'המועצה הדתית נוף הגליל', 'mdnh.org.il'),
};

export const ALL_MIKVAH_COUNCILS: MikvahCouncilSource[] = Object.values(MIKVAH_COUNCILS);
