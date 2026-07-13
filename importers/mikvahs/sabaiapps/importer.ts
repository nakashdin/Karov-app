/**
 * Phase 1 — mikvah SabaiApps importer variant (DRY-RUN, ADDITIVE-ONLY).
 *
 * Iterates the 16 SabaiApps mikvah councils, scrapes their PUBLIC
 * `/directory-mikvah/` pages (read-only), parses cards with the mikvah
 * variant parser, normalizes to a Place-like shape, builds a duplicate
 * PREVIEW, and writes two local files for inspection:
 *
 *   output/sabaiapps-mikvah-preview.json   — normalized dry-run records
 *   output/sabaiapps-mikvah-summary.json   — per-source stats + dup preview
 *
 * It NEVER writes to the app DB, NEVER merges, NEVER geocodes, NEVER deletes.
 * Per-source failures are caught and reported (attempted vs successful) so one
 * dead site does not abort the run.
 *
 * Run:  node importers/mikvahs/sabaiapps/importer.ts            (all councils)
 *       node importers/mikvahs/sabaiapps/importer.ts petah-tikva  (one council)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { USER_AGENT, isInIsrael, isMain, sleep } from '../../shared/utils.ts';
import {
  ALL_MIKVAH_COUNCILS, MIKVAH_COUNCILS,
  type MikvahCouncilPlace, type MikvahCouncilRaw, type MikvahCouncilSource, type MikvahVariant,
} from './sources.ts';
import { extractCacheId, normName, parsePage } from './parse.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'output');
const PREVIEW_OUT = join(OUT, 'sabaiapps-mikvah-preview.json');
const SUMMARY_OUT = join(OUT, 'sabaiapps-mikvah-summary.json');

const MAX_PAGES = 12; // safety cap; we stop earlier once a page yields nothing new

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
      if (attempt < 3) await sleep(attempt * 3000);
    }
  }
  throw new Error(`[${label}] gave up`);
}

/** REST x-wp-total (diagnostic only; the directory page is the source of truth). */
async function fetchExpected(source: MikvahCouncilSource): Promise<number | null> {
  try {
    const res = await fetch(source.countUrl, { headers: { 'User-Agent': USER_AGENT } });
    return Number(res.headers.get('x-wp-total')) || 0;
  } catch {
    return null;
  }
}

/** raw card → normalized dry-run record (no geocoding, no merge). */
function toMikvahPlace(r: MikvahCouncilRaw, source: MikvahCouncilSource, verifiedAt: string): MikvahCouncilPlace {
  const hasCoords = r.lat != null && r.lng != null;
  const raw: Record<string, unknown> = {
    variant: r.variant, nameSource: r.nameSource, coordSource: r.coordSource,
  };
  if (r.balanit) raw.balanit = r.balanit;
  if (r.hopePhone) raw.hopePhone = r.hopePhone;
  if (r.category) raw.category = r.category;
  if (r.fields) raw.fields = r.fields;
  if (r.enriched) raw.enriched = true;
  if (r.ambiguousEnrich) raw.ambiguousEnrich = true;

  return {
    sourceId: r.sourceId,
    type: 'mikvah',
    source: 'religious-council',
    council: source.council,
    name: r.name as string,
    city: source.city,
    address: r.address ?? null,
    phone: r.phone ?? null,
    openingHours: r.openHours ?? null,
    lat: hasCoords ? (r.lat as number) : null,
    lng: hasCoords ? (r.lng as number) : null,
    locationPrecision: hasCoords ? 'exact' : 'none',
    sourceUrl: r.sourceUrl,
    category: r.category ?? null,
    variant: r.variant,
    verifiedAt,
    raw,
  };
}

interface SourceResult {
  id: string;
  council: string;
  city: string;
  ok: boolean;
  error?: string;
  variant?: MikvahVariant;
  /** REST x-wp-total — an UPPER BOUND only; over-counts post statuses/categories. */
  expectedRest: number | null;
  /** Listings actually shown on the directory (page-1 card count) — true denominator. */
  visibleCards: number;
  pagesFetched: number;
  /** True when we extracted every listing visible on the directory page. */
  capturedAllVisible: boolean;
  parsed: number;
  records: number;
  coordFlagged: number; // coords nulled (map-center/out-of-IL); record still kept & flagged
}

const countCards = (html: string): number =>
  (html.match(/data-name="entity_field_post_title"/g) || []).length;

