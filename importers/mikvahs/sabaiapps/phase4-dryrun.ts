/**
 * Phase 4 — Full Unified-Importer DRY-RUN for the 72 staged SabaiApps mikveh
 * records.
 *
 * Replays the staged records through the REAL `runImport` orchestrator, one
 * source at a time (16 simulated council registry entries), exercising the
 * production path:  ingested → validated → geocoded → deduplicated → pending_review.
 *
 * Offline-safe & additive-only:
 *   - the adapter `fetch` reads the local staging file (NO network),
 *   - geocoding uses the offline `NullGeocoder` (records WITH native coords are
 *     skipped by the orchestrator; the 1 missing-coords record gets a 'failed'
 *     geocode outcome = deferred, no external call),
 *   - deduplication runs against the existing live mikveh places preview
 *     (places.mikvahs.app.json), cross-live,
 *   - dryRun:true → NOTHING is persisted or published; terminus is pending_review.
 *
 * Run:  node importers/mikvahs/sabaiapps/phase4-dryrun.ts
 * Out:  output/sabaiapps-unified-dryrun.json
 *       output/sabaiapps-unified-dryrun-summary.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../../shared/utils.ts';
import type { GeoPoint } from '../../shared/types.ts';
import type { NormalizedImportRecord } from '../../unified/schema/normalized-record.ts';
import type { SourceRegistryEntry } from '../../unified/schema/source-registry.ts';
import type {
  AdapterContext, AdapterDescription, RawFetchResult, SourceAdapter,
} from '../../unified/adapters/contract.ts';
import type { DuplicateCandidate } from '../../unified/pipeline/duplicate-detection.ts';
import { GeoNameDuplicateDetector } from '../../unified/pipeline/duplicate-detection.ts';
import { NullGeocoder } from '../../unified/pipeline/geocoding.ts';
import { runImport, type RunImportResult } from '../../unified/orchestrator.ts';
import { reviewReason } from '../../unified/pipeline/review.ts';
import { MIKVAH_COUNCILS } from './sources.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'output');
const readJson = <T>(f: string): T => JSON.parse(readFileSync(join(OUT, f), 'utf8')) as T;
const NOW = new Date().toISOString();
const ADAPTER_ID = 'sabaiapps-mikvah-v1';

/** Minimal shape we read from the Phase-3 staging file. */
interface StagedInput {
  sourceId: string;
  city: string;
  sourceName: string;
  newnessConfidence: number;
  record: NormalizedImportRecord;
}

/** Live mikveh app place (places.mikvahs.app.json). */
interface AppPlace {
  id: string; name: string; type: string; address?: string;
  location: GeoPoint; phone?: string;
}

/**
 * Offline adapter that replays pre-normalized staged records for ONE source.
 * `fetch` reads from the in-memory staging list filtered by the source id —
 * never touches the network.
 */
class StagingReplayAdapter implements SourceAdapter {
  readonly id = ADAPTER_ID;
  private readonly staged: StagedInput[];
  constructor(staged: StagedInput[]) {
    this.staged = staged;
  }
  describe(): AdapterDescription {
    return { id: this.id, kind: 'council-website', produces: ['mikveh'], summary: 'SabaiApps mikvah directory replay (offline)' };
  }
  async fetch(ctx: AdapterContext): Promise<RawFetchResult> {
    const items = this.staged.filter((s) => s.sourceId === ctx.source.id);
    return { items, fetchedFrom: ctx.source.url, fetchedAt: NOW };
  }
  normalize(rawItem: unknown): NormalizedImportRecord[] {
    return [(rawItem as StagedInput).record];
  }
}

/** Build a simulated registry entry for one council source. */
function registryEntry(sourceId: string, staged: StagedInput[]): SourceRegistryEntry {
  const councilId = sourceId.replace(/^council:/, '').replace(/:mikvah$/, '');
  const src = MIKVAH_COUNCILS[councilId];
  const mine = staged.filter((s) => s.sourceId === sourceId);
  const trust = mine.length
    ? Number((mine.reduce((a, s) => a + s.newnessConfidence, 0) / mine.length).toFixed(2))
    : 0.9;
  return {
    id: sourceId,
    displayName: `${src?.council ?? sourceId} — מקוואות`,
    kind: 'council-website',
    adapterId: ADAPTER_ID,
    status: 'active', // simulated active so the dry-run is a legal pipeline run
    produces: ['mikveh'],
    url: src?.directoryUrl,
    domain: src?.domain,
    license: { id: 'public-council', attributionRequired: true, attributionText: src?.council },
    trust,
    robots: { checked: true, allowed: true, checkedAt: NOW.slice(0, 10) },
    estimatedRecordCount: mine.length,
    notes: 'SabaiApps Directories Pro /directory-mikvah/ (post type mikvah_dir_ltg); needs-variant per discovery catalog. SIMULATED entry (not persisted to a real registry).',
  };
}

