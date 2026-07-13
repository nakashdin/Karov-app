/**
 * Generic ArcGIS REST adapter — implements the unified `SourceAdapter` contract
 * so it can drop into importers/unified later WITHOUT change. It is the only
 * component that knows how an ArcGIS FeatureLayer is shaped; everything it emits
 * is a source-agnostic `NormalizedImportRecord`.
 *
 * One adapter, N cities: each city is a CONFIG entry (cities.ts) keyed by the
 * source id. `fetch` is the single network boundary; `normalize` is pure.
 *
 * Coordinates are reprojected from the layer's native WKID to WGS84 (itm.ts) —
 * a transform of an original municipal point, never geocoding.
 */
import type {
  AdapterContext,
  AdapterDescription,
  RawFetchResult,
  SourceAdapter,
} from '../unified/adapters/contract.ts';
import { makeRecordId, type NormalizedImportRecord } from '../unified/schema/normalized-record.ts';
import { httpJson, USER_AGENT } from '../shared/utils.ts';
import { projectedToWgs84 } from './itm.ts';
import type { ArcgisSourceConfig } from './cities.ts';

interface ArcgisFeature {
  attributes: Record<string, unknown>;
  geometry?: { x: number; y: number } | null;
}

/** First present, non-empty source field for a logical field (case-insensitive). */
function pick(attrs: Record<string, unknown>, spec?: string | string[]): string | undefined {
  if (!spec) return undefined;
  const cands = Array.isArray(spec) ? spec : [spec];
  const lower = new Map<string, string>();
  for (const k of Object.keys(attrs)) lower.set(k.toLowerCase(), k);
  for (const c of cands) {
    const real = lower.get(c.toLowerCase());
    if (real != null) {
      const v = attrs[real];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
  }
  return undefined;
}

/** Drop placeholder phones (e.g. tel_num=0 → "0", "00", "-") — a real phone has a 1–9 digit. */
function cleanPhone(v?: string): string | undefined {
  return v && /[1-9]/.test(v) ? v : undefined;
}

export class ArcgisRestAdapter implements SourceAdapter {
  readonly id = 'arcgis-rest';
  /** Stashed during fetch so normalize can stamp provenance.fetchedAt. */
  private lastFetchedAt = '';
  private readonly cities: Record<string, ArcgisSourceConfig>;

  constructor(cities: Record<string, ArcgisSourceConfig>) {
    this.cities = cities;
  }

  describe(): AdapterDescription {
    return {
      id: this.id,
      kind: 'data-gov',
      produces: ['synagogue', 'mikveh'],
      summary: 'Generic ArcGIS REST FeatureLayer reader (config-driven field map, projected→WGS84).',
    };
  }

  private config(ctx: AdapterContext): ArcgisSourceConfig {
    const cfg = this.cities[ctx.source.id];
    if (!cfg) throw new Error(`ArcgisRestAdapter: no city config for source "${ctx.source.id}"`);
    return cfg;
  }

  /** NETWORK BOUNDARY: page through the layer's /query endpoint (native SR). */
  async fetch(ctx: AdapterContext): Promise<RawFetchResult> {
    const cfg = this.config(ctx);
    this.lastFetchedAt = new Date().toISOString();
    const pageSize = cfg.pageSize ?? 2000;
    const all: ArcgisFeature[] = [];
    let offset = 0;

    for (let guard = 0; guard < 50; guard++) {
      if (ctx.signal?.aborted) throw new Error('aborted');
      // outSR=4326 → the server returns AUTHORITATIVE WGS84 (it applies the
      // official Israeli datum transform, which a pure TM inverse omits — that
      // datum shift is ~50–80m in Israel, far too large to ignore). See itm.ts.
      const url =
        `${cfg.endpoint}/query?where=${encodeURIComponent(cfg.where)}` +
        `&outFields=*&returnGeometry=true&outSR=4326&f=json` +
        `&resultRecordCount=${pageSize}&resultOffset=${offset}`;
      const body = await httpJson(
        url,
        { method: 'GET', headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } },
        `arcgis:${ctx.source.id}:${offset}`,
      );
      if (body && body.error) throw new Error(`ArcGIS error: ${JSON.stringify(body.error)}`);
      const feats: ArcgisFeature[] = body.features ?? [];
      all.push(...feats);
      ctx.log(`fetched ${feats.length} (offset ${offset}, cumulative ${all.length})`);
      if (feats.length < pageSize) break; // last page
      offset += feats.length;
    }

    return { items: all, fetchedFrom: cfg.endpoint, fetchedAt: this.lastFetchedAt };
  }

  /** Pure: one ArcGIS feature → 0..1 normalized record. */
  normalize(rawItem: unknown, ctx: AdapterContext): NormalizedImportRecord[] {
    const cfg = this.config(ctx);
    const f = rawItem as ArcgisFeature;
    const attrs = f.attributes ?? {};

    const name = pick(attrs, cfg.fields.name);
    if (!name) return []; // unusable without a name
    const g = f.geometry;
    if (!g || typeof g.x !== 'number' || typeof g.y !== 'number') return []; // no native point

    const location = projectedToWgs84(g.x, g.y, cfg.wkid);
    // Stable per-record id: configured idField → OBJECTID/FID → full-precision
    // coordinates (never ROUNDED — rounding collapsed all Tel Aviv records to one id).
    const oid =
      pick(attrs, cfg.idField) ??
      pick(attrs, ['OBJECTID', 'objectid', 'FID', 'fid']) ??
      `${g.x.toFixed(7)}_${g.y.toFixed(7)}`;

    const rec: NormalizedImportRecord = {
      id: makeRecordId(ctx.source.id, oid),
      type: 'synagogue',
      name,
      cityHint: cfg.city,
      location,
      confidence: 'high',
      provenance: {
        sourceId: ctx.source.id,
        adapterId: this.id,
        sourceRecordId: `${ctx.source.id}:${oid}`,
        sourceUrl: cfg.endpoint,
        fetchedAt: this.lastFetchedAt || new Date().toISOString(),
        raw: attrs,
      },
    };

    const address = pick(attrs, cfg.fields.address);
    const phone = cleanPhone(pick(attrs, cfg.fields.phone));
    const nusach = pick(attrs, cfg.fields.nusach);
    const neighborhood = pick(attrs, cfg.fields.neighborhood);
    const gabbai = pick(attrs, cfg.fields.gabbai);

    if (address) rec.address = address;
    if (phone) rec.phone = phone;
    if (nusach) rec.nusach = nusach;
    const extra: Record<string, unknown> = {};
    if (neighborhood) extra.neighborhood = neighborhood;
    if (gabbai) extra.gabbai = gabbai;
    if (Object.keys(extra).length) rec.extra = extra;

    return [rec];
  }
}
