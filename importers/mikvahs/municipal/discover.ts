/**
 * Phase 7 — Discover & integrate ADDITIONAL "א.ש בינה" municipal/council mikvah
 * pages (DRY-RUN, PREVIEW ONLY).
 *
 * Candidates came from researching the platform developer's portfolio
 * (binaa.co.il) + the footer fingerprint. This script VERIFIES each candidate
 * is really on the platform, AUTO-DETECTS its mikvah table columns (generalizing
 * the Phase-6 fixed column maps so the one adapter scales to new sites), extracts
 * records, normalizes to the Unified format, and classifies them against the
 * government dataset, the SabaiApps staged records, and the Phase-6 municipal
 * preview.
 *
 * Offline-safe & additive: read-only fetches, NO DB write, NO merge, NO geocode,
 * NO publish. Stops when the candidate list is exhausted (no more found).
 *
 * Run:  node importers/mikvahs/municipal/discover.ts
 * Out:  output/municipal-asbina-catalog.json
 *       output/municipal-asbina-phase7-preview.json
 *       output/municipal-asbina-phase7-merge-analysis.json
 *       output/municipal-asbina-phase7-summary.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { USER_AGENT, isMain, sleep } from '../../shared/utils.ts';
import { makeRecordId, type NormalizedImportRecord } from '../../unified/schema/normalized-record.ts';
import { runValidation } from '../../unified/pipeline/validation.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'output');
const readJson = <T>(f: string): T => JSON.parse(readFileSync(join(OUT, f), 'utf8')) as T;
const ADAPTER_ID = 'municipal-asbina-v1';
const NOW = new Date().toISOString();

/** Candidates from Phase-7 research (binaa.co.il portfolio + footer fingerprint). */
interface Candidate { id: string; name: string; city: string; regional?: boolean; domain: string; mikvahUrl?: string; researchConfidence: number; note?: string; }
const CANDIDATES: Candidate[] = [
  { id: 'kfar-saba', name: 'עיריית כפר סבא', city: 'כפר סבא', domain: 'kfar-saba.muni.il', mikvahUrl: 'https://www.kfar-saba.muni.il/%D7%9E%D7%97%D7%9C%D7%A7%D7%AA-%D7%9E%D7%A7%D7%95%D7%95%D7%90%D7%95%D7%AA/', researchConfidence: 0.95, note: 'named men+women mikvahs' },
  { id: 'kedumim', name: 'מועצה מקומית קדומים', city: 'קדומים', domain: 'kedumim.org.il', mikvahUrl: 'https://www.kedumim.org.il/%D7%9E%D7%A7%D7%95%D7%95%D7%90%D7%95%D7%AA/', researchConfidence: 0.92 },
  { id: 'mate-yehuda', name: 'מועצה אזורית מטה יהודה', city: 'מטה יהודה', regional: true, domain: 'm-yehuda.org.il', mikvahUrl: 'https://www.m-yehuda.org.il/164/', researchConfidence: 0.6, note: 'רשימת מקוואות ובלניות' },
  { id: 'mate-binyamin', name: 'מועצה אזורית מטה בנימין', city: 'מטה בנימין', regional: true, domain: 'binyamin.org.il', mikvahUrl: 'https://www.binyamin.org.il/547/', researchConfidence: 0.6, note: 'מקוואות פרטים מיקום והנגשה' },
  { id: 'azor', name: 'מועצה מקומית אזור', city: 'אזור', domain: 'azor.muni.il', mikvahUrl: 'https://azor.muni.il/%D7%9E%D7%A7%D7%95%D7%95%D7%94/', researchConfidence: 0.7 },
  { id: 'sdot-negev', name: 'המועצה הדתית שדות נגב', city: 'שדות נגב', regional: true, domain: 'sdotnegev.org.il', mikvahUrl: 'https://www.sdotnegev.org.il/124/', researchConfidence: 0.6 },
  // platform-confirmed via portfolio but no mikvah page located by research → manual url-find
  { id: 'qiryat-gat', name: 'עיריית קרית גת', city: 'קרית גת', domain: 'qiryat-gat.muni.il', researchConfidence: 0.4, note: 'portfolio-confirmed platform; mikvah url not located' },
  { id: 'gedera', name: 'מועצה מקומית גדרה', city: 'גדרה', domain: 'gedera.muni.il', researchConfidence: 0.35, note: 'portfolio-confirmed; mikvah url not located' },
  { id: 'beer-tuvia', name: 'מועצה אזורית באר טוביה', city: 'באר טוביה', regional: true, domain: 'beer-tuvia.org.il', researchConfidence: 0.3, note: 'portfolio-confirmed; mikvah url not located' },
  { id: 'eilat', name: 'עיריית אילת', city: 'אילת', domain: 'eilat.muni.il', researchConfidence: 0.25, note: 'portfolio-confirmed; mikvah url not located' },
];

