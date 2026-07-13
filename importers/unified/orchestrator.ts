/**
 * Orchestrator — wires one source through the whole unified pipeline:
 *
 *   adapter.fetch → adapter.normalize → validation → (optional) geocoding →
 *   duplicate detection → import_staging → review queue items
 *
 * It is the ONLY component that drives a run, and it is offline-safe by
 * construction:
 *   - the only network call is `adapter.fetch`; with the in-memory test adapter
 *     (and any other offline adapter) nothing leaves the process,
 *   - geocoding defaults to `NullGeocoder` (never hits the network),
 *   - it NEVER writes to production `places` — the terminus is `pending_review`
 *     staging entries + a review queue. Publishing is a separate, later step.
 *
 * Determinism: `now`, `batchId`, geocoder, detector and candidates are all
 * injected — no hidden clock, no randomness, so a run is fully reproducible.
 */
import type { NormalizedImportRecord } from './schema/normalized-record.ts';
import type { SourceRegistryEntry } from './schema/source-registry.ts';
import type { ImportBatch, StagedRecord } from './schema/import-staging.ts';
import { stageRecord, transition } from './schema/import-staging.ts';
import type { ValidationRule } from './pipeline/validation.ts';
import { runValidation } from './pipeline/validation.ts';
import type { DuplicateCandidate, DuplicateDetector } from './pipeline/duplicate-detection.ts';
import { GeoNameDuplicateDetector } from './pipeline/duplicate-detection.ts';
import type { Geocoder } from './pipeline/geocoding.ts';
import { NullGeocoder } from './pipeline/geocoding.ts';
import type { ReviewQueueItem } from './pipeline/review.ts';
import { reviewReason } from './pipeline/review.ts';
import type { AdapterContext, SourceAdapter } from './adapters/contract.ts';

/** Optional persistence sink for staged records. */
export interface StagingStore {
  put(record: StagedRecord): void;
  all(): StagedRecord[];
}

/** Trivial in-memory store implementing the `StagingStore` contract. */
export class MemoryStagingStore implements StagingStore {
  private readonly records: StagedRecord[] = [];
  put(record: StagedRecord): void {
    this.records.push(record);
  }
  all(): StagedRecord[] {
    return [...this.records];
  }
}

export interface RunImportOptions {
  /** The registry entry being imported (handed to the adapter as context). */
  source: SourceRegistryEntry;
  /** Deterministic batch id (also the prefix of every staging id). */
  batchId: string;
  /** ISO timestamp stamped on the batch and every transition. */
  now: string;
  /**
   * Dry-run (default true): run the full pipeline but write NOTHING to `store`.
   * The in-memory result is always returned regardless.
   */
  dryRun?: boolean;
  /** Resolve missing coordinates. Default false; geocoder default NullGeocoder. */
  geocode?: boolean;
  geocoder?: Geocoder;
  /** Strategy + existing records to dedupe against (default: empty candidates). */
  detector?: DuplicateDetector;
  candidates?: DuplicateCandidate[];
  /** Validation rules (default: the pipeline's `defaultRules`). */
  validationRules?: ValidationRule[];
  /** Sink for staged records; only written when `dryRun` is false. */
  store?: StagingStore;
  /** Cooperative cancellation, forwarded to the adapter. */
  signal?: AbortSignal;
  /** Log sink; defaults to console.log. */
  log?: (message: string) => void;
}

export interface RunImportStats {
  fetched: number;
  normalized: number;
  validated: number;
  rejected: number;
  geocoded: number;
  matches: number;
  conflicts: number;
  newRecords: number;
  needsReview: number;
  autoApprovable: number;
}

export interface RunImportResult {
  batch: ImportBatch;
  /** Every record that passed validation, now in `pending_review`. */
  staged: StagedRecord[];
  /** Records that failed automated validation (status `rejected`). */
  rejected: StagedRecord[];
  /** Pending-review records that need a human decision. */
  reviewQueue: ReviewQueueItem[];
  /** Clean new records with no conflict — safe to auto-approve later. */
  autoApprovable: StagedRecord[];
  stats: RunImportStats;
  dryRun: boolean;
}

