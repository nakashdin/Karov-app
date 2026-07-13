/**
 * Per-city ArcGIS source config + registry entries — the ONLY thing that differs
 * between cities. The generic ArcGIS REST adapter (adapter.ts) reads one of these
 * by source id. Adding a new city = a CONFIG entry here + a SourceRegistryEntry;
 * no adapter code changes. (When importers/unified grows a `config` field on
 * SourceRegistryEntry, these configs move there.)
 *
 * Field names come from each live layer's schema (discovery). The adapter matches
 * them case-insensitively and accepts an alias list, so small schema drift does
 * not break the import. All cities are fetched with outSR=4326 (authoritative
 * WGS84, incl. the Israeli datum shift — see itm.ts).
 */
import type { SourceRegistryEntry } from '../unified/schema/source-registry.ts';

/** Which source field feeds each logical field (first present, case-insensitive). */
export interface ArcgisFieldMap {
  name: string | string[];
  address?: string | string[];
  nusach?: string | string[];
  phone?: string | string[];
  neighborhood?: string | string[];
  gabbai?: string | string[];
}

export interface ArcgisSourceConfig {
  /** Layer query endpoint (…/MapServer/<id> or …/FeatureServer/<id>). */
  endpoint: string;
  /** City name used as the app `cityId` (the app treats cityId AS the city name for map data). */
  city: string;
  /** WHERE filter (e.g. '1=1' or a coded subset like 'pub_build_types=230'). */
  where: string;
  /** WKID of the layer's native geometry (2039 ITM, 3857 WebMercator, 4326). */
  wkid: number;
  /**
   * Stable per-record id field(s) for layers WITHOUT an OBJECTID/FID (e.g. Tel
   * Aviv uses `UniqueId`/`oid_cneset`). First present wins. Falls back to
   * OBJECTID/FID, then to full-precision coordinates.
   */
  idField?: string | string[];
  fields: ArcgisFieldMap;
  /** Expected record count from discovery (sanity check, not a gate). */
  expectedCount?: number;
  /** Page size; defaults to the layer's maxRecordCount. */
  pageSize?: number;
}

function source(id: string, displayName: string, url: string, domain: string, est: number): SourceRegistryEntry {
  return {
    id,
    displayName,
    kind: 'data-gov',
    adapterId: 'arcgis-rest',
    status: 'draft',
    produces: ['synagogue'],
    url,
    domain,
    license: { id: 'muni-open-unverified', attributionRequired: true, attributionText: displayName },
    trust: 0.9,
    estimatedRecordCount: est,
    notes: 'ArcGIS REST adapter (POC). ToS blank in service metadata — verify municipal reuse terms before any LIVE merge.',
  };
}

