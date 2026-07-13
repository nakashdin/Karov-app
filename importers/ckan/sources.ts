/**
 * CKAN datastore sources — per-source config. The ONLY thing that differs
 * between sources. The generic CKAN-datastore adapter (adapter.ts) reads one of
 * these by source id. Adding a source = a config entry here; no adapter change.
 *
 * Minimal by design: datastore_search transport ONLY. No GeoJSON/multi-format,
 * no CKAN discovery, no framework. Native WGS84 lat/lon fields only.
 */
import type { SourceRegistryEntry } from '../unified/schema/source-registry.ts';

/** Which source field feeds each logical field (first present, case-insensitive). */
export interface CkanFieldMap {
  name: string | string[];
  address?: string | string[];
  nusach?: string | string[];
  phone?: string | string[];
  neighborhood?: string | string[];
}

export interface CkanSourceConfig {
  /** CKAN portal base, e.g. 'https://data.gov.il'. */
  portalUrl: string;
  /** datastore resource id. */
  resourceId: string;
  /** Optional CKAN datastore filters, e.g. { theme_desc: 'בתי כנסת' }. */
  filters?: Record<string, string>;
  pageSize?: number;
  fields: CkanFieldMap;
  /** Stable per-record id field (e.g. 'Id' / 'FID'). */
  idField: string;
  /** Native WGS84 latitude / longitude field names. */
  latField: string;
  lonField: string;
  /** City name used as cityHint (cityId resolved at merge by name-match). */
  city: string;
  attribution: string;
  license: string;
  expectedCount?: number;
}

function source(id: string, displayName: string, url: string, license: string, est: number): SourceRegistryEntry {
  return {
    id, displayName, kind: 'data-gov', adapterId: 'ckan-datastore', status: 'draft',
    produces: ['synagogue'], url,
    license: { id: license, attributionRequired: true },
    trust: 0.9, estimatedRecordCount: est,
    notes: 'CKAN datastore source (open license). Native WGS84 coords; dry-run only.',
  };
}

export const SOURCES: Record<string, SourceRegistryEntry> = {
  'ckan:beer-sheva': source(
    'ckan:beer-sheva', 'באר שבע — בתי כנסת (data.gov.il)',
    'https://data.gov.il/dataset/synagogues-br7', 'other-open', 270,
  ),
  'ckan:netanya': source(
    'ckan:netanya', 'נתניה — שירותי דת/בתי כנסת (DataCity)',
    'https://www.odata.org.il/dataset/netanya_dgpsync_religion', 'ODbL', 258,
  ),
};

export const CONFIGS: Record<string, CkanSourceConfig> = {
  'ckan:beer-sheva': {
    portalUrl: 'https://data.gov.il',
    resourceId: '40de91c6-1eb3-4f12-9cea-5c44484377d7', // CSV (WGS84) datastore
    pageSize: 1000,
    fields: { name: ['name'], address: ['street'], neighborhood: ['neighborho'] },
    idField: 'Id',
    latField: 'lat',
    lonField: 'lon',
    city: 'באר שבע',
    attribution: 'עיריית באר שבע · data.gov.il (other-open)',
    license: 'other-open',
    expectedCount: 270,
  },
  'ckan:netanya': {
    portalUrl: 'https://www.odata.org.il',
    resourceId: 'c5e3ef5d-0e2f-4eb3-a4ab-1e84d7e5d6e0', // CSV datastore
    filters: { theme_desc: 'בתי כנסת' }, // synagogues only (of the 287 religious sites)
    pageSize: 1000,
    fields: { name: ['SITE_NAME'], address: ['STREET_NAM'], nusach: ['SITE_DESC', 'PointName'], phone: ['SITE_PHONE'], neighborhood: ['Neighborho'] },
    idField: 'FID',
    latField: 'lat',
    lonField: 'lon',
    city: 'נתניה',
    attribution: 'עיריית נתניה · DataCity/odata.org.il (ODbL)',
    license: 'ODbL',
    expectedCount: 258,
  },
};