/** Scrape + parse a single council. Returns its normalized records + a result row. */
async function importOne(
  source: MikvahCouncilSource,
  verifiedAt: string,
): Promise<{ records: MikvahCouncilPlace[]; result: SourceResult }> {
  const result: SourceResult = {
    id: source.id, council: source.council, city: source.city, ok: false,
    expectedRest: null, visibleCards: 0, pagesFetched: 0, capturedAllVisible: false,
    parsed: 0, records: 0, coordFlagged: 0,
  };

  try {
    result.expectedRest = await fetchExpected(source);
    const page1 = await fetchText(source.directoryUrl, `${source.id}/p1`);
    result.visibleCards = countCards(page1);
    const cacheId = extractCacheId(page1);

    const seen = new Set<string>();
    const raw: MikvahCouncilRaw[] = [];
    let variant: MikvahVariant = 'waze';

    const ingest = (html: string): number => {
      const page = parsePage(html, source.id);
      variant = page.variant;
      let added = 0;
      for (const rec of page.records) {
        if (seen.has(rec.sourceId)) continue;
        seen.add(rec.sourceId);
        raw.push(rec);
        added++;
      }
      return added;
    };

    ingest(page1);
    result.pagesFetched = 1;
    let maxCards = result.visibleCards;

    // Paginate while new records keep appearing. The SabaiApps directory page
    // size is site-configured; in practice every council fits on page 1 and
    // page 2 repeats it (→ 0 new → stop). x-wp-total is NOT a fetch target.
    if (cacheId && raw.length < result.visibleCards) {
      for (let n = 2; n <= MAX_PAGES; n++) {
        await sleep(2000);
        const html = await fetchText(
          `${source.directoryUrl}?_page=${n}&settings_cache_id=${cacheId}&sort=post_content`,
          `${source.id}/p${n}`,
        );
        result.pagesFetched = n;
        maxCards = Math.max(maxCards, countCards(html));
        const added = ingest(html);
        if (added === 0) break; // page returned nothing new → stop
      }
    }
    result.variant = variant;
    result.parsed = raw.length;
    // Completeness = did we extract every listing the directory actually shows?
    // (Measured against visible cards, NOT the inflated REST upper bound.)
    result.capturedAllVisible = raw.length >= maxCards;

    // Normalize. We KEEP records with missing/odd coords (mikvah dirs are
    // address-first); coordinates are only flagged, never used to drop a record.
    const records: MikvahCouncilPlace[] = [];
    for (const r of raw) {
      if (!r.name) continue; // a record with no name is unusable
      const badCoords =
        r.lat != null && r.lng != null &&
        (isMapCenter(r.lat, r.lng) || !isInIsrael({ latitude: r.lat, longitude: r.lng }));
      if (badCoords) { r.lat = null; r.lng = null; result.coordFlagged++; }
      records.push(toMikvahPlace(r, source, verifiedAt));
    }
    result.records = records.length;
    result.ok = true;
    console.log(`● ${source.council} [${variant}] rest=${result.expectedRest} parsed=${raw.length} records=${records.length} pages=${result.pagesFetched}`);
    return { records, result };
  } catch (e) {
    result.error = (e as Error).message;
    console.warn(`✗ ${source.council}: ${result.error}`);
    return { records: [], result };
  }
}

// --- duplicate PREVIEW (no deletion) -----------------------------------------

const digits = (s: string | null): string => (s ? s.replace(/\D/g, '') : '');

interface DupGroup {
  key: string;
  reason: 'same-city+name' | 'same-address' | 'same-phone';
  count: number;
  members: { sourceId: string; council: string; name: string; address: string | null; phone: string | null; category: string | null }[];
}

/**
 * Flag SUSPECTED duplicates by (city+normalized name), and within a council by
 * identical address or phone. Men/women/vessel entries at one site share an
 * address but differ by category — those are surfaced for human review, never
 * auto-removed.
 */
