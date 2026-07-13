/**
 * Phase 6 — Municipal "א.ש בינה" mikvah tables importer (DRY-RUN, PREVIEW ONLY).
 *
 * Fetches each municipality's public mikvah table (read-only), parses rows into
 * the Unified Importer `NormalizedImportRecord`, then classifies every record
 * against BOTH the government dataset and the Phase-3 SabaiApps staged records:
 *   exact_match | probable_match | new_record | enrichment_candidate | manual_review
 *
 * No coordinates exist in these tables, so matching is text-based (city + address
 * + phone + name). NOTHING is written to the DB, merged, geocoded, or published.
 *
 * Run:  node importers/mikvahs/municipal/importer.ts
 * Out:  output/municipal-mikvah-preview.json
 *       output/municipal-mikvah-merge-analysis.json
 *       output/municipal-mikvah-summary.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { USER_AGENT, isMain, sleep } from '../../shared/utils.ts';
import { makeRecordId, type NormalizedImportRecord } from '../../unified/schema/normalized-record.ts';
import { runValidation } from '../../unified/pipeline/validation.ts';
import { MUNICIPAL_SOURCES, type MunicipalSource, type TableSpec } from './sources.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'output');
const readJson = <T>(f: string): T => JSON.parse(readFileSync(join(OUT, f), 'utf8')) as T;
const ADAPTER_ID = 'municipal-asbina-v1';
const NOW = new Date().toISOString();

// --- HTML helpers ------------------------------------------------------------

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"').replace(/&#0?34;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&ndash;|&mdash;/g, '-').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
const strip = (s: string): string => decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Split the page into tables → rows → cells (text). */
function extractTables(html: string): string[][][] {
  const tables: string[][][] = [];
  for (const block of html.split(/<table/i).slice(1)) {
    const body = block.split(/<\/table>/i)[0];
    const rows: string[][] = [];
    for (const tr of body.split(/<tr[\s>]/i).slice(1)) {
      const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => strip(m[1]));
      if (cells.length) rows.push(cells);
    }
    tables.push(rows);
  }
  return tables;
}

/** Strip a repeated header-label prefix from a cell (ASP.NET responsive labels). */
const unlabel = (cell: string, header: string | undefined): string =>
  header && cell.startsWith(header + ' ') ? cell.slice(header.length + 1).trim() : cell;

const normPhone = (raw: string): string | undefined => {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10 && d[0] === '0') return d;
  if (d.length === 9 && d[0] !== '0') return '0' + d;
  return d.length >= 9 ? d : undefined;
};

// --- parse one source --------------------------------------------------------

interface MuniRecord {
  record: NormalizedImportRecord;
  // flat view for the preview/analysis
  municipality: string;
  city: string;
  name: string;
  address: string | null;
  phone: string | null;
  gender: string;
  balanit: string | null;
  openingHours: string | null;
}

function buildRecord(src: MunicipalSource, spec: TableSpec, cells: string[], header: string[], rowIdx: number): MuniRecord | null {
  const at = (i: number | undefined): string => (i != null && cells[i] != null ? unlabel(cells[i], header[i]) : '');
  const m = spec.map;

  const settlement = at(m.settlement).trim();
  const neighborhood = at(m.neighborhood).trim();
  const rawName = at(m.name).trim();
  const address = at(m.address).trim();
  const phone = normPhone(at(m.phone)) ?? normPhone(at(m.phone2));
  const balanit = at(m.balanit).trim() || at(m.balanitDetails).trim() || undefined;

  const hoursParts = [at(m.hours), at(m.hoursWeek), at(m.hoursFri) && `שישי/ערב חג: ${at(m.hoursFri)}`, at(m.hoursMotzash) && `מוצ"ש/חג: ${at(m.hoursMotzash)}`]
    .map((x) => x.trim()).filter(Boolean);
  const openingHours = hoursParts.join(' | ') || undefined;

  // city: settlement for regional councils, else the source city
  const city = src.regional ? settlement : src.city;
  const anchor = settlement || neighborhood || address || rawName;
  if (!city || !anchor) return null; // unusable empty row

  // synthesize a name (these tables rarely carry a facility name)
  const genderTag = spec.gender === 'נשים' ? '' : ` (${spec.gender})`;
  const baseName = rawName || (src.regional ? settlement : neighborhood) || address;
  const name = (baseName.startsWith('מקווה') ? baseName : `מקווה ${baseName}`) + genderTag;

  const sourceRecordId = `${src.id}-${spec.gender}-${rowIdx}`;
  const sourceId = `municipal:${src.id}:mikvah`;

  const extra: Record<string, unknown> = {
    municipality: src.municipality, gender: spec.gender, cms: src.cms, locationPrecision: 'none',
  };
  if (neighborhood) extra.neighborhood = neighborhood;
  if (settlement) extra.settlement = settlement;
  if (balanit) extra.balanit = balanit;
  if (at(m.hoursFri)) extra.hoursShabbatEve = at(m.hoursFri);
  if (at(m.hoursMotzash)) extra.hoursMotzashSham = at(m.hoursMotzash);

  const record: NormalizedImportRecord = {
    id: makeRecordId(sourceId, sourceRecordId),
    type: 'mikveh',
    name,
    ...(address ? { address } : {}),
    cityHint: city,
    ...(phone ? { phone } : {}),
    ...(openingHours ? { openingHours } : {}),
    tags: [`gender:${spec.gender}`],
    confidence: 'medium',
    provenance: { sourceId, adapterId: ADAPTER_ID, sourceRecordId, sourceUrl: src.url, fetchedAt: NOW.slice(0, 10), raw: { cells, table: spec.tableIndex } },
    extra,
  };

  return { record, municipality: src.municipality, city, name, address: address || null, phone: phone ?? null, gender: spec.gender, balanit: balanit ?? null, openingHours: openingHours ?? null };
}

