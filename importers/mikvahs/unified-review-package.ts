/**
 * Phase 8 — Unified NEW-mikveh review package (DRY-RUN, NO WRITES).
 *
 * Consolidates every high-confidence `add_new` candidate from:
 *   - Phase 5 (SabaiApps)         → review-decisions-preview.json (approve_add_new)
 *   - Phase 6 (Municipal א.ש בינה) → municipal-mikvah-merge-analysis.json (new_record)
 *   - Phase 7 (more א.ש בינה)      → municipal-asbina-phase7-merge-analysis.json (new_record)
 *
 * into ONE review package, deduplicated ACROSS sources, validated against the
 * Unified Importer rules. EXCLUDES ambiguous / manual_review / geocoding_needed /
 * enrich / match by construction (only add-class candidates are pulled).
 *
 * NOTHING is written to the DB, merged, geocoded, or published. The output is a
 * single consolidated staging file awaiting the FIRST human write-approval.
 *
 * Run:  node importers/mikvahs/unified-review-package.ts
 * Out:  output/unified-new-mikveh-review-package.json
 *       output/unified-new-mikveh-review-summary.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../shared/utils.ts';
import type { NormalizedImportRecord } from '../unified/schema/normalized-record.ts';
import { runValidation, type ValidationOutcome } from '../unified/pipeline/validation.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const readJson = <T>(f: string): T => JSON.parse(readFileSync(join(OUT, f), 'utf8')) as T;
const NOW = new Date().toISOString();
const BATCH_ID = `unified-new-mikveh-${NOW.slice(0, 10)}`;

type SourceSystem = 'sabaiapps' | 'municipal-phase6' | 'asbina-phase7';
interface Candidate { record: NormalizedImportRecord; sourceSystem: SourceSystem; confidence: number; }

// --- gather candidates from each phase --------------------------------------

function fromSabaiApps(): Candidate[] {
  const decisions = readJson<any[]>('review-decisions-preview.json').filter((d) => d.decision === 'approve_add_new');
  const staging = readJson<any[]>('sabaiapps-new-mikvahs-staging.json');
  const byKey = new Map(staging.map((s) => [`${s.sourceId}||${s.name}`, s]));
  const out: Candidate[] = [];
  for (const d of decisions) {
    const st = byKey.get(`${d.stagedRecord.sourceId}||${d.name}`);
    if (st?.record) out.push({ record: st.record, sourceSystem: 'sabaiapps', confidence: d.confidence ?? 0.9 });
  }
  return out;
}

function fromMunicipal(analysisFile: string, previewFile: string, sys: SourceSystem): Candidate[] {
  const news = readJson<any[]>(analysisFile).filter((a) => a.classification === 'new_record');
  const preview = readJson<NormalizedImportRecord[]>(previewFile);
  const byId = new Map(preview.map((r) => [r.provenance.sourceRecordId, r]));
  const out: Candidate[] = [];
  for (const a of news) {
    const rec = byId.get(a.sourceRecordId);
    if (rec) out.push({ record: rec, sourceSystem: sys, confidence: a.confidence ?? 0.8 });
  }
  return out;
}

// --- cross-source dedup ------------------------------------------------------

const sp = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-]/g, ' ').replace(/\s+/g, ' ').trim();
const normCity = (s: string | undefined): string => sp(String(s ?? ''));
const normName = (s: string | undefined): string => sp(String(s ?? '').replace(/מקוואות|מקואות|מקווה|מקוה|נשים|גברים|כלים|טהרת/g, ' '));
const digits = (s: string | undefined): string => { const d = String(s ?? '').replace(/\D/g, ''); return d.length > 10 ? d.slice(-10) : d; };
function houseNum(addr: string | undefined, city: string): string {
  let s = sp(String(addr ?? '')).replace(/\b(ישראל|israel)\b/gi, ' ');
  for (const c of normCity(city).split(' ')) s = s.split(' ').filter((t) => t !== c).join(' ');
  const h = s.split(/\s+/).find((t) => /^\d+/.test(t));
  return h ? h.replace(/\D/g, '') : '';
}

const genderOf = (r: NormalizedImportRecord): string =>
  ((r.extra as any)?.gender as string) ?? r.tags?.find((t) => t.startsWith('gender:'))?.slice(7) ?? 'לא צוין';

/**
 * Dedup keys are GENDER-SCOPED: women / men / vessel facilities at one building
 * are distinct entries (different hours/entrance), so they must NOT collapse.
 * The goal is to catch the SAME mikvah appearing in TWO source systems.
 */
