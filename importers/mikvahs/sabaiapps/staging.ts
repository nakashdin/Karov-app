/**
 * Phase 3 — Stage the SabaiApps "new_record" mikvahs into the Unified Importer
 * staging/review format (DRY-RUN, STAGING ONLY).
 *
 * Takes the 72 records classified `new_record` by the Phase-2 merge analysis and
 * maps them to the unified `NormalizedImportRecord`, validates each with the
 * existing `runValidation`, and writes a staging file + summary. It NEVER writes
 * to production, NEVER overwrites government records, NEVER merges, and EXCLUDES
 * every non-new class (exact/probable/ambiguous/manual). No geocoding.
 *
 * TYPE DECISION: the app's canonical `ImportType` and the unified validator both
 * use 'mikveh'. SabaiApps preview tags records 'mikvah'. We map mikvah → mikveh
 * here so staged records are valid against the existing pipeline. (Documented in
 * the summary.)
 *
 * Run:  node importers/mikvahs/sabaiapps/staging.ts
 * Out:  output/sabaiapps-new-mikvahs-staging.json
 *       output/sabaiapps-new-mikvahs-staging-summary.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../../shared/utils.ts';
import type { ImportType } from '../../shared/types.ts';
import {
  makeRecordId, type Confidence, type NormalizedImportRecord,
} from '../../unified/schema/normalized-record.ts';
import { runValidation, type ValidationOutcome } from '../../unified/pipeline/validation.ts';
import { MIKVAH_COUNCILS, type MikvahCouncilPlace, type MikvahCouncilSource } from './sources.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'output');
const readJson = <T>(f: string): T => JSON.parse(readFileSync(join(OUT, f), 'utf8')) as T;

/** Canonical app/importer type. SabaiApps 'mikvah' is normalized to this. */
const CANONICAL_TYPE: ImportType = 'mikveh';
const ADAPTER_ID = 'sabaiapps-mikvah-v1';
const NOW = new Date().toISOString();
const BATCH_ID = `sabaiapps-mikvah-new-${NOW.slice(0, 10)}`;

/** Minimal shape we need from the Phase-2 merge analysis. */
interface MergeRow {
  sabSourceId: string;
  classification: 'exact_match' | 'probable_match' | 'new_record' | 'ambiguous' | 'requires_manual_review';
  confidence: number;
  cityInGov: boolean;
}

const confLevel = (n: number): Confidence => (n >= 0.9 ? 'high' : n >= 0.7 ? 'medium' : 'low');

/** city → council source (city is unique across the 16 SabaiApps councils). */
const SOURCE_BY_CITY: Map<string, MikvahCouncilSource> = new Map(
  Object.values(MIKVAH_COUNCILS).map((s) => [s.city, s]),
);

/** One staged record: the unified record + validation + the requested flat view. */
interface StagedMikvah {
  stagingId: string;
  batchId: string;
  sourceId: string;
  status: 'ingested' | 'rejected';
  importDecision: 'add_new_candidate';
  // --- requested flat view (human-readable) ---
  type: ImportType;
  name: string;
  city: string;
  address: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  locationPrecision: 'exact' | 'none';
  phone: string | null;
  openingHours: string | null;
  category: string | null; // gender: גברים / נשים / כלים
  balanit: string | null;   // attendant
  sourceUrl: string | null;
  sourceName: string;
  newnessConfidence: number;
  confidence: Confidence;
  raw: Record<string, unknown>;
  // --- the unified pipeline record + its validation ---
  record: NormalizedImportRecord;
  validation: ValidationOutcome;
  history: { from: null; to: 'ingested'; at: string; by: 'pipeline' }[];
}