function previewDuplicates(records: MikvahCouncilPlace[]): DupGroup[] {
  const member = (r: MikvahCouncilPlace) => ({
    sourceId: r.sourceId, council: r.council, name: r.name,
    address: r.address, phone: r.phone, category: r.category,
  });

  const groups: DupGroup[] = [];
  const bucket = <K>(keyOf: (r: MikvahCouncilPlace) => K | null, reason: DupGroup['reason']) => {
    const map = new Map<string, MikvahCouncilPlace[]>();
    for (const r of records) {
      const k = keyOf(r);
      if (k == null || k === '') continue;
      const ks = String(k);
      (map.get(ks) ?? map.set(ks, []).get(ks)!).push(r);
    }
    for (const [key, rows] of map) {
      if (rows.length > 1) groups.push({ key, reason, count: rows.length, members: rows.map(member) });
    }
  };

  bucket((r) => `${r.city}|${normName(r.name)}`, 'same-city+name');
  bucket((r) => (r.address ? `${r.city}|${r.address.toLowerCase().replace(/\s+/g, ' ').trim()}` : null), 'same-address');
  bucket((r) => (digits(r.phone).length >= 9 ? digits(r.phone) : null), 'same-phone');
  return groups;
}

// --- field coverage ----------------------------------------------------------

function coverage(records: MikvahCouncilPlace[]): Record<string, number> {
  const n = records.length || 1;
  const pct = (f: (r: MikvahCouncilPlace) => unknown) =>
    Math.round((records.filter((r) => { const v = f(r); return v != null && String(v).trim() !== ''; }).length / n) * 100);
  return {
    name: pct((r) => r.name),
    city: pct((r) => r.city),
    address: pct((r) => r.address),
    phone: pct((r) => r.phone),
    openingHours: pct((r) => r.openingHours),
    coordinates: pct((r) => (r.lat != null && r.lng != null ? '1' : '')),
    category: pct((r) => r.category),
    sourceUrl: pct((r) => r.sourceUrl),
  };
}

export async function importMikvahSabaiApps(sources: MikvahCouncilSource[]): Promise<void> {
  const verifiedAt = new Date().toISOString().slice(0, 10);
  const all: MikvahCouncilPlace[] = [];
  const results: SourceResult[] = [];

  for (const source of sources) {
    const { records, result } = await importOne(source, verifiedAt);
    all.push(...records);
    results.push(result);
    await sleep(1500); // polite gap between councils
  }

  const duplicates = previewDuplicates(all);
  const successful = results.filter((r) => r.ok);

  const summary = {
    generatedNote: 'PHASE 1 DRY-RUN — mikvah SabaiApps variant. No app DB write, no merge, no geocoding, no deletion. Public directory pages scraped read-only.',
    typeTagNote: "Records use type:'mikvah' per the Phase-1 spec; the data.gov.il pipeline uses 'mikveh'. Reconcile the spelling in the Unified-Importer phase.",
    restCountNote: 'expectedRest (REST x-wp-total) is an inflated UPPER BOUND that over-counts post statuses/categories; capturedAllVisible compares against the listings actually shown on the directory page (the real denominator).',
    generatedAt: verifiedAt,
    sourcesAttempted: results.length,
    sourcesSuccessful: successful.length,
    sourcesFailed: results.length - successful.length,
    councilsFullyCaptured: successful.filter((r) => r.capturedAllVisible).length,
    totalRecords: all.length,
    withCoordinates: all.filter((r) => r.lat != null && r.lng != null).length,
    withoutCoordinates: all.filter((r) => r.lat == null || r.lng == null).length,
    suspectedDuplicateGroups: duplicates.length,
    suspectedDuplicateRecords: duplicates.reduce((s, g) => s + g.count, 0),
    fieldCoverage: coverage(all),
    bySource: results,
    suspectedDuplicates: duplicates,
    dryRun: true,
    liveDataTouched: false,
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(PREVIEW_OUT, JSON.stringify(all, null, 2), 'utf8');
  writeFileSync(SUMMARY_OUT, JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\n=== Phase 1 dry-run complete ===`);
  console.log(`sources: ${successful.length}/${results.length} ok | records: ${all.length} | with coords: ${summary.withCoordinates} | dup groups: ${duplicates.length}`);
  console.log(`preview → ${PREVIEW_OUT}`);
  console.log(`summary → ${SUMMARY_OUT}`);
}

if (isMain(import.meta.url)) {
  const arg = process.argv[2];
  const sources = arg ? [MIKVAH_COUNCILS[arg]].filter(Boolean) : ALL_MIKVAH_COUNCILS;
  if (!sources.length) { console.error(`Unknown council id: ${arg}`); process.exit(1); }
  importMikvahSabaiApps(sources).catch((e) => { console.error('Failed:', e); process.exit(1); });
}