function dedupKeys(c: Candidate): string[] {
  const r = c.record;
  const city = normCity(r.cityHint);
  const g = genderOf(r);
  const keys: string[] = [`${city}|${normName(r.name)}|${houseNum(r.address, r.cityHint ?? '')}|${g}`];
  const ph = digits(r.phone);
  if (ph.length >= 9) keys.push(`phone|${g}|${ph}`);
  return keys;
}

interface DupGroup { kept: string; dropped: string; key: string; }

function run(): void {
  const candidates: Candidate[] = [
    ...fromSabaiApps(),
    ...fromMunicipal('municipal-mikvah-merge-analysis.json', 'municipal-mikvah-preview.json', 'municipal-phase6'),
    ...fromMunicipal('municipal-asbina-phase7-merge-analysis.json', 'municipal-asbina-phase7-preview.json', 'asbina-phase7'),
  ];
  const inputBySource: Record<string, number> = {};
  for (const c of candidates) inputBySource[c.sourceSystem] = (inputBySource[c.sourceSystem] ?? 0) + 1;

  // cross-source dedup: first candidate wins; later collisions are recorded.
  const seen = new Map<string, Candidate>();
  const unique: Candidate[] = [];
  const crossDuplicates: DupGroup[] = [];
  for (const c of candidates) {
    const keys = dedupKeys(c);
    const hit = keys.map((k) => seen.get(k)).find(Boolean);
    if (hit) { crossDuplicates.push({ kept: hit.record.id, dropped: c.record.id, key: keys[0] }); continue; }
    unique.push(c);
    for (const k of keys) if (!seen.has(k)) seen.set(k, c);
  }

  // validate every unique record
  const staged = unique.map((c, i) => {
    const v: ValidationOutcome = runValidation(c.record);
    return {
      stagingId: `${BATCH_ID}#${i}`,
      batchId: BATCH_ID,
      sourceSystem: c.sourceSystem,
      sourceId: c.record.provenance.sourceId,
      importDecision: 'add_new' as const,
      status: v.ok ? ('pending_review' as const) : ('rejected' as const),
      confidence: c.confidence,
      // flat view
      type: c.record.type,
      name: c.record.name,
      city: c.record.cityHint ?? null,
      address: c.record.address ?? null,
      hasCoordinates: c.record.location != null,
      phone: c.record.phone ?? null,
      openingHours: c.record.openingHours ?? null,
      gender: (c.record.extra as any)?.gender ?? (c.record.tags?.find((t) => t.startsWith('gender:'))?.slice(7)) ?? null,
      balanit: (c.record.extra as any)?.balanit ?? null,
      sourceUrl: c.record.provenance.sourceUrl ?? null,
      record: c.record,
      validation: v,
    };
  });

  const errors = staged.filter((s) => !s.validation.ok);
  const warnings = staged.flatMap((s) => s.validation.issues.filter((i) => i.severity === 'warning'));
  const warnByRule: Record<string, number> = {};
  for (const w of warnings) warnByRule[w.rule] = (warnByRule[w.rule] ?? 0) + 1;

  const byCity: Record<string, number> = {};
  for (const s of staged) byCity[s.city ?? '?'] = (byCity[s.city ?? '?'] ?? 0) + 1;
  const bySourceSystem: Record<string, number> = {};
  for (const s of staged) bySourceSystem[s.sourceSystem] = (bySourceSystem[s.sourceSystem] ?? 0) + 1;

  const cov = (() => {
    const n = staged.length || 1;
    const pct = (f: (s: (typeof staged)[number]) => unknown) => Math.round((staged.filter((s) => { const v = f(s); return v != null && String(v).trim() !== ''; }).length / n) * 100);
    return { name: pct((s) => s.name), city: pct((s) => s.city), address: pct((s) => s.address), coordinates: pct((s) => (s.hasCoordinates ? '1' : '')), phone: pct((s) => s.phone), openingHours: pct((s) => s.openingHours), gender: pct((s) => s.gender), balanit: pct((s) => s.balanit) };
  })();

  const GOV_CANONICAL = 606;
  const uniqueAdds = staged.filter((s) => s.status === 'pending_review').length;

  const summary = {
    generatedNote: 'PHASE 8 DRY-RUN — consolidated NEW-mikveh review package. No DB write, no publish, no merge, no geocoding. Awaiting first human write-approval.',
    batchId: BATCH_ID,
    canonicalType: 'mikveh',
    totalInputCandidates: candidates.length,
    inputBySource,
    crossSourceDuplicates: crossDuplicates.length,
    crossSourceDuplicateDetail: crossDuplicates,
    uniqueAddCandidates: unique.length,
    readyForReview: uniqueAdds,
    validationRejected: errors.length,
    excludedUpstreamNote: 'ambiguous / manual_review / geocoding_needed / enrich / match were excluded UPSTREAM (only add-class candidates pulled): Phase-5 also held 1 geocoding_needed + 5 enrich + 5 manual; Phase-6/7 held their matches/probables.',
    bySourceSystem,
    recordsByCity: byCity,
    fieldCoverage: cov,
    validation: { validatedAgainst: 'unified/pipeline/validation.ts runValidation', passed: staged.length - errors.length, rejected: errors.length, warnings: warnings.length, warningsByRule: warnByRule },
    coverageNote: 'No native coordinates for the municipal/א.ש בינה records → field coverage for coordinates reflects SabaiApps only; geocoding is a later gate, not part of this package.',
    nationalCoverage: { govCanonical: GOV_CANONICAL, uniqueNewAdded: uniqueAdds, estimatedTotalAfterAdding: GOV_CANONICAL + uniqueAdds },
    nextStep: {
      action: 'FIRST REAL WRITE APPROVAL',
      detail: `Human reviewer approves this batch (${uniqueAdds} records) → records transition pending_review → approved. Only AFTER approval does a separate, explicit publish step write them additively to the live places dataset (with mikveh PlaceType enabled). Recommended order: (1) reviewer spot-checks the package, (2) approve, (3) enable 'mikveh' in app PlaceType, (4) publish the approved batch additively, (5) THEN process the held enrich/manual/geocoding-needed items and the national aggregators.`,
    },
    dryRun: true, liveDataTouched: false, publishPerformed: false,
  };

  writeFileSync(join(OUT, 'unified-new-mikveh-review-package.json'), JSON.stringify(staged, null, 2), 'utf8');
  writeFileSync(join(OUT, 'unified-new-mikveh-review-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 8 unified new-mikveh review package (dry-run) ===');
  console.log(`input=${candidates.length} (${JSON.stringify(inputBySource)})`);
  console.log(`cross-source duplicates=${crossDuplicates.length} | unique add candidates=${unique.length} | ready for review=${uniqueAdds}`);
  console.log(`validation: ${summary.validation.passed} ok, ${errors.length} rejected, ${warnings.length} warnings`);
  console.log(`estimated national total after adding: ${GOV_CANONICAL} + ${uniqueAdds} = ${GOV_CANONICAL + uniqueAdds}`);
}

if (isMain(import.meta.url)) run();