async function fetchHtml(url: string, label: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      console.warn(`  [${label}] attempt ${attempt}: ${(e as Error).message}`);
      if (attempt < 3) await sleep(attempt * 2500);
    }
  }
  return null;
}

interface SourceResult { id: string; municipality: string; ok: boolean; error?: string; tablesFound: number; extracted: number; }

async function parseSource(src: MunicipalSource): Promise<{ records: MuniRecord[]; result: SourceResult }> {
  const result: SourceResult = { id: src.id, municipality: src.municipality, ok: false, tablesFound: 0, extracted: 0 };
  const html = await fetchHtml(src.url, src.id);
  if (!html) { result.error = 'fetch-failed'; return { records: [], result }; }

  const tables = extractTables(html);
  result.tablesFound = tables.length;
  const records: MuniRecord[] = [];
  const seen = new Set<string>();

  for (const spec of src.tables) {
    const table = tables[spec.tableIndex];
    if (!table || table.length < 2) { console.warn(`  [${src.id}] table ${spec.tableIndex} missing/empty`); continue; }
    const header = table[0];
    if (spec.headerHint && !header.some((h) => h.includes(spec.headerHint!))) {
      console.warn(`  [${src.id}] table ${spec.tableIndex} header mismatch (expected "${spec.headerHint}"): ${JSON.stringify(header).slice(0, 80)}`);
    }
    for (let r = 1; r < table.length; r++) {
      const rec = buildRecord(src, spec, table[r], header, r);
      if (!rec) continue;
      // within-source dedupe by (gender + address/settlement + phone)
      const key = `${rec.gender}|${rec.address ?? rec.city}|${rec.phone ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      records.push(rec);
    }
  }
  result.extracted = records.length;
  result.ok = true;
  console.log(`● ${src.municipality} [${src.cms}] tables=${tables.length} extracted=${records.length}`);
  return { records, result };
}

// --- text matching (no coordinates) -----------------------------------------

const STOP = /^(רחוב|רח|שדרות|שד|שכונת|שכ|דרך|מושב|קיבוץ|ישראל|israel)$/;
const stripPunct = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-]/g, ' ').replace(/\s+/g, ' ').trim();
const normCity = (s: string | undefined): string => stripPunct(String(s ?? ''));
const normNameKey = (s: string | undefined): string => stripPunct(String(s ?? '').replace(/מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת/g, ' '));
const digits = (s: string | null | undefined): string => { const d = String(s ?? '').replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };

interface AddrParts { house: string | null; tokens: Set<string>; }
function normAddr(addr: string | null | undefined, city: string): AddrParts {
  let s = stripPunct(String(addr ?? '')).replace(/\b(ישראל|israel)\b/gi, ' ');
  for (const c of normCity(city).split(' ')) s = s.split(' ').filter((t) => t !== c).join(' ');
  const toks = s.split(/\s+/).filter(Boolean);
  let house: string | null = null;
  const tokens = new Set<string>();
  for (const t of toks) {
    if (/^\d+[א-ת]?$/.test(t)) { if (!house) house = t.replace(/\D/g, ''); continue; }
    if (!STOP.test(t) && t.length >= 2) tokens.add(t);
  }
  return { house, tokens };
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let i = 0; for (const x of a) if (b.has(x)) i++;
  return i / (a.size + b.size - i);
}

interface Candidate { id: string; dataset: 'gov' | 'sabaiapps'; city: string; name: string; address?: string; phone?: string; openingHours?: string; balanit?: string; shabbat?: string; }

const empty = (v: unknown): boolean => v == null || String(v).trim() === '';
/** Ditto/placeholder values that mean "no real data" (e.g. כנ"ל = same as above). */
const isPlaceholder = (v: unknown): boolean => /^(כנ.?ל|ראה לעיל|כמו לעיל|[-–—"']+)$/.test(String(v ?? '').trim());
const missing = (v: unknown): boolean => empty(v) || isPlaceholder(v);

function enrichable(cand: Candidate, m: MuniRecord): string[] {
  const ef: string[] = [];
  if (missing(cand.openingHours) && !empty(m.openingHours)) ef.push('openingHours');
  if (missing(cand.phone) && !empty(m.phone)) ef.push('phone');
  if (missing(cand.balanit) && !empty(m.balanit)) ef.push('balanit');
  // structured shabbat/holiday hours — when the matched record has none or a placeholder.
  const muniHasShabbat = /שישי|מוצ/.test(m.openingHours ?? '');
  if (muniHasShabbat && missing(cand.shabbat) && !/שבת|מוצ/.test(cand.openingHours ?? '')) ef.push('shabbatHours');
  return ef;
}

interface Scored { cand: Candidate; conf: number; tier: string; addrSim: number; }
function scoreOne(m: MuniRecord, c: Candidate): Scored | null {
  const a1 = normAddr(m.address, m.city), a2 = normAddr(c.address, c.city);
  const streetSim = jaccard(a1.tokens, a2.tokens);
  const houseEq = !!a1.house && a1.house === a2.house;
  const phoneEq = digits(m.phone).length >= 9 && digits(m.phone) === digits(c.phone);
  const nameEq = normNameKey(m.name).length >= 2 && normNameKey(m.name) === normNameKey(c.name);
  const addrExact = streetSim >= 0.6 && houseEq;
  const addrPartial = streetSim >= 0.5;

  if (phoneEq && (addrPartial || nameEq)) return { cand: c, conf: 0.95, tier: 'phone+context', addrSim: streetSim };
  if (addrExact) return { cand: c, conf: 0.9, tier: 'address-exact', addrSim: streetSim };
  if (addrPartial) return { cand: c, conf: 0.78, tier: 'address-partial', addrSim: streetSim };
  if (phoneEq) return { cand: c, conf: 0.72, tier: 'phone-only', addrSim: streetSim };
  if (nameEq) return { cand: c, conf: 0.7, tier: 'name', addrSim: streetSim };
  return null;
}

type Classification = 'exact_match' | 'probable_match' | 'new_record' | 'enrichment_candidate' | 'manual_review';

async function run(): Promise<void> {
  // build candidate pool: gov (606) + SabaiApps staged (72)
  const gov = readJson<any[]>('mikvahs.normalized.json');
  const sab = readJson<any[]>('sabaiapps-new-mikvahs-staging.json');
  const candidates: Candidate[] = [
    ...gov.map((g) => ({ id: g.sourceId, dataset: 'gov' as const, city: g.city ?? '', name: g.name ?? '', address: g.address, phone: g.phone, openingHours: g.openingHours, balanit: g.extra?.responsible, shabbat: g.extra?.hoursShabbat })),
    ...sab.map((s) => ({ id: s.record?.id ?? s.stagingId, dataset: 'sabaiapps' as const, city: s.city ?? '', name: s.name ?? '', address: s.address ?? undefined, phone: s.phone ?? undefined, openingHours: s.openingHours ?? undefined, balanit: s.balanit ?? undefined })),
  ];
  const byCity = new Map<string, Candidate[]>();
  for (const c of candidates) { const k = normCity(c.city); (byCity.get(k) ?? byCity.set(k, []).get(k)!).push(c); }

  const allRecords: MuniRecord[] = [];
  const results: SourceResult[] = [];
  for (const src of MUNICIPAL_SOURCES) {
    const { records, result } = await parseSource(src);
    allRecords.push(...records);
    results.push(result);
    await sleep(1500);
  }

  // classify each municipal record
  const analysis = allRecords.map((m) => {
    const pool = byCity.get(normCity(m.city)) ?? [];
    const scored = pool.map((c) => scoreOne(m, c)).filter((x): x is Scored => x !== null).sort((a, b) => b.conf - a.conf);
    const best = scored[0];
    const runner = scored[1];

    let classification: Classification;
    let confidence = best ? best.conf : 0;
    let ef: string[] = [];
    let reason: string;

    if (!best) {
      classification = 'new_record';
      confidence = pool.length ? 0.8 : 0.9;
      reason = pool.length ? 'city present in reference data but no record matched → new' : 'city absent from reference data → new';
    } else if (runner && best.conf - runner.conf < 0.08 && runner.conf >= 0.7) {
      classification = 'manual_review';
      reason = `two candidates tie (${best.conf} vs ${runner.conf})`;
    } else {
      ef = enrichable(best.cand, m);
      if (ef.length > 0) { classification = 'enrichment_candidate'; reason = `matches ${best.cand.dataset} ${best.cand.id} (${best.tier}); adds: ${ef.join(', ')}`; }
      else if (best.conf >= 0.9) { classification = 'exact_match'; reason = `matches ${best.cand.dataset} ${best.cand.id} (${best.tier}); nothing to add`; }
      else if (best.conf >= 0.7) { classification = 'probable_match'; reason = `probable match to ${best.cand.dataset} ${best.cand.id} (${best.tier})`; }
      else { classification = 'manual_review'; reason = `weak match (${best.conf})`; }
    }

    return {
      sourceRecordId: m.record.provenance.sourceRecordId,
      municipality: m.municipality, city: m.city, name: m.name, gender: m.gender,
      address: m.address, phone: m.phone, hasHours: !!m.openingHours, hasBalanit: !!m.balanit,
      classification, confidence: Number(confidence.toFixed(2)),
      matchedDataset: best?.cand.dataset ?? null, matchedId: best?.cand.id ?? null,
      matchedName: best?.cand.name ?? null, tier: best?.tier ?? null, enrichableFields: ef, reason,
    };
  });

  // validate the normalized records
  const validation = allRecords.map((m) => runValidation(m.record));
  const validationErrors = validation.filter((v) => !v.ok).length;
  const warnings = validation.flatMap((v) => v.issues.filter((i) => i.severity === 'warning'));

  // aggregates
  const cnt = (c: Classification) => analysis.filter((a) => a.classification === c).length;
  const trulyNew = cnt('new_record');
  const byCityCount: Record<string, Record<string, number>> = {};
  for (const a of analysis) { (byCityCount[a.city] ??= {})[a.classification] = ((byCityCount[a.city] ??= {})[a.classification] ?? 0) + 1; }
  const cov = (() => {
    const n = allRecords.length || 1;
    const pct = (f: (m: MuniRecord) => unknown) => Math.round((allRecords.filter((m) => { const v = f(m); return v != null && String(v).trim() !== ''; }).length / n) * 100);
    return { name: pct((m) => m.name), city: pct((m) => m.city), address: pct((m) => m.address), phone: pct((m) => m.phone), openingHours: pct((m) => m.openingHours), gender: pct((m) => m.gender), balanit: pct((m) => m.balanit) };
  })();

  const summary = {
    generatedNote: 'PHASE 6 DRY-RUN — municipal א.ש בינה tables. Preview only. No DB write, no merge, no geocoding, no publish. Additive.',
    municipalitiesProcessed: results.length,
    municipalitiesOk: results.filter((r) => r.ok).length,
    recordsExtracted: allRecords.length,
    classification: { exact_match: cnt('exact_match'), probable_match: cnt('probable_match'), new_record: trulyNew, enrichment_candidate: cnt('enrichment_candidate'), manual_review: cnt('manual_review') },
    trulyNewMikvahs: trulyNew,
    enrichmentOpportunities: cnt('enrichment_candidate'),
    duplicates: cnt('exact_match') + cnt('probable_match'),
    coverageByCity: byCityCount,
    fieldCoverage: cov,
    bySource: results,
    validation: { passed: allRecords.length - validationErrors, errors: validationErrors, warnings: warnings.length },
    coordinatesNote: 'No native coordinates in these tables — all records are un-geocoded; matching is text-based (city + address + phone + name).',
    estimatedAdditionalUniqueBeyond668: trulyNew,
    nationalCoverageEstimateAfter: `~668 + ${trulyNew} new municipal = ~${668 + trulyNew} unique (plus ${cnt('enrichment_candidate')} enrichment opportunities for existing records).`,
    dryRun: true, liveDataTouched: false, publishPerformed: false,
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'municipal-mikvah-preview.json'), JSON.stringify(allRecords.map((m) => m.record), null, 2), 'utf8');
  writeFileSync(join(OUT, 'municipal-mikvah-merge-analysis.json'), JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(join(OUT, 'municipal-mikvah-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n=== Phase 6 municipal dry-run ===');
  console.log(`municipalities=${results.filter((r) => r.ok).length}/${results.length} extracted=${allRecords.length}`);
  console.log(`new=${trulyNew} enrich=${cnt('enrichment_candidate')} exact=${cnt('exact_match')} probable=${cnt('probable_match')} manual=${cnt('manual_review')}`);
  console.log(`validation: ${summary.validation.passed} ok, ${validationErrors} errors, ${warnings.length} warnings`);
  console.log(`estimated additional unique beyond ~668: ${trulyNew}`);
}

if (isMain(import.meta.url)) void run();