export const SOURCES: Record<string, SourceRegistryEntry> = {
  'arcgis:haifa': source(
    'arcgis:haifa',
    'עיריית חיפה — בתי כנסת (GIS)',
    'https://gisserver.haifa.muni.il/arcgiswebadaptor/rest/services/PublicSite/Haifa_Community_Public/MapServer/10',
    'haifa.muni.il',
    268,
  ),
  'arcgis:tel-aviv': source(
    'arcgis:tel-aviv',
    'עיריית תל אביב יפו — בתי כנסת (GIS)',
    'https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/568',
    'tel-aviv.gov.il',
    484,
  ),
  'arcgis:jerusalem': source(
    'arcgis:jerusalem',
    'עיריית ירושלים — בתי כנסת (GIS)',
    'https://gisviewer.jerusalem.muni.il/arcgis/rest/services/BaseLayers/MapServer/66',
    'jerusalem.muni.il',
    357,
  ),
  'arcgis:ashdod': source(
    'arcgis:ashdod',
    'עיריית אשדוד — מוסדות ציבור (בתי כנסת) (GIS)',
    'https://gis.ashdod.muni.il/arcgis/rest/services/mapt_reka/MapServer/13',
    'ashdod.muni.il',
    290,
  ),
  'arcgis:ashkelon': source(
    'arcgis:ashkelon',
    'עיריית אשקלון — בתי כנסת (GIS)',
    'https://services2.arcgis.com/5gNmRQS5QY72VLq4/arcgis/rest/services/synagogue/FeatureServer/0',
    'ashkelon.muni.il',
    190,
  ),
  'arcgis:nahariya': source(
    'arcgis:nahariya',
    'עיריית נהריה — בתי כנסת (GIS)',
    'https://services-eu1.arcgis.com/zvR5BCrANP2zVRTW/arcgis/rest/services/bate_kneset_2025/FeatureServer/1',
    'nahariya.muni.il',
    71,
  ),
  'arcgis:modiin': source(
    'arcgis:modiin',
    'עיריית מודיעין מכבים רעות — בתי כנסת (GIS)',
    'https://webgis.modiin.muni.il/arcgis/rest/services/GeoInterestPoints/MapServer/0',
    'modiin.muni.il',
    23,
  ),
  'arcgis:nof-hagalil': source(
    'arcgis:nof-hagalil',
    'עיריית נוף הגליל — בתי כנסת (GIS)',
    'https://services1.arcgis.com/aNzvrLxjvQddMgHb/arcgis/rest/services/city_map/FeatureServer/1',
    'nofhagalil.muni.il',
    15,
  ),

  // --- Second wave (2026-06-21) ---
  'arcgis:modiin-ilit': source(
    'arcgis:modiin-ilit',
    'עיריית מודיעין עילית — בתי כנסת (GIS)',
    'https://services8.arcgis.com/Fq82oUDJGykXC54L/arcgis/rest/services/בתי_כנסת/FeatureServer/0',
    'modiin-illit.muni.il',
    155,
  ),
  'arcgis:holon': source(
    'arcgis:holon',
    'עיריית חולון — בתי כנסת (GIS)',
    'https://services2.arcgis.com/cjDo9oPmimdHxumn/arcgis/rest/services/Shilat/FeatureServer/4',
    'holon.muni.il',
    100,
  ),
  'arcgis:herzliya': source(
    'arcgis:herzliya',
    'עיריית הרצליה — בתי כנסת (GIS)',
    'https://services3.arcgis.com/9qGhZGtb39XMVQyR/arcgis/rest/services/בתי_כנסת/FeatureServer/22',
    'herzliya.muni.il',
    83,
  ),
  'arcgis:or-akiva': source(
    'arcgis:or-akiva',
    'עיריית אור עקיבא — בתי כנסת (GIS)',
    'https://services9.arcgis.com/kStxd97qYN1pEumt/arcgis/rest/services/בית_כנסת/FeatureServer/7',
    'or-akiva.muni.il',
    32,
  ),
  'arcgis:kiryat-ono': source(
    'arcgis:kiryat-ono',
    'עיריית קרית אונו — בתי כנסת (GIS)',
    'https://services7.arcgis.com/RQWNqXGAp7bCmIsb/arcgis/rest/services/בתי_כנסת_קריית_אונו/FeatureServer/0',
    'kiryatono.muni.il',
    13,
  ),
  'arcgis:lod': source(
    'arcgis:lod',
    'עיריית לוד — מוסדות ציבור (בתי כנסת) (GIS)',
    'https://services2.arcgis.com/rY5uI5cxAq4qEyXH/arcgis/rest/services/מוסדות_ציבור/FeatureServer/1',
    'lod.muni.il',
    87,
  ),
};

/** Kept for the original POC runner (run-haifa.ts). */
export const HAIFA_SOURCE = SOURCES['arcgis:haifa'];