/** First error message from a validation outcome, for the rejection reason. */
function firstError(staged: StagedRecord): string | undefined {
  return staged.validation?.issues.find((i) => i.severity === 'error')?.message;
}

/**
 * Run one source end-to-end. Pure aside from `adapter.fetch` (the lone network
 * boundary) and, when `dryRun` is false, `store.put`.
 */
export async function runImport(
  adapter: SourceAdapter,
  options: RunImportOptions,
): Promise<RunImportResult> {
  const {
    source,
    batchId,
    now,
    dryRun = true,
    geocode = false,
    geocoder = new NullGeocoder(),
    detector = new GeoNameDuplicateDetector(),
    candidates = [],
    validationRules,
    store,
    signal,
    log = (m: string) => console.log(m),
  } = options;

  const ctx: AdapterContext = { source, log, signal };

  // 1. fetch (the only network boundary) + 2. normalize.
  const raw = await adapter.fetch(ctx);
  const records: NormalizedImportRecord[] = raw.items.flatMap((item) =>
    adapter.normalize(item, ctx),
  );

  const staged: StagedRecord[] = [];
  const rejected: StagedRecord[] = [];
  const reviewQueue: ReviewQueueItem[] = [];
  const autoApprovable: StagedRecord[] = [];
  const stats: RunImportStats = {
    fetched: raw.items.length,
    normalized: records.length,
    validated: 0,
    rejected: 0,
    geocoded: 0,
    matches: 0,
    conflicts: 0,
    newRecords: 0,
    needsReview: 0,
    autoApprovable: 0,
  };

  const persist = (s: StagedRecord): void => {
    if (!dryRun) store?.put(s);
  };

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const stagingId = `${batchId}#${i}`;
    let s = stageRecord(record, { batchId, stagingId, now });

    // 3. validation gate.
    const validation = runValidation(record, validationRules);
    s = { ...s, validation };
    if (!validation.ok) {
      s = transition(s, 'rejected', { now, by: 'pipeline', reason: firstError(s) });
      stats.rejected++;
      rejected.push(s);
      persist(s);
      continue;
    }
    stats.validated++;
    s = transition(s, 'validated', { now, by: 'pipeline' });

    // 4. optional geocoding — only when coordinates are missing. The default
    //    NullGeocoder always returns 'failed' and never hits the network.
    let rec = record;
    if (geocode && !rec.location) {
      const outcome = await geocoder.geocode({ address: rec.address, city: rec.cityHint });
      if (outcome.location && outcome.precision !== 'failed') {
        rec = { ...rec, location: outcome.location };
        stats.geocoded++;
      }
      s = { ...s, record: rec, geocode: outcome };
      s = transition(s, 'geocoded', { now, by: 'pipeline' });
    }

    // 5. duplicate detection against the supplied existing records.
    const verdict = detector.detect(rec, candidates);
    s = { ...s, duplicate: verdict };
    if (verdict.class === 'match') stats.matches++;
    else if (verdict.class === 'conflict') stats.conflicts++;
    else stats.newRecords++;
    s = transition(s, 'deduplicated', { now, by: 'pipeline' });

    // 6. land in staging, awaiting review.
    s = transition(s, 'pending_review', { now, by: 'pipeline' });
    staged.push(s);
    persist(s);

    // 7. route to the review queue, or mark auto-approvable.
    const reason = reviewReason(s);
    if (reason) {
      stats.needsReview++;
      reviewQueue.push({
        stagingId: s.stagingId,
        name: rec.name,
        type: rec.type,
        sourceId: s.sourceId,
        duplicateClass: verdict.class,
        reason,
        staged: s,
      });
    } else {
      stats.autoApprovable++;
      autoApprovable.push(s);
    }
  }

  const batch: ImportBatch = {
    id: batchId,
    sourceId: source.id,
    adapterId: adapter.id,
    createdAt: now,
    recordCount: records.length,
    note: dryRun ? 'dry-run: nothing persisted, nothing published' : undefined,
  };

  return { batch, staged, rejected, reviewQueue, autoApprovable, stats, dryRun };
}
