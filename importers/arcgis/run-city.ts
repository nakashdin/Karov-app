/**
 * Generic ArcGIS POC runner — proves the adapter is reusable across cities with
 * CONFIG ONLY (no adapter changes). Same pipeline as run-haifa.ts, parameterized
 * by source id, with a SEPARATE output folder + reports per city.
 *
 *   adapter.fetch (outSR=4326) → normalize → validation → datum diagnostic →
 *   additive preview vs live → reports under output/<city>/
 *
 * GOLDEN RULES: never writes places.osm.json; native coordinates only (no
 * geocoding); additive (enrich empty fields only); conflicts/over300 held;
 * DRY-RUN, no real merge.
 *
 * Run:  node importers/arcgis/run-city.ts arcgis:tel-aviv
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Place } from '../../src/types/place.ts';
import type { NormalizedImportRecord } from '../unified/schema/normalized-record.ts';
import { runValidation } from '../unified/pipeline/validation.ts';
import { httpJson, USER_AGENT } from '../shared/utils.ts';
import { itmToWgs84 } from './itm.ts';
import { ArcgisRestAdapter } from './adapter.ts';
import { CITIES, SOURCES } from './cities.ts';
import { classifyPreview } from './preview.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIVE = join(HERE, '..', '..', 'src', 'data', 'generated', 'places.osm.json');

const toRad = (d: number): number => (d * Math.PI) / 180;
function meters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

async function describeLayer(endpoint: string, expectWkid: number): Promise<void> {
  try {
    const meta = await httpJson(
      `${endpoint}?f=json`,
      { method: 'GET', headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } },
      'arcgis:meta',
    );
    const fields = (meta.fields ?? []).map((f: { name: string }) => f.name);
    const wkid = meta.extent?.spatialReference?.latestWkid ?? meta.extent?.spatialReference?.wkid;
    console.log(`layer: "${meta.name}" geometry=${meta.geometryType} wkid=${wkid} maxRecordCount=${meta.maxRecordCount}`);
    console.log(`fields: ${fields.join(', ')}`);
    if (wkid && wkid !== expectWkid) console.warn(`  ⚠ layer wkid ${wkid} ≠ config wkid ${expectWkid}`);
  } catch (e) {
    console.warn(`  (layer metadata unavailable: ${(e as Error).message})`);
  }
}

/** Native-SR geometry keyed by OBJECTID, for the datum-shift diagnostic. */
async function fetchNativeGeometry(endpoint: string, where: string): Promise<Map<string, { x: number; y: number }>> {
  const map = new Map<string, { x: number; y: number }>();
  const url =
    `${endpoint}/query?where=${encodeURIComponent(where)}` +
    `&outFields=OBJECTID&returnGeometry=true&f=json&resultRecordCount=5000`;
  const body = await httpJson(
    url,
    { method: 'GET', headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } },
    'arcgis:native',
  );
  for (const f of body.features ?? []) {
    const oid = f.attributes?.OBJECTID ?? f.attributes?.objectid;
    if (oid != null && f.geometry && typeof f.geometry.x === 'number') {
      map.set(String(oid), { x: f.geometry.x, y: f.geometry.y });
    }
  }
  return map;
}