function buildStaged(sab: MikvahCouncilPlace, merge: MergeRow): StagedMikvah {
  const source = SOURCE_BY_CITY.get(sab.city);
  const sourceRegistryId = source ? `council:${source.id}:mikvah` : 'council:unknown:mikvah';
  const sourceName = sab.council;
  const raw = sab.raw ?? {};
  const balanit = (raw as Record<string, unknown>).balanit as string | undefined;
  const hopePhone = (raw as Record<string, unknown>).hopePhone as string | undefined;
  const hasCoords = sab.lat != null && sab.lng != null;

  const extra: Record<string, unknown> = {
    council: sab.council,
    sourceVariant: sab.variant,
    locationPrecision: sab.locationPrecision,
    newnessConfidence: merge.confidence,
    cityInGov: merge.cityInGov,
    classification: 'new_record',
  };
  if (sab.category) extra.gender = sab.category;
  if (balanit) extra.balanit = balanit;
  if (hopePhone) extra.hopePhone = hopePhone;
  if ((raw as Record<string, unknown>).fields) extra.sourceFields = (raw as Record<string, unknown>).fields;

  const record: NormalizedImportRecord = {
    id: makeRecordId(sourceRegistryId, sab.sourceId),
    type: CANONICAL_TYPE, // mikvah → mikveh
    name: sab.name,
    ...(sab.address ? { address: sab.address } : {}),
    cityHint: sab.city,
    ...(hasCoords ? { location: { latitude: sab.lat as number, longitude: sab.lng as number } } : {}),
    ...(sab.phone ? { phone: sab.phone } : {}),
    ...(sab.openingHours ? { openingHours: sab.openingHours } : {}),
    ...(sab.category ? { tags: [`gender:${sab.category}`] } : {}),
    confidence: confLevel(merge.confidence),
    provenance: {
      sourceId: sourceRegistryId,
      adapterId: ADAPTER_ID,
      sourceRecordId: sab.sourceId,
      ...(sab.sourceUrl ? { sourceUrl: sab.sourceUrl } : {}),
      fetchedAt: sab.verifiedAt,
      raw,
    },
    extra,
  };

  const validation = runValidation(record);

  return {
    stagingId: `stg-${record.id}`,
    batchId: BATCH_ID,
    sourceId: sourceRegistryId,
    // Mirror the pipeline's first gate: only records that pass automated
    // validation enter staging as 'ingested'; hard errors are 'rejected'.
    status: validation.ok ? 'ingested' : 'rejected',
    importDecision: 'add_new_candidate',
    type: CANONICAL_TYPE,
    name: sab.name,
    city: sab.city,
    address: sab.address ?? null,
    coordinates: hasCoords ? { latitude: sab.lat as number, longitude: sab.lng as number } : null,
    locationPrecision: sab.locationPrecision,
    phone: sab.phone ?? null,
    openingHours: sab.openingHours ?? null,
    category: sab.category ?? null,
    balanit: balanit ?? null,
    sourceUrl: sab.sourceUrl ?? null,
    sourceName,
    newnessConfidence: merge.confidence,
    confidence: confLevel(merge.confidence),
    raw,
    record,
    validation,
    history: [{ from: null, to: 'ingested', at: NOW, by: 'pipeline' }],
  };
}