// --- HTML helpers ------------------------------------------------------------

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"').replace(/&#0?34;/g, '"').replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&ndash;|&mdash;/g, '-')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
const strip = (s: string): string => decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

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
const unlabel = (cell: string, header: string | undefined): string =>
  header && cell.startsWith(header + ' ') ? cell.slice(header.length + 1).trim() : cell;
const normPhone = (raw: string): string | undefined => {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10 && d[0] === '0') return d;
  if (d.length === 9 && d[0] !== '0') return '0' + d;
  return d.length >= 9 ? d : undefined;
};

/** Platform fingerprint: footer credit OR the template asset paths. */
function isAsbina(html: string): { confirmed: boolean; evidence: string } {
  if (/א\.?\s?ש\.?\s?בינה/.test(html)) return { confirmed: true, evidence: 'footer credit "א.ש בינה"' };
  if (/content\/template\.(css|js)/.test(html)) return { confirmed: true, evidence: 'content/template.css|js' };
  return { confirmed: false, evidence: 'no א.ש בינה fingerprint' };
}

// --- auto-detect mikvah table + columns -------------------------------------

interface ColMap { settlement?: number; neighborhood?: number; name?: number; address?: number; phone?: number; phone2?: number; balanit?: number; hoursWeek?: number; hoursFri?: number; hoursMotzash?: number; }
const EMAILish = /דוא"?ל|דוא&|מייל|אימייל|e-?mail/i;
function detectColumns(header: string[]): ColMap {
  const map: ColMap = {};
  header.forEach((h, i) => {
    if (/כתובת/.test(h) && !EMAILish.test(h)) map.address ??= i; // "כתובת דוא"ל" is email, not address
    else if (/נייד/.test(h)) map.phone2 ??= i;
    else if (/טלפון|פלאפון|מספר/.test(h)) map.phone ??= i;
    else if (/בלנית|אחרא/.test(h)) map.balanit ??= i;
    else if (/יישוב|ישוב/.test(h)) map.settlement ??= i;
    else if (/שכונה|אזור|רובע/.test(h)) map.neighborhood ??= i;
    else if (/מוצאי|מוצ"?ש/.test(h)) map.hoursMotzash ??= i;
    else if (/שישי|ערב\s?שבת|ערב\s?חג/.test(h)) map.hoursFri ??= i;
    else if (/שעות|פתיחה|קבלה/.test(h)) map.hoursWeek ??= i;
    else if (/מקווה|שם|סוג/.test(h)) map.name ??= i;
  });
  return map;
}
/**
 * A real mikvah table needs a true LOCATION column (address or settlement) and
 * mikvah context. STAFF/contact tables (role + email, e.g. שם/תפקיד/דוא"ל) are
 * rejected unless they also carry בלנית/מקווה — that is the actual list table.
 */
function isMikvahTable(header: string[], map: ColMap): boolean {
  if (header.length < 2 || header.length > 9) return false;
  const text = header.join(' ');
  const mikvahish = /בלנית|מקווה|מקוה|טהר/.test(text);
  const staffish = /תפקיד/.test(text) || EMAILish.test(text);
  if (staffish && !mikvahish) return false; // staff/contact directory, not mikvahs
  const hasLoc = map.address != null || map.settlement != null;
  const hasInfo = map.phone != null || map.phone2 != null || map.balanit != null || map.hoursWeek != null || map.hoursFri != null || map.hoursMotzash != null;
  return hasLoc && (mikvahish || hasInfo);
}

// --- normalize one extracted row → unified record ---------------------------

interface Extracted { record: NormalizedImportRecord; city: string; name: string; address: string | null; phone: string | null; gender: string; balanit: string | null; openingHours: string | null; }
function buildRecord(cand: Candidate, gender: string, cells: string[], header: string[], map: ColMap, rowIdx: number): Extracted | null {
  const at = (i: number | undefined): string => (i != null && cells[i] != null ? unlabel(cells[i], header[i]) : '');
  const settlement = at(map.settlement).trim();
  const neighborhood = at(map.neighborhood).trim();
  const rawName = at(map.name).trim();
  const addrRaw = at(map.address).trim();
  const address = addrRaw.includes('@') ? '' : addrRaw; // never keep an email as an address
  const phone = normPhone(at(map.phone)) ?? normPhone(at(map.phone2));
  const balanit = at(map.balanit).trim() || undefined;
  const hours = [at(map.hoursWeek), at(map.hoursFri) && `שישי/ערב חג: ${at(map.hoursFri)}`, at(map.hoursMotzash) && `מוצ"ש/חג: ${at(map.hoursMotzash)}`].map((x) => x.trim()).filter(Boolean).join(' | ') || undefined;

  const city = cand.regional ? (settlement || cand.city) : cand.city;
  const anchor = settlement || neighborhood || address || rawName;
  if (!anchor) return null;
  const base = rawName || (cand.regional ? settlement : neighborhood) || address;
  const genderTag = gender === 'נשים' || gender === 'לא צוין' ? '' : ` (${gender})`;
  const name = (base.startsWith('מקווה') ? base : `מקווה ${base}`) + genderTag;

  const sourceId = `municipal:${cand.id}:mikvah`;
  const sourceRecordId = `${cand.id}-${rowIdx}`;
  const extra: Record<string, unknown> = { municipality: cand.name, gender, cms: 'asbina', locationPrecision: 'none', platform: 'a.ש בינה' };
  if (neighborhood) extra.neighborhood = neighborhood;
  if (settlement) extra.settlement = settlement;
  if (balanit) extra.balanit = balanit;

  const record: NormalizedImportRecord = {
    id: makeRecordId(sourceId, sourceRecordId), type: 'mikveh', name,
    ...(address ? { address } : {}), cityHint: city,
    ...(phone ? { phone } : {}), ...(hours ? { openingHours: hours } : {}),
    tags: [`gender:${gender}`], confidence: 'medium',
    provenance: { sourceId, adapterId: ADAPTER_ID, sourceRecordId, sourceUrl: cand.mikvahUrl, fetchedAt: NOW.slice(0, 10), raw: { cells } },
    extra,
  };
  return { record, city, name, address: address || null, phone: phone ?? null, gender, balanit: balanit ?? null, openingHours: hours ?? null };
}

// --- text matching (no coordinates) -----------------------------------------

const STOP = /^(רחוב|רח|שדרות|שד|שכונת|שכ|דרך|מושב|קיבוץ|ישראל|israel)$/;
const sp = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-]/g, ' ').replace(/\s+/g, ' ').trim();
const normCity = (s: string | undefined): string => sp(String(s ?? ''));
const normNameKey = (s: string | undefined): string => sp(String(s ?? '').replace(/מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת/g, ' '));
const digits = (s: string | null | undefined): string => { const d = String(s ?? '').replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };
function addrTokens(a: string | null | undefined, city: string): { house: string | null; tokens: Set<string> } {
  let s = sp(String(a ?? '')).replace(/\b(ישראל|israel)\b/gi, ' ');
  for (const c of normCity(city).split(' ')) s = s.split(' ').filter((t) => t !== c).join(' ');
  let house: string | null = null; const tokens = new Set<string>();
  for (const t of s.split(/\s+/).filter(Boolean)) { if (/^\d+[א-ת]?$/.test(t)) { if (!house) house = t.replace(/\D/g, ''); } else if (!STOP.test(t) && t.length >= 2) tokens.add(t); }
  return { house, tokens };
}
function jaccard(a: Set<string>, b: Set<string>): number { if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); }