async function main(): Promise<void> {
  const id = process.argv[2];
  if (!id || !SOURCES[id] || !CITIES[id]) {
    console.error(`usage: node run-city.ts <sourceId>\n  available: ${Object.keys(SOURCES).join(', ')}`);
    process.exit(1);
  }
  const source = SOURCES[id];
  const cfg = CITIES[id];
  const slug = id.split(':')[1];
  const OUT = join(HERE, 'output', slug);
  const REPORTS = join(OUT, 'reports');
  mkdirSync(REPORTS, { recursive: true });

  const adapter = new ArcgisRestAdapter(CITIES);
  const ctx = { source, log: (m: string) => console.log(`  ${m}`) };

  console.log(`\n========== ArcGIS POC — ${slug} (DRY-RUN) ==========`);
  await describeLayer(cfg.endpoint, cfg.wkid);

  // fetch (outSR=4326) + normalize
  const raw = await adapter.fetch(ctx);
  const records: NormalizedImportRecord[] = raw.items.flatMap((it) => adapter.normalize(it, ctx));

  // validation — unified rules + native-coords-required (NO geocoding)
  const valid: NormalizedImportRecord[] = [];
  const rejected: { sourceRecordId: string; reason: string }[] = [];
  for (const r of records) {
    const v = runValidation(r);
    if (!r.location) {
      rejected.push({ sourceRecordId: r.provenance.sourceRecordId, reason: 'missing native coordinates (no geocoding)' });
    } else if (!v.ok) {
      rejected.push({
        sourceRecordId: r.provenance.sourceRecordId,
        reason: v.issues.find((i) => i.severity === 'error')?.message ?? 'validation error',
      });
    } else {
      valid.push(r);
    }
  }
  // records normalize dropped for no-name (unusable) — count them too.
  const droppedNoName = raw.items.length - records.length;

  // datum-shift diagnostic (pure ITM inverse vs stored authoritative WGS84)
  let datumShift = { comparedCount: 0, maxMeters: 0, avgMeters: 0 };
  if (cfg.wkid === 2039) {
    try {
      const native = await fetchNativeGeometry(cfg.endpoint, cfg.where);
      let sum = 0;
      let max = 0;
      let n = 0;
      for (const r of valid) {
        const oid = r.provenance.sourceRecordId.split(':').pop()!;
        const xy = native.get(oid);
        if (!xy || !r.location) continue;
        const pure = itmToWgs84(xy.x, xy.y);
        const d = meters(r.location.latitude, r.location.longitude, pure.latitude, pure.longitude);
        sum += d;
        max = Math.max(max, d);
        n++;
      }
      datumShift = { comparedCount: n, maxMeters: Number(max.toFixed(2)), avgMeters: n ? Number((sum / n).toFixed(2)) : 0 };
    } catch (e) {
      console.warn(`  (datum-shift diagnostic skipped: ${(e as Error).message})`);
    }
  }

  // additive preview vs LIVE (read-only)
  const live = JSON.parse(readFileSync(LIVE, 'utf8')) as Place[];
  const preview = classifyPreview(valid, live);

  // write reports — LOCAL ONLY, never to src/data/generated
  writeFileSync(join(OUT, `${slug}.normalized.json`), JSON.stringify(valid, null, 2), 'utf8');
  writeFileSync(join(OUT, `places.with-${slug}.preview.json`), JSON.stringify(preview.merged, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'new.json'), JSON.stringify(preview.newRecs, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'enriched.json'), JSON.stringify(preview.enriched, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'conflicts.json'), JSON.stringify(preview.conflicts, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'over300m.json'), JSON.stringify(preview.over300, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'rejected.json'), JSON.stringify(rejected, null, 2), 'utf8');
  writeFileSync(join(REPORTS, 'datum-shift-diagnostic.json'), JSON.stringify(datumShift, null, 2), 'utf8');

  const summary = {
    source: id,
    expectedCount: cfg.expectedCount ?? null,
    fetchedCount: raw.items.length,
    droppedNoName,
    validCount: valid.length,
    rejectedCount: rejected.length,
    new: preview.newRecs.length,
    enriched: preview.enriched.length,
    conflicts: preview.conflicts.length,
    over300: preview.over300.length,
    existingSynagogues: live.filter((p) => p.type === 'synagogue').length,
    mergedSynagogues: preview.merged.filter((p) => p.type === 'synagogue').length,
    coordinateSource: 'ArcGIS server outSR=4326 (authoritative WGS84)',
    datumShiftFromPureItmMeters: datumShift,
    dryRun: true,
    liveDataTouched: false,
  };
  writeFileSync(join(REPORTS, 'preview-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n---------- SUMMARY ----------');
  for (const [k, v] of Object.entries(summary)) {
    console.log(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  }
  console.log(`output → ${OUT}`);
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