function run(): void {
  const merge = readJson<MergeRow[]>('government-merge-analysis.json');
  const preview = readJson<MikvahCouncilPlace[]>('sabaiapps-mikvah-preview.json');
  const previewById = new Map(preview.map((p) => [p.sourceId, p]));

  const newRows = merge.filter((m) => m.classification === 'new_record');
  const excludedRows = merge.filter((m) => m.classification !== 'new_record');

  const staged: StagedMikvah[] = [];
  for (const m of newRows) {
    const sab = previewById.get(m.sabSourceId);
    if (!sab) continue; // defensive: a new_record without its source record
    staged.push(buildStaged(sab, m));
  }

  // --- aggregates ---
  const withCoords = staged.filter((s) => s.coordinates != null).length;
  const byCity: Record<string, number> = {};
  for (const s of staged) byCity[s.city] = (byCity[s.city] ?? 0) + 1;

  const fieldCoverage = (() => {
    const n = staged.length || 1;
    const pct = (f: (s: StagedMikvah) => unknown) =>
      Math.round((staged.filter((s) => { const v = f(s); return v != null && String(v).trim() !== ''; }).length / n) * 100);
    return {
      name: pct((s) => s.name), city: pct((s) => s.city), address: pct((s) => s.address),
      coordinates: pct((s) => s.coordinates), phone: pct((s) => s.phone),
      openingHours: pct((s) => s.openingHours), category: pct((s) => s.category),
      balanit: pct((s) => s.balanit), sourceUrl: pct((s) => s.sourceUrl),
    };
  })();

  const errorRecords = staged.filter((s) => !s.validation.ok);
  const warningIssues = staged.flatMap((s) => s.validation.issues.filter((i) => i.severity === 'warning'));
  const warningsByRule: Record<string, number> = {};
  for (const w of warningIssues) warningsByRule[w.rule] = (warningsByRule[w.rule] ?? 0) + 1;

  const excludedByClass: Record<string, number> = {};
  for (const e of excludedRows) excludedByClass[e.classification] = (excludedByClass[e.classification] ?? 0) + 1;

  const summary = {
    generatedNote: 'PHASE 3 DRY-RUN — staging only. No production write, no merge, no overwrite of government records, no geocoding. Additive new-candidate staging.',
    typeDecision: {
      sabaiAppsType: 'mikvah',
      canonicalType: CANONICAL_TYPE,
      rule: "Mapped 'mikvah' → 'mikveh' because the app ImportType and the unified validator (VALID_TYPES) both use 'mikveh'. SabaiApps spelling is preserved in raw/provenance.",
    },
    batchId: BATCH_ID,
    adapterId: ADAPTER_ID,
    importDecision: 'add_new_candidate',
    inputRecords: merge.length,
    newRecordCandidates: newRows.length,
    stagedRecords: staged.length,
    excludedRecords: excludedRows.length,
    excludedByClassification: excludedByClass,
    recordsWithCoordinates: withCoords,
    recordsWithoutCoordinates: staged.length - withCoords,
    recordsByCity: byCity,
    fieldCoverage,
    validation: {
      validatedAgainst: 'unified/pipeline/validation.ts runValidation (defaultRules)',
      passed: staged.length - errorRecords.length,
      failedWithErrors: errorRecords.length,
      errorSamples: errorRecords.slice(0, 10).map((s) => ({ stagingId: s.stagingId, issues: s.validation.issues.filter((i) => i.severity === 'error') })),
      warnings: warningIssues.length,
      warningsByRule,
    },
    readiness: {
      stagingStatus: 'ingested',
      nextGate: 'geocoding → deduplicated → pending_review',
      readyForReview: errorRecords.length === 0,
      note: errorRecords.length === 0
        ? 'All staged records passed automated validation; ready to enter the review queue (geocoding is a separate later gate).'
        : `${errorRecords.length} record(s) failed validation and are staged as 'rejected' — fix before review.`,
    },
    dryRun: true,
    liveDataTouched: false,
  };

  writeFileSync(join(OUT, 'sabaiapps-new-mikvahs-staging.json'), JSON.stringify(staged, null, 2), 'utf8');
  writeFileSync(join(OUT, 'sabaiapps-new-mikvahs-staging-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 3 staging (dry-run) ===');
  console.log(`input=${merge.length} staged=${staged.length} excluded=${excludedRows.length} (${JSON.stringify(excludedByClass)})`);
  console.log(`coords: ${withCoords}/${staged.length} | validation: ${summary.validation.passed} ok, ${errorRecords.length} errors, ${warningIssues.length} warnings`);
  console.log(`type decision: mikvah → ${CANONICAL_TYPE} | readyForReview=${summary.readiness.readyForReview}`);
}

if (isMain(import.meta.url)) run();