interface Cand2 { id: string; dataset: 'gov' | 'sabaiapps' | 'municipal'; city: string; name: string; address?: string; phone?: string; }
function score(m: Extracted, c: Cand2): { conf: number; tier: string } | null {
  const a1 = addrTokens(m.address, m.city), a2 = addrTokens(c.address, c.city);
  const ss = jaccard(a1.tokens, a2.tokens); const houseEq = !!a1.house && a1.house === a2.house;
  const phoneEq = digits(m.phone).length >= 9 && digits(m.phone) === digits(c.phone);
  const nameEq = normNameKey(m.name).length >= 2 && normNameKey(m.name) === normNameKey(c.name);
  if (phoneEq && (ss >= 0.5 || nameEq)) return { conf: 0.95, tier: 'phone+context' };
  if (ss >= 0.6 && houseEq) return { conf: 0.9, tier: 'address-exact' };
  if (ss >= 0.5) return { conf: 0.78, tier: 'address-partial' };
  if (phoneEq) return { conf: 0.72, tier: 'phone-only' };
  if (nameEq) return { conf: 0.7, tier: 'name' };
  return null;
}

interface CatalogEntry { id: string; name: string; city: string; regional: boolean; domain: string; mikvahUrl: string | null; platformConfirmed: boolean; platformEvidence: string; httpStatus: number | string; mikvahTableFound: boolean; recordsExtracted: number; status: string; researchConfidence: number; }