export const CITIES: Record<string, ArcgisSourceConfig> = {
  'arcgis:haifa': {
    endpoint:
      'https://gisserver.haifa.muni.il/arcgiswebadaptor/rest/services/PublicSite/Haifa_Community_Public/MapServer/10',
    city: 'חיפה',
    where: '1=1',
    wkid: 2039,
    expectedCount: 268,
    fields: {
      name: ['Synagogue_Name', 'SynagogueName', 'shem', 'name'],
      address: ['FullAddress', 'Address', 'ktovet'],
      nusach: ['Nosach', 'Nusach'],
      phone: ['Gabay_Phone', 'GabayPhone', 'phone', 'tel'],
      neighborhood: ['Neighborhood', 'shchuna'],
      gabbai: ['Gabay_Name', 'GabayName'],
    },
  },

  'arcgis:tel-aviv': {
    endpoint: 'https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/568',
    city: 'תל אביב יפו',
    where: '1=1',
    wkid: 2039, // live layer reports 2039 (discovery said 3857); outSR=4326 makes it moot, fixed for clarity
    expectedCount: 484,
    idField: ['UniqueId', 'oid_cneset'], // layer has no OBJECTID/FID → use its stable ids
    fields: {
      name: ['name_bet_cneset', 'shem_bk', 'shem', 'name'],
      nusach: ['nosah', 'nosach', 'nusach'],
      phone: ['tel_bet_cneset', 'phone', 'tel'],
      address: ['ketovet', 'ktovet', 'address'], // live field is 'ketovet'
      neighborhood: ['shchuna', 'neighborhood'],
      gabbai: ['name_gabay', 'gabay'],
    },
  },

  'arcgis:jerusalem': {
    endpoint: 'https://gisviewer.jerusalem.muni.il/arcgis/rest/services/BaseLayers/MapServer/66',
    city: 'ירושלים',
    where: '1=1',
    wkid: 2039,
    expectedCount: 357,
    fields: {
      // Thin schema: Hebrew name + English name only.
      name: ['SYMBOLNAME', 'ENGLISH', 'shem', 'name'],
    },
  },

  'arcgis:ashdod': {
    endpoint: 'https://gis.ashdod.muni.il/arcgis/rest/services/mapt_reka/MapServer/13',
    city: 'אשדוד',
    // synagogues are a coded subset of the public-institutions layer.
    where: 'pub_build_types=230',
    wkid: 2039,
    expectedCount: 290,
    fields: {
      name: ['institution_name', 'shem', 'name'],
      address: ['address', 'street', 'ktovet'],
      phone: ['tel_num', 'phone', 'tel'],
      neighborhood: ['rova', 'neighborhood'],
    },
  },

  'arcgis:ashkelon': {
    endpoint: 'https://services2.arcgis.com/5gNmRQS5QY72VLq4/arcgis/rest/services/synagogue/FeatureServer/0',
    city: 'אשקלון',
    where: '1=1',
    wkid: 3857,
    expectedCount: 190,
    fields: {
      name: ['name', 'שם', 'shem', 'Name'],
      address: ['כתובת', 'adress', 'address', 'ktovet'],
      nusach: ['נוסח', 'nusach', 'nosach'],
      phone: ['טלפון', 'phone', 'tel'],
      neighborhood: ['שכונה', 'rova', 'neighborhood'],
    },
  },

  'arcgis:nahariya': {
    endpoint: 'https://services-eu1.arcgis.com/zvR5BCrANP2zVRTW/arcgis/rest/services/bate_kneset_2025/FeatureServer/1',
    city: 'נהריה',
    where: '1=1',
    wkid: 3857,
    expectedCount: 71,
    fields: {
      name: ['biet_kneset_name', 'name', 'shem'],
      address: ['adress', 'address', 'ktovet'],
      phone: ['phone', 'tel'],
      gabbai: ['gabai1', 'gabai2'],
    },
  },

  'arcgis:modiin': {
    endpoint: 'https://webgis.modiin.muni.il/arcgis/rest/services/GeoInterestPoints/MapServer/0',
    city: 'מודיעין מכבים רעות',
    // synagogues are a typed subset of the general interest-points layer.
    where: "InterestPointTypeIDDesc LIKE '%בית כנסת%'",
    wkid: 2039,
    expectedCount: 23,
    fields: {
      name: ['InterestPointName', 'Name', 'shem', 'name'],
      address: ['Address', 'address', 'ktovet'],
    },
  },

  'arcgis:nof-hagalil': {
    endpoint: 'https://services1.arcgis.com/aNzvrLxjvQddMgHb/arcgis/rest/services/city_map/FeatureServer/1',
    city: 'נוף הגליל',
    where: '1=1',
    wkid: 2039,
    expectedCount: 15,
    fields: {
      // synagogue name lives in Remarks on this building-footprint join.
      name: ['Remarks', 'name', 'shem'],
      address: ['Full_Str_N', 'address', 'street'],
    },
  },

  // --- Second wave (2026-06-21) — verified field names via layer metadata ---
  'arcgis:modiin-ilit': {
    endpoint: 'https://services8.arcgis.com/Fq82oUDJGykXC54L/arcgis/rest/services/בתי_כנסת/FeatureServer/0',
    city: 'מודיעין עילית',
    where: '1=1',
    wkid: 2039,
    expectedCount: 155,
    fields: {
      name: ['name'],
      address: ['address'],
      phone: ['telephone_1', 'pelephone_1'],
      gabbai: ['gabai_1'],
    },
  },
  'arcgis:holon': {
    endpoint: 'https://services2.arcgis.com/cjDo9oPmimdHxumn/arcgis/rest/services/Shilat/FeatureServer/4',
    city: 'חולון',
    // layer is "בתי כנסת ומקוואות" — filter to synagogues only (excludes מקווה).
    where: "Inst_Type='בית כנסת/מדרש'",
    wkid: 2039,
    expectedCount: 100,
    fields: {
      name: ['Name'],
      address: ['Address', 'Street'],
      phone: ['Telephone1', 'Telephone2'],
      neighborhood: ['Service_Zone', 'Megama_name'],
    },
  },
  'arcgis:herzliya': {
    endpoint: 'https://services3.arcgis.com/9qGhZGtb39XMVQyR/arcgis/rest/services/בתי_כנסת/FeatureServer/22',
    city: 'הרצליה',
    where: '1=1',
    wkid: 2039,
    expectedCount: 83,
    fields: {
      name: ['Name'],
      address: ['address'],
    },
  },
  'arcgis:or-akiva': {
    endpoint: 'https://services9.arcgis.com/kStxd97qYN1pEumt/arcgis/rest/services/בית_כנסת/FeatureServer/7',
    city: 'אור עקיבא',
    where: '1=1',
    wkid: 2039,
    expectedCount: 32,
    fields: {
      name: ['Shem'],
      address: ['Address'],
      phone: ['Phone'],
      gabbai: ['ContactName'],
    },
  },
  'arcgis:kiryat-ono': {
    endpoint: 'https://services7.arcgis.com/RQWNqXGAp7bCmIsb/arcgis/rest/services/בתי_כנסת_קריית_אונו/FeatureServer/0',
    city: 'קריית אונו', // existing live spelling (double yud) — matches cityId "קריית אונו" (11 recs)
    where: '1=1',
    wkid: 3857,
    expectedCount: 13,
    fields: {
      name: ['Synagogue'],
    },
  },
  'arcgis:lod': {
    endpoint: 'https://services2.arcgis.com/rY5uI5cxAq4qEyXH/arcgis/rest/services/מוסדות_ציבור/FeatureServer/1',
    city: 'לוד',
    // synagogues are a coded subset of the general public-institutions layer (286 total).
    where: `תת_קטגוריה IN ('בית כנסת','בית מדרש','בית חב"ד')`,
    wkid: 2039,
    expectedCount: 87,
    fields: {
      name: ['name'],
      neighborhood: ['שכונה'],
    },
  },
};
