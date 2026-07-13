/**
 * Source configuration + types for the religious-council (מועצה דתית) synagogue
 * importers — SabaiApps "Directories Pro" family.
 *
 * Additive/enrichment pipeline: these importers write SEPARATE outputs and NEVER
 * touch the app's live data, never merge, never delete.
 */

export interface CouncilSource {
  id: string;
  city: string;
  council: string;
  directoryUrl: string;
  countUrl: string;
  perPage: number;
}

/** Which extraction path produced a record. */
export type Variant = 'waze' | 'markers';

/** Raw record extracted from a listing (pre-validation). */
export interface CouncilRaw {
  sourceId: string;
  sourceUrl: string | null;     // permalink when present (waze/anchor), else null
  name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  nusach?: string;
  gabbaiPhone?: string;
  gabbaiAddress?: string;
  dailyLessons?: string;
  torahLessons?: string;
  // diagnostics
  variant: Variant;
  nameSource: 'anchor' | 'text' | 'marker';
  coordSource: 'waze' | 'markers' | null;
  enriched?: boolean;           // markers record gained nusach/phone from a card
  ambiguousEnrich?: boolean;    // markers record had >1 card name-match (not enriched)
}

/** Normalized council record (importer-internal; NOT an app Place, NOT merged). */
export interface CouncilPlace {
  sourceId: string;
  type: 'synagogue';
  source: 'religious-council';
  council: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  locationPrecision: 'exact';
  sourceUrl: string | null;
  variant: Variant;
  coordSource: 'waze' | 'markers';
  nusach?: string;
  gabbaiPhone?: string;
  gabbaiAddress?: string;
  dailyLessons?: string;
  torahLessons?: string;
  verifiedAt: string;
}

export const PETAH_TIKVA: CouncilSource = {
  id: 'petah-tikva', city: 'פתח תקווה', council: 'המועצה הדתית פתח תקווה',
  directoryUrl: 'https://mpt.org.il/directory-synagogues/',
  countUrl: 'https://mpt.org.il/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};
export const NETANYA: CouncilSource = {
  id: 'netanya', city: 'נתניה', council: 'המועצה הדתית נתניה',
  directoryUrl: 'https://mdn.org.il/directory-synagogues/',
  countUrl: 'https://mdn.org.il/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};
export const GIVAT_SHMUEL: CouncilSource = {
  id: 'givat-shmuel', city: 'גבעת שמואל', council: 'המועצה הדתית גבעת שמואל',
  directoryUrl: 'https://mdgs.org.il/directory-synagogues/',
  countUrl: 'https://mdgs.org.il/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};
export const YEHUD: CouncilSource = {
  id: 'yehud', city: 'יהוד-מונוסון', council: 'המועצה הדתית יהוד',
  directoryUrl: 'https://ydat.org.il/directory-synagogues/',
  countUrl: 'https://ydat.org.il/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};
export const MERCHAVIM: CouncilSource = {
  id: 'merchavim', city: 'מרחבים', council: 'המועצה הדתית מרחבים',
  directoryUrl: 'https://mdm.org.il/directory-synagogues/',
  countUrl: 'https://mdm.org.il/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};
export const ROSH_HAAYIN: CouncilSource = {
  id: 'rosh-haayin', city: 'ראש העין', council: 'המועצה הדתית ראש העין',
  directoryUrl: 'https://mdrh.org.il/directory-synagogues/',
  countUrl: 'https://mdrh.org.il/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};
export const GANEI_TIKVA: CouncilSource = {
  id: 'ganei-tikva', city: 'גני תקווה', council: 'המועצה הדתית גני תקווה',
  directoryUrl: 'https://mdgt.org.il/directory-synagogues/',
  countUrl: 'https://mdgt.org.il/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};

// --- Step 1 batch: 5 councils already supported by the existing parser -------
export const BEER_SHEVA: CouncilSource = {
  id: 'beer-sheva', city: 'באר שבע', council: 'המועצה הדתית באר שבע',
  directoryUrl: 'https://mdb7.org.il/directory-synagogues/',
  countUrl: 'https://mdb7.org.il/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};
export const LOD: CouncilSource = {
  id: 'lod', city: 'לוד', council: 'המועצה הדתית לוד',
  directoryUrl: 'https://mdlod.org.il/directory-synagogues/',
  countUrl: 'https://mdlod.org.il/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};
export const BEIT_SHEAN: CouncilSource = {
  id: 'beit-shean', city: 'בית שאן', council: 'המועצה הדתית בית שאן',
  directoryUrl: 'https://rbs.org.il/directory-synagogues/',
  countUrl: 'https://rbs.org.il/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};
export const MAROM_GALIL: CouncilSource = {
  id: 'marom-galil', city: 'מרום גליל', council: 'המועצה הדתית מרום גליל',
  directoryUrl: 'https://mdmg.org.il/directory-synagogues/',
  countUrl: 'https://mdmg.org.il/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};
export const KIRYAT_ARBA: CouncilSource = {
  id: 'kiryat-arba', city: 'קרית ארבע', council: 'המועצה הדתית קרית ארבע',
  directoryUrl: 'https://mdk4.org.il/directory-synagogues/',
  countUrl: 'https://mdk4.org.il/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};

// --- Step 2 batch: 2 newly-discovered supported councils (markers) -----------
export const HADERA: CouncilSource = {
  id: 'hadera', city: 'חדרה', council: 'המועצה הדתית חדרה',
  directoryUrl: 'https://haderamd.org.il/directory-synagogues/',
  countUrl: 'https://haderamd.org.il/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};
export const GIVAT_ZEEV: CouncilSource = {
  id: 'givat-zeev', city: 'גבעת זאב', council: 'המועצה הדתית גבעת זאב',
  directoryUrl: 'https://mdgz.org/directory-synagogues/',
  countUrl: 'https://mdgz.org/wp-json/wp/v2/synagogues_dir_ltg?per_page=1', perPage: 150,
};

export const COUNCILS: Record<string, CouncilSource> = {
  'petah-tikva': PETAH_TIKVA,
  netanya: NETANYA,
  'givat-shmuel': GIVAT_SHMUEL,
  yehud: YEHUD,
  merchavim: MERCHAVIM,
  'rosh-haayin': ROSH_HAAYIN,
  'ganei-tikva': GANEI_TIKVA,
  'beer-sheva': BEER_SHEVA,
  lod: LOD,
  'beit-shean': BEIT_SHEAN,
  'marom-galil': MAROM_GALIL,
  'kiryat-arba': KIRYAT_ARBA,
  hadera: HADERA,
  'givat-zeev': GIVAT_ZEEV,
};