async function fetchHtml(url: string): Promise<{ html: string | null; status: number | string }> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return { html: null, status: res.status };
    return { html: await res.text(), status: res.status };
  } catch (e) { return { html: null, status: (e as Error).message }; }
}

async function run(): Promise<void> {
  // reference pool: gov + SabaiApps staged + Phase-6 municipal
  const gov = readJson<any[]>('mikvahs.normalized.json');
  const sab = readJson<any[]>('sabaiapps-new-mikvahs-staging.json');
  const mun6 = readJson<any[]>('municipal-mikvah-preview.json');
  const pool: Cand2[] = [
    ...gov.map((g) => ({ id: g.sourceId, dataset: 'gov' as const, city: g.city ?? '', name: g.name ?? '', address: g.address, phone: g.phone })),
    ...sab.map((s) => ({ id: s.record?.id ?? s.stagingId, dataset: 'sabaiapps' as const, city: s.city ?? '', name: s.name ?? '', address: s.address ?? undefined, phone: s.phone ?? undefined })),
    ...mun6.map((r) => ({ id: r.id, dataset: 'municipal' as const, city: r.cityHint ?? '', name: r.name ?? '', address: r.address, phone: r.phone })),
  ];
  const byCity = new Map<string, Cand2[]>();
  for (const c of pool) { const k = normCity(c.city); (byCity.get(k) ?? byCity.set(k, []).get(k)!).push(c); }

  const catalog: CatalogEntry[] = [];
  const allRecords: Extracted[] = [];

  for (const cand of CANDIDATES) {
    const entry: CatalogEntry = { id: cand.id, name: cand.name, city: cand.city, regional: !!cand.regional, domain: cand.domain, mikvahUrl: cand.mikvahUrl ?? null, platformConfirmed: false, platformEvidence: '', httpStatus: '-', mikvahTableFound: false, recordsExtracted: 0, status: '', researchConfidence: cand.researchConfidence };
    if (!cand.mikvahUrl) { entry.status = 'mikvah-url-not-located'; entry.platformEvidence = cand.note ?? 'portfolio-confirmed platform, no mikvah page URL'; catalog.push(entry); continue; }

    const { html, status } = await fetchHtml(cand.mikvahUrl);
    entry.httpStatus = status;
    if (!html) { entry.status = `fetch-failed (${status})`; catalog.push(entry); await sleep(1200); continue; }

    const fp = isAsbina(html); entry.platformConfirmed = fp.confirmed; entry.platformEvidence = fp.evidence;

    // find mikvah table(s) and extract
    const tables = extractTables(html);
    let extracted = 0;
    const seen = new Set<string>();
    for (const table of tables) {
      if (table.length < 2) continue;
      const header = table[0];
      const map = detectColumns(header);
      if (!isMikvahTable(header, map)) continue;
      entry.mikvahTableFound = true;
      // gender hint from header text
      const headerText = header.join(' ');
      const gender = /גברים/.test(headerText) ? 'גברים' : /כלים/.test(headerText) ? 'כלים' : 'לא צוין';
      for (let r = 1; r < table.length; r++) {
        const rec = buildRecord(cand, gender, table[r], header, map, r + extracted);
        if (!rec) continue;
        const key = `${rec.gender}|${rec.address ?? rec.city}|${rec.phone ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        allRecords.push(rec); extracted++;
      }
    }
    entry.recordsExtracted = extracted;
    entry.status = !fp.confirmed ? 'platform-unconfirmed' : entry.mikvahTableFound ? (extracted ? 'extracted' : 'table-empty') : 'no-structured-table';
    catalog.push(entry);
    console.log(`● ${cand.name} [${fp.confirmed ? 'asbina' : 'NOT-asbina'}] table=${entry.mikvahTableFound} extracted=${extracted}`);
    await sleep(1500);
  }

  // classify extracted records vs the reference pool
  const analysis = allRecords.map((m) => {
    const cands = byCity.get(normCity(m.city)) ?? [];
    const scored = cands.map((c) => ({ c, s: score(m, c) })).filter((x): x is { c: Cand2; s: { conf: number; tier: string } } => x.s !== null).sort((a, b) => b.s.conf - a.s.conf);
    const best = scored[0];
    let classification: string; let confidence = best ? best.s.conf : 0; let reason: string;
    if (!best) { classification = 'new_record'; confidence = cands.length ? 0.8 : 0.9; reason = cands.length ? 'city present in reference but no match → new' : 'city absent from reference → new'; }
    else if (best.s.conf >= 0.9) { classification = 'exact_match'; reason = `matches ${best.c.dataset} ${best.c.id} (${best.s.tier})`; }
    else if (best.s.conf >= 0.7) { classification = 'probable_match'; reason = `probable ${best.c.dataset} ${best.c.id} (${best.s.tier})`; }
    else { classification = 'manual_review'; reason = `weak (${best.s.conf})`; }
    return { sourceRecordId: m.record.provenance.sourceRecordId, municipality: (m.record.extra as any)?.municipality, city: m.city, name: m.name, gender: m.gender, address: m.address, phone: m.phone, classification, confidence: Number(confidence.toFixed(2)), matchedDataset: best?.c.dataset ?? null, matchedId: best?.c.id ?? null, reason };
  });

  const validation = allRecords.map((m) => runValidation(m.record));
  const vErrors = validation.filter((v) => !v.ok).length;
  const vWarn = validation.flatMap((v) => v.issues.filter((i) => i.severity === 'warning')).length;

  const cnt = (c: string) => analysis.filter((a) => a.classification === c).length;
  const trulyNew = cnt('new_record');
  const newByCity: Record<string, number> = {};
  for (const a of analysis) if (a.classification === 'new_record') newByCity[a.city] = (newByCity[a.city] ?? 0) + 1;
  const confirmedSites = catalog.filter((c) => c.status === 'extracted');
  const baselineUnique = 687; // gov 606 + ~62 SabaiApps (Phase 5) + 19 municipal (Phase 6)

  const summary = {
    generatedNote: 'PHASE 7 DRY-RUN — additional א.ש בינה municipalities. Preview only. No DB write, no merge, no geocode, no publish. Additive. Stopped when the candidate list was exhausted.',
    platformFingerprint: 'footer credit "א.ש בינה" / "א.ש. בינה" OR content/template.css|js (developer: binaa.co.il)',
    candidatesEvaluated: CANDIDATES.length,
    sitesPlatformConfirmed: catalog.filter((c) => c.platformConfirmed).length,
    sitesWithMikvahTable: catalog.filter((c) => c.mikvahTableFound).length,
    municipalitiesIntegrated: confirmedSites.length,
    municipalitiesIntegratedList: confirmedSites.map((c) => `${c.name} (${c.recordsExtracted})`),
    candidatesNeedingManualUrl: catalog.filter((c) => c.status === 'mikvah-url-not-located').map((c) => c.name),
    candidatesNoStructuredTable: catalog.filter((c) => c.status === 'no-structured-table' || c.status === 'platform-unconfirmed' || String(c.status).startsWith('fetch-failed')).map((c) => `${c.name} [${c.status}]`),
    recordsExtracted: allRecords.length,
    classification: { exact_match: cnt('exact_match'), probable_match: cnt('probable_match'), new_record: trulyNew, manual_review: cnt('manual_review') },
    trulyNewMikvahs: trulyNew,
    duplicates: cnt('exact_match') + cnt('probable_match'),
    coverageByCity: newByCity,
    fieldCoverage: (() => { const n = allRecords.length || 1; const pct = (f: (m: Extracted) => unknown) => Math.round((allRecords.filter((m) => { const v = f(m); return v != null && String(v).trim() !== ''; }).length / n) * 100); return { name: pct((m) => m.name), city: pct((m) => m.city), address: pct((m) => m.address), phone: pct((m) => m.phone), openingHours: pct((m) => m.openingHours), balanit: pct((m) => m.balanit) }; })(),
    validation: { passed: allRecords.length - vErrors, errors: vErrors, warnings: vWarn },
    baselineUniqueBeforePhase7: baselineUnique,
    estimatedNationalTotalAfterPhase7: `~${baselineUnique} + ${trulyNew} new = ~${baselineUnique + trulyNew} unique`,
    stoppingCondition: 'candidate list (developer portfolio + footer fingerprint) exhausted — no further א.ש בינה municipalities pending. Did NOT proceed to national aggregators.',
    dryRun: true, liveDataTouched: false, publishPerformed: false,
  };

  writeFileSync(join(OUT, 'municipal-asbina-catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');
  writeFileSync(join(OUT, 'municipal-asbina-phase7-preview.json'), JSON.stringify(allRecords.map((m) => m.record), null, 2), 'utf8');
  writeFileSync(join(OUT, 'municipal-asbina-phase7-merge-analysis.json'), JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(join(OUT, 'municipal-asbina-phase7-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n=== Phase 7 א.ש בינה discovery (dry-run) ===');
  console.log(`candidates=${CANDIDATES.length} platformConfirmed=${summary.sitesPlatformConfirmed} integrated=${confirmedSites.length} extracted=${allRecords.length}`);
  console.log(`new=${trulyNew} exact=${cnt('exact_match')} probable=${cnt('probable_match')} manual=${cnt('manual_review')}`);
  console.log(`estimated national total after Phase 7: ~${baselineUnique + trulyNew}`);
}

if (isMain(import.meta.url)) void run();