async function run(): Promise<void> {
  const staged = readJson<StagedInput[]>('sabaiapps-new-mikvahs-staging.json');
  const appPlaces = readJson<AppPlace[]>('places.mikvahs.app.json');

  // cross-live dedup candidates = existing mikveh places (gov-derived)
  const candidates: DuplicateCandidate[] = appPlaces
    .filter((p) => p.type === 'mikveh' && p.location)
    .map((p) => ({ id: p.id, name: p.name, type: 'mikveh', location: p.location, address: p.address, phone: p.phone, source: 'datagov' }));

  const adapter = new StagingReplayAdapter(staged);
  const detector = new GeoNameDuplicateDetector();
  const geocoder = new NullGeocoder();

  const sourceIds = [...new Set(staged.map((s) => s.sourceId))];
  const registry = sourceIds.map((id) => registryEntry(id, staged));

  const results: RunImportResult[] = [];
  for (const source of registry) {
    const res = await runImport(adapter, {
      source,
      batchId: `p4-${source.id.replace(/[^a-z0-9]+/gi, '-')}`,
      now: NOW,
      dryRun: true,           // nothing persisted, nothing published
      geocode: true,          // skips records with native coords; defers the 1 missing
      geocoder,               // offline NullGeocoder → no external geocoding
      detector,
      candidates,             // cross-live dedup against existing mikveh places
    });
    results.push(res);
  }

  // --- aggregate per-record outcomes ---
  const perRecord = results.flatMap((res) =>
    [...res.staged, ...res.rejected].map((s) => {
      const dup = s.duplicate;
      return {
        stagingId: s.stagingId,
        sourceId: s.sourceId,
        name: s.record.name,
        city: s.record.cityHint,
        status: s.status,
        validationOk: s.validation?.ok ?? null,
        hadNativeCoords: s.record.location != null,
        geocode: s.geocode ? { precision: s.geocode.precision, resolved: s.geocode.location != null } : 'skipped (native coords)',
        duplicateClass: dup?.class ?? null,
        duplicate: dup && dup.class !== 'new'
          ? { matchedId: dup.matchedId, matchedName: dup.matchedName, distanceM: dup.distanceM, nameSimilarity: dup.nameSimilarity, suspicious: dup.suspicious ?? false }
          : null,
        reviewReason: s.status === 'pending_review' ? reviewReason(s) : null,
        outcome: s.status === 'rejected' ? 'rejected' : (reviewReason(s) ? 'needs_review' : 'auto_approvable'),
      };
    }),
  );

  const totals = results.reduce(
    (a, r) => {
      a.fetched += r.stats.fetched; a.normalized += r.stats.normalized; a.validated += r.stats.validated;
      a.rejected += r.stats.rejected; a.geocoded += r.stats.geocoded; a.matches += r.stats.matches;
      a.conflicts += r.stats.conflicts; a.newRecords += r.stats.newRecords;
      a.needsReview += r.stats.needsReview; a.autoApprovable += r.stats.autoApprovable;
      return a;
    },
    { fetched: 0, normalized: 0, validated: 0, rejected: 0, geocoded: 0, matches: 0, conflicts: 0, newRecords: 0, needsReview: 0, autoApprovable: 0 },
  );

  const geocodingNeeded = perRecord.filter((p) => !p.hadNativeCoords).length;
  const geocodingSkipped = perRecord.filter((p) => p.hadNativeCoords).length;
  const duplicatesSuspected = perRecord.filter((p) => p.duplicate != null).length;
  // a coordless record cannot be deduplicated yet → its 'new' verdict is provisional.
  const provisionalNewAwaitingGeocode = perRecord.filter((p) => !p.hadNativeCoords && p.duplicateClass === 'new').length;
  // cross-live dedup recovered matches Phase-2 missed (esp. regional councils that
  // key the council name as the city while gov stores per-settlement names).
  const flaggedByCity: Record<string, number> = {};
  for (const p of perRecord) if (p.duplicate) flaggedByCity[p.city ?? '?'] = (flaggedByCity[p.city ?? '?'] ?? 0) + 1;
  const pendingReview = perRecord.filter((p) => p.status === 'pending_review').length;
  const reviewQueueCount = totals.needsReview;
  const warnings = results.flatMap((r) => [...r.staged, ...r.rejected])
    .flatMap((s) => (s.validation?.issues ?? []).filter((i) => i.severity === 'warning'));
  const warningsByRule: Record<string, number> = {};
  for (const w of warnings) warningsByRule[w.rule] = (warningsByRule[w.rule] ?? 0) + 1;

  const dryrun = {
    batches: results.map((r) => ({ id: r.batch.id, source: r.batch.sourceId, records: r.batch.recordCount, note: r.batch.note })),
    sourceRegistry: registry.map((e) => ({ id: e.id, displayName: e.displayName, kind: e.kind, status: e.status, produces: e.produces, trust: e.trust, estimatedRecordCount: e.estimatedRecordCount, simulated: true })),
    records: perRecord,
  };

  const summary = {
    generatedNote: 'PHASE 4 DRY-RUN — full unified pipeline replay. No DB write, no publish, no overwrite of government records, additive-only. Terminus = pending_review.',
    pipelineFlow: 'ingested → validated → geocoded → deduplicated → pending_review',
    canonicalType: 'mikveh',
    inputRecords: staged.length,
    validatedRecords: totals.validated,
    rejectedRecords: totals.rejected,
    geocoding: {
      strategy: 'offline NullGeocoder (no external calls)',
      skippedHadNativeCoords: geocodingSkipped,
      neededMissingCoords: geocodingNeeded,
      resolvedNow: totals.geocoded,
      note: geocodingNeeded > 0
        ? `${geocodingNeeded} record(s) lack coordinates; deferred to a later geocoding gate (NullGeocoder returned 'failed' offline). No external geocoding performed.`
        : 'every record had native coordinates.',
    },
    deduplication: {
      crossLiveChecked: true,
      candidatePool: candidates.length,
      candidateSource: 'places.mikvahs.app.json (existing gov-derived mikveh places)',
      duplicatesSuspected,
      matches: totals.matches,
      conflicts: totals.conflicts,
      newRecords: totals.newRecords,
    },
    notableFindings: {
      crossLiveRecoveredMatches: duplicatesSuspected,
      flaggedByCity,
      interpretation: 'Cross-live geo-dedup flagged records Phase-2 had called new_record. These concentrate in the regional council Merhavim (and a few in Lod/Beit-Shean): Phase 2 keyed the council name as city, but the gov dataset stores these mikvahs under SETTLEMENT names (מושב גילת, מושב מסלול…). They are likely ENRICHMENT candidates, not new — the review queue resolves them.',
      provisionalNewAwaitingGeocode,
      provisionalNote: provisionalNewAwaitingGeocode > 0
        ? `${provisionalNewAwaitingGeocode} record(s) lack coordinates and were classified 'new' only because they could not be deduplicated; this is PROVISIONAL until geocoded.`
        : 'no provisional-new records.',
    },
    pendingReviewCandidates: pendingReview,
    reviewQueue: reviewQueueCount,
    autoApprovable: totals.autoApprovable,
    warnings: warnings.length,
    warningsByRule,
    sourceRegistryStatus: {
      councilsRegistered: registry.length,
      kind: 'council-website',
      produces: ['mikveh'],
      simulated: true,
      note: `${registry.length} council sources (those contributing new_record candidates) simulated as active registry entries for the run; the full SabaiApps mikvah family is 16. Not persisted to a durable source_registry.`,
    },
    readiness: {
      allReachedPendingReview: pendingReview === staged.length,
      readyForManualReview: totals.rejected === 0 && pendingReview === staged.length,
      note: totals.rejected === 0
        ? `All ${pendingReview} records passed validation + dedup and are in pending_review, ready for the manual review queue.`
        : `${totals.rejected} record(s) were rejected at validation and did not reach pending_review.`,
    },
    dryRun: true,
    liveDataTouched: false,
    publishPerformed: false,
  };

  writeFileSync(join(OUT, 'sabaiapps-unified-dryrun.json'), JSON.stringify(dryrun, null, 2), 'utf8');
  writeFileSync(join(OUT, 'sabaiapps-unified-dryrun-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 4 unified dry-run ===');
  console.log(`sources=${registry.length} input=${staged.length} validated=${totals.validated} rejected=${totals.rejected}`);
  console.log(`geocode: skipped(native)=${geocodingSkipped} needed=${geocodingNeeded} resolved=${totals.geocoded}`);
  console.log(`dedup vs ${candidates.length} live: new=${totals.newRecords} match=${totals.matches} conflict=${totals.conflicts} suspected=${duplicatesSuspected}`);
  console.log(`pending_review=${pendingReview} reviewQueue=${reviewQueueCount} autoApprovable=${totals.autoApprovable} warnings=${warnings.length}`);
  console.log(`readyForManualReview=${summary.readiness.readyForManualReview}`);
}

if (isMain(import.meta.url)) void run();
