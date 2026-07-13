/**
 * POC importer — religious-council synagogue directories (SabaiApps Directories
 * Pro), variant-aware (waze | markers).
 *
 * DRY-RUN / ADDITIVE-ONLY. Writes SEPARATE outputs only; never touches the app's
 * live data, never merges, never deletes/overwrites. Coordinates are native
 * (waze ll or markers) — no geocoding.
 *
 * Run:  node importers/religious-councils/importer.ts <council-id>
 * Out:  output/<id>.raw.json , output/<id>.normalized.json
 *       output/reports/<id>.{rejected,duplicates,diagnostics,summary}.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { USER_AGENT, isInIsrael, isMain, sleep } from '../shared/utils.ts';
import { COUNCILS, PETAH_TIKVA, type CouncilPlace, type CouncilRaw, type CouncilSource, type Variant } from './sources.ts';
import { extractCacheId, parsePage } from './parse.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const REPORTS = join(OUT, 'reports');

const isMapCenter = (lat: number, lng: number): boolean =>
  Math.abs(lat - 31.5) < 1e-6 && Math.abs(lng - 34.75) < 1e-6;

async function fetchText(url: string, label: string): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      console.warn(`  [${label}] attempt ${attempt}: ${(e as Error).message}`);
      await sleep(attempt * 3000);
    }
  }
  throw new Error(`[${label}] gave up`);
}

async function fetchTotal(source: CouncilSource): Promise<number> {
  const res = await fetch(source.countUrl, { headers: { 'User-Agent': USER_AGENT } });
  return Number(res.headers.get('x-wp-total')) || 0;
}

function toCouncilPlace(r: CouncilRaw, source: CouncilSource, verifiedAt: string): CouncilPlace {
  const p: CouncilPlace = {
    sourceId: r.sourceId, type: 'synagogue', source: 'religious-council', council: source.council,
    name: r.name as string, city: source.city, address: r.address as string,
    lat: r.lat as number, lng: r.lng as number, locationPrecision: 'exact',
    sourceUrl: r.sourceUrl, variant: r.variant, coordSource: r.coordSource as 'waze' | 'markers',
    verifiedAt,
  };
  if (r.nusach) p.nusach = r.nusach;
  if (r.gabbaiPhone) p.gabbaiPhone = r.gabbaiPhone;
  if (r.gabbaiAddress) p.gabbaiAddress = r.gabbaiAddress;
  if (r.dailyLessons) p.dailyLessons = r.dailyLessons;
  if (r.torahLessons) p.torahLessons = r.torahLessons;
  return p;
}

export async function importCouncil(source: CouncilSource): Promise<Record<string, unknown>> {
  const verifiedAt = new Date().toISOString().slice(0, 10);
  const expected = await fetchTotal(source);
  const page1 = await fetchText(source.directoryUrl, 'page1');
  const cacheId = extractCacheId(page1);
  const maxPages = Math.max(1, Math.ceil(expected / source.perPage));

  const htmls = [page1];
  for (let n = 2; n <= maxPages; n++) {
    if (!cacheId) break;
    await sleep(2000);
    htmls.push(await fetchText(`${source.directoryUrl}?_page=${n}&settings_cache_id=${cacheId}&sort=post_content`, `page${n}`));
  }

  // parse all pages; dedupe by sourceId (NEVER by coordinates)
  let variant: Variant = 'waze';
  const seen = new Set<string>();
  const raw: CouncilRaw[] = [];
  const duplicates: { sourceId: string; name: string | null }[] = [];
  for (const html of htmls) {
    const page = parsePage(html, source.id);
    variant = page.variant;
    for (const rec of page.records) {
      if (seen.has(rec.sourceId)) { duplicates.push({ sourceId: rec.sourceId, name: rec.name }); continue; }
      seen.add(rec.sourceId);
      raw.push(rec);
    }
  }

  // validation
  const valid: CouncilPlace[] = [];
  const rejected: { sourceId: string; sourceUrl: string | null; variant: Variant; reason: string }[] = [];
  for (const r of raw) {
    let reason = '';
    if (!r.name) reason = 'missing-name';
    else if (!r.address) reason = 'missing-address';
    else if (r.lat == null || r.lng == null) reason = 'missing-coordinates';
    else if (isMapCenter(r.lat, r.lng)) reason = 'coord-map-center';
    else if (!isInIsrael({ latitude: r.lat, longitude: r.lng })) reason = 'coord-outside-israel';
    if (reason) rejected.push({ sourceId: r.sourceId, sourceUrl: r.sourceUrl, variant: r.variant, reason });
    else valid.push(toCouncilPlace(r, source, verifiedAt));
  }

  const diagnostics = raw.map((r) => ({
    sourceId: r.sourceId, variant: r.variant, nameSource: r.nameSource, coordSource: r.coordSource,
    hasPermalink: r.sourceUrl != null, enriched: r.enriched ?? false, ambiguousEnrich: r.ambiguousEnrich ?? false,
  }));

  const withCoords = raw.filter((r) => r.lat != null && r.lng != null).length;
  const summary = {
    council: source.council, variant,
    expectedCount: expected, fetchedCount: raw.length, validCount: valid.length, rejectedCount: rejected.length,
    coordSource: variant === 'waze' ? 'waze' : 'markers',
    withNativeCoordinates: withCoords, missingCoordinates: raw.length - withCoords,
    duplicateSourceIds: duplicates.length,
    enrichedFromCards: raw.filter((r) => r.enriched).length,
    ambiguousEnrich: raw.filter((r) => r.ambiguousEnrich).length,
    countMatches: raw.length === expected, pagesFetched: htmls.length,
    dryRun: true, liveDataTouched: false, generatedAt: verifiedAt,
  };

  mkdirSync(REPORTS, { recursive: true });
  writeFileSync(join(OUT, `${source.id}.raw.json`), JSON.stringify(raw, null, 2), 'utf8');
  writeFileSync(join(OUT, `${source.id}.normalized.json`), JSON.stringify(valid, null, 2), 'utf8');
  writeFileSync(join(REPORTS, `${source.id}.rejected.json`), JSON.stringify(rejected, null, 2), 'utf8');
  writeFileSync(join(REPORTS, `${source.id}.duplicates.json`), JSON.stringify(duplicates, null, 2), 'utf8');
  writeFileSync(join(REPORTS, `${source.id}.diagnostics.json`), JSON.stringify(diagnostics, null, 2), 'utf8');
  writeFileSync(join(REPORTS, `${source.id}.summary.json`), JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\n● ${source.council} [${variant}] expected=${expected} fetched=${raw.length} valid=${valid.length} rejected=${rejected.length} dup=${duplicates.length}`);
  return summary;
}

if (isMain(import.meta.url)) {
  const id = process.argv[2] ?? 'petah-tikva';
  const source = COUNCILS[id] ?? PETAH_TIKVA;
  importCouncil(source).catch((e) => { console.error('Failed:', e); process.exit(1); });
}
