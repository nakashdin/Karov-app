/**
 * Phase 11 — FIRST-WRITE PREP (Tier A, 61 records) + complete SKIPPED BACKLOG.
 *
 * Produces (PREVIEW ONLY — NO DB WRITE, NO PUBLISH):
 *   1. first-write-apply-preview.json — the exact app `Place` payload for the 61
 *      write-ready SabaiApps records (native coordinates), plus the fields that
 *      would be DROPPED on write (Place has no `extra`).
 *   2. skipped-mikveh-backlog.json — EVERY candidate NOT in the first write,
 *      each with reason / source / city / name / what-is-needed-next.
 *   3. skipped-mikveh-backlog-summary.json
 *
 * Nothing is published. "Do not publish if there is any uncertainty" — this only
 * prepares and reports; a human must approve before any real write.
 *
 * Run:  node importers/mikvahs/first-write-and-backlog.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../shared/utils.ts';
import type { NormalizedImportRecord } from '../unified/schema/normalized-record.ts';
import type { Place } from '../../src/types/place.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const readJson = <T>(f: string): T => JSON.parse(readFileSync(join(OUT, f), 'utf8')) as T;

type NextAction =
  | 'address-level geocoding'
  | 'manual coordinates'
  | 'manual review'
  | 'enrichment decision'
  | 'duplicate confirmation';

interface BacklogEntry {
  source: string;
  city: string | null;
  name: string;
  reasonSkipped: string;
  category: 'coordless-city-level' | 'coordless-failed' | 'manual-review' | 'enrichment-candidate' | 'duplicate-conflict' | 'geocoding-needed';
  whatIsNeededNext: NextAction;
  matchedId?: string | null;
  detail?: string;
}

// --- 1. FIRST-WRITE preview (Tier A: 61 SabaiApps, native coords) -------------

interface PkgRecord { sourceSystem: string; city: string | null; address: string | null; confidence: number; record: NormalizedImportRecord; }

function buildFirstWrite(pkg: PkgRecord[]): { preview: any[]; writtenIds: Set<string> } {
  const tierA = pkg.filter((p) => p.sourceSystem === 'sabaiapps' && p.record.location != null);
  const writtenIds = new Set<string>();
  const preview = tierA.map((p) => {
    const r = p.record;
    const appId = r.provenance.sourceRecordId; // stable, unique (rc-mikvah-<council>-<id>)
    writtenIds.add(r.provenance.sourceRecordId);
    const ex = (r.extra ?? {}) as Record<string, unknown>;
    // Typed against `Place` so the preview is guaranteed to be a valid write payload.
    const place: Place = {
      id: appId,
      name: r.name,
      type: 'mikveh',
      cityId: r.cityHint ?? '',
      address: r.address ?? r.cityHint ?? '',
      location: r.location!, // native exact coordinate (locationPrecision omitted = exact)
      source: 'seed', // council-sourced, non-OSM
    };
    if (r.phone) place.phone = r.phone;
    if (r.openingHours) place.openingHours = r.openingHours;
    if (r.tags?.length) place.tags = r.tags;
    // B4 SOLVED — preserve mikveh-specific + provenance fields on the Place itself.
    if (ex.gender) place.mikvehGender = String(ex.gender);
    if (ex.balanit) place.attendant = String(ex.balanit);
    if (r.provenance.sourceUrl) place.sourceUrl = r.provenance.sourceUrl;
    if (ex.council) place.sourceName = String(ex.council);
    place.extra = {
      ...ex,
      provenance: { adapterId: r.provenance.adapterId, sourceRecordId: r.provenance.sourceRecordId, sourceUrl: r.provenance.sourceUrl ?? null, fetchedAt: r.provenance.fetchedAt },
    };
    return {
      place,
      // B4 resolved: nothing is dropped on write anymore.
      preservedOnWrite: { mikvehGender: place.mikvehGender ?? null, attendant: place.attendant ?? null, sourceUrl: place.sourceUrl ?? null, sourceName: place.sourceName ?? null, extra: 'full source metadata retained' },
      fieldsDropped: 'none',
      sourceSystem: p.sourceSystem,
      writeConfidence: p.confidence,
      readyToWrite: true,
    };
  });
  return { preview, writtenIds };
}

// --- 2. BACKLOG: everything NOT written --------------------------------------

function buildBacklog(): BacklogEntry[] {
  const backlog: BacklogEntry[] = [];

  // (A) SabaiApps — the 72 "new" that were NOT approve_add_new (enrich/manual/geocoding)
  const decisions = readJson<any[]>('review-decisions-preview.json');
  for (const d of decisions) {
    if (d.decision === 'approve_add_new') continue; // these are the written 61
    let category: BacklogEntry['category']; let next: NextAction; let reason: string;
    if (d.decision === 'enrich_existing') { category = 'enrichment-candidate'; next = 'enrichment decision'; reason = 'SabaiApps record matches an existing gov mikvah (regional council under settlement name) — enriches it'; }
    else if (d.decision === 'geocoding_needed') { category = 'geocoding-needed'; next = 'manual coordinates'; reason = 'SabaiApps record has no coordinates — cannot place'; }
    else { category = 'manual-review'; next = 'manual review'; reason = `SabaiApps decision: ${d.decision}`; }
    backlog.push({ source: 'sabaiapps', city: d.city, name: d.name, reasonSkipped: reason, category, whatIsNeededNext: next, matchedId: d.matchedExisting?.id ?? null, detail: d.reason });
  }

  // (B) SabaiApps — the 48 Phase-2 NON-new (exact/probable/ambiguous/manual vs gov)
  const gov2 = readJson<any[]>('government-merge-analysis.json');
  for (const a of gov2) {
    if (a.classification === 'new_record') continue; // handled via Phase-5 decisions above
    let category: BacklogEntry['category']; let next: NextAction; let reason: string;
    if (a.classification === 'exact_match') { category = 'duplicate-conflict'; next = 'duplicate confirmation'; reason = 'SabaiApps record is an exact match of an existing gov mikvah'; }
    else if (a.classification === 'probable_match') { category = 'enrichment-candidate'; next = 'enrichment decision'; reason = 'SabaiApps record probably matches a gov mikvah — confirm, then enrich (coords/sourceUrl)'; }
    else { category = 'manual-review'; next = 'manual review'; reason = `SabaiApps vs gov: ${a.classification}`; }
    backlog.push({ source: 'sabaiapps', city: a.city, name: a.name, reasonSkipped: reason, category, whatIsNeededNext: next, matchedId: a.bestMatch?.govSourceId ?? null });
  }

  // (C) The 49 coordless municipal/א.ש בינה — from the Phase-10 geocoding outcome
  const geo = readJson<any[]>('coordless-geocoding-preview.json');
  for (const g of geo) {
    let category: BacklogEntry['category']; let next: NextAction; let reason: string;
    if (g.duplicate) { category = 'duplicate-conflict'; next = 'duplicate confirmation'; reason = `once placed (city-level), coincides with live ${g.duplicate.matchedId} (${g.duplicate.class})`; }
    else if (g.geocode.precision === 'city') { category = 'coordless-city-level'; next = 'address-level geocoding'; reason = 'only a city/settlement-center coordinate resolved (low confidence) — not write-ready'; }
    else { category = 'coordless-failed'; next = 'manual coordinates'; reason = 'geocoding failed (settlement/street not in Nominatim)'; }
    backlog.push({ source: g.sourceSystem, city: g.city, name: g.name, reasonSkipped: reason, category, whatIsNeededNext: next, matchedId: g.duplicate?.matchedId ?? null, detail: g.geocode.note });
  }

  // (D) Municipal Phase-6 + (E) א.ש בינה Phase-7 — the MATCHED (non-new) records
  const muni6 = readJson<any[]>('municipal-mikvah-merge-analysis.json');
  const asbina7 = readJson<any[]>('municipal-asbina-phase7-merge-analysis.json');
  for (const [rows, src] of [[muni6, 'municipal-phase6'], [asbina7, 'asbina-phase7']] as const) {
    for (const a of rows) {
      if (a.classification === 'new_record') continue; // those are coordless, handled in (C)
      let category: BacklogEntry['category']; let next: NextAction; let reason: string;
      if (a.classification === 'exact_match') { category = 'duplicate-conflict'; next = 'duplicate confirmation'; reason = 'municipal record exactly matches an existing record'; }
      else if (a.classification === 'probable_match') { category = 'enrichment-candidate'; next = 'enrichment decision'; reason = 'municipal record probably matches an existing record — confirm, then enrich (hours/balanit)'; }
      else { category = 'manual-review'; next = 'manual review'; reason = `municipal vs reference: ${a.classification}`; }
      backlog.push({ source: src, city: a.city, name: a.name, reasonSkipped: reason, category, whatIsNeededNext: next, matchedId: a.matchedId ?? null });
    }
  }

  return backlog;
}

function run(): void {
  const pkg = readJson<PkgRecord[]>('unified-new-mikveh-review-package.json');
  const { preview, writtenIds } = buildFirstWrite(pkg);
  const backlog = buildBacklog();

  const byCategory = backlog.reduce<Record<string, number>>((a, b) => { a[b.category] = (a[b.category] ?? 0) + 1; return a; }, {});
  const byNext = backlog.reduce<Record<string, number>>((a, b) => { a[b.whatIsNeededNext] = (a[b.whatIsNeededNext] ?? 0) + 1; return a; }, {});
  const bySource = backlog.reduce<Record<string, number>>((a, b) => { a[b.source] = (a[b.source] ?? 0) + 1; return a; }, {});
  const byCity = backlog.reduce<Record<string, number>>((a, b) => { const c = b.city ?? '?'; a[c] = (a[c] ?? 0) + 1; return a; }, {});

  const firstWriteSummary = {
    generatedNote: 'PHASE 11 — first-write apply PREVIEW (Tier A only). PREVIEW ONLY: no DB write, no publish. Awaiting human approval.',
    recordsInFirstWrite: preview.length,
    allSabaiApps: preview.every((p) => p.sourceSystem === 'sabaiapps'),
    allHaveCoordinates: preview.every((p) => p.place.location != null),
    fieldsDroppedOnWrite: 'NONE — B4 resolved: Place extended (mikvehGender, attendant, sourceUrl, sourceName, extra). All mikveh/provenance fields preserved.',
    publish: 'BLOCKED — awaiting explicit human GO + the Phase-9 approval checklist. No publish performed.',
  };

  const backlogSummary = {
    generatedNote: 'PHASE 11 — SKIPPED backlog. Every mikveh candidate NOT in the first write, with the next action needed. Nothing here is lost.',
    firstWriteCount: preview.length,
    totalSkipped: backlog.length,
    skippedByCategory: byCategory,
    skippedByNextAction: byNext,
    skippedBySource: bySource,
    topCitiesInBacklog: Object.fromEntries(Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 12)),
    accounting: {
      sabaiappsTotal: 120, sabaiappsWritten: preview.length, sabaiappsBacklog: backlog.filter((b) => b.source === 'sabaiapps').length,
      municipalPhase6Total: 71, municipalPhase6Backlog: backlog.filter((b) => b.source === 'municipal-phase6').length,
      asbinaPhase7Total: 59, asbinaPhase7Backlog: backlog.filter((b) => b.source === 'asbina-phase7').length,
      note: 'first write 61 (SabaiApps native-coord) + backlog covers the remaining 59 SabaiApps + all 71 municipal + all 59 א.ש בינה.',
    },
    nextActions: {
      'address-level geocoding': 'coordless city-level records → re-geocode with an Israeli street geocoder (GovMap/Google) to reach write-ready precision.',
      'manual coordinates': 'failed-geocoding + the SabaiApps geocoding-needed record → enter coordinates by hand (Waze/Maps).',
      'manual review': 'ambiguous / weak matches → human adjudication (same place vs distinct).',
      'enrichment decision': 'probable matches → confirm, then enrich the existing record (coords/sourceUrl/hours/balanit) instead of adding.',
      'duplicate confirmation': 'exact matches / post-geocode conflicts → confirm duplicate, then discard or enrich (never add).',
    },
    dryRun: true, liveDataTouched: false, publishPerformed: false,
  };

  writeFileSync(join(OUT, 'first-write-apply-preview.json'), JSON.stringify({ summary: firstWriteSummary, records: preview }, null, 2), 'utf8');
  writeFileSync(join(OUT, 'skipped-mikveh-backlog.json'), JSON.stringify(backlog, null, 2), 'utf8');
  writeFileSync(join(OUT, 'skipped-mikveh-backlog-summary.json'), JSON.stringify(backlogSummary, null, 2), 'utf8');

  console.log('=== Phase 11 first-write prep + backlog (preview only) ===');
  console.log(`first write (Tier A): ${preview.length} records | written ids: ${writtenIds.size}`);
  console.log(`backlog total: ${backlog.length}`);
  console.log(`  by category: ${JSON.stringify(byCategory)}`);
  console.log(`  by next action: ${JSON.stringify(byNext)}`);
  console.log(`  by source: ${JSON.stringify(bySource)}`);
  console.log('PUBLISH: BLOCKED — preview only, awaiting human approval.');
}

if (isMain(import.meta.url)) run();
