/**
 * import_staging — the buffer between adapters and production.
 *
 * Every record an adapter produces lands here first and moves through a guarded
 * lifecycle (ingested → validated → geocoded → deduplicated → pending_review →
 * approved → published). NOTHING reaches production `places` until it is
 * `approved`, and publishing is a separate, out-of-scope step. Rejections at
 * any gate are terminal-ish (`rejected` / `discarded`) and keep their history.
 *
 * Staging carries the per-stage results (validation, duplicate verdict, geocode
 * outcome, review decision) alongside the record, so the whole journey is
 * auditable from a single object.
 */
import type { NormalizedImportRecord } from './normalized-record.ts';
import type { ValidationOutcome } from '../pipeline/validation.ts';
import type { DuplicateVerdict } from '../pipeline/duplicate-detection.ts';
import type { GeocodeOutcome } from '../pipeline/geocoding.ts';
import type { ReviewDecision } from '../pipeline/review.ts';

export type StagingStatus =
  | 'ingested'
  | 'validated'
  | 'rejected' // failed automated validation
  | 'geocoded'
  | 'deduplicated'
  | 'pending_review'
  | 'approved'
  | 'discarded' // a human rejected it
  | 'published'; // promoted to production (performed elsewhere, later)

/** One adapter run that produced a set of staged records. */
export interface ImportBatch {
  id: string;
  sourceId: string;
  adapterId: string;
  createdAt: string;
  recordCount: number;
  note?: string;
}

/** A single status change, appended to a staged record's history. */
export interface StagingTransition {
  from: StagingStatus | null;
  to: StagingStatus;
  at: string;
  /** Actor: 'pipeline' for automated steps, a reviewer id for manual ones. */
  by?: string;
  reason?: string;
}

export interface StagedRecord {
  stagingId: string;
  batchId: string;
  /** FK → SourceRegistryEntry.id (mirrors record.provenance.sourceId). */
  sourceId: string;
  status: StagingStatus;
  record: NormalizedImportRecord;
  validation?: ValidationOutcome;
  duplicate?: DuplicateVerdict;
  geocode?: GeocodeOutcome;
  review?: ReviewDecision;
  history: StagingTransition[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Legal status transitions. Anything not listed throws in `transition`, so the
 * lifecycle can never skip a gate (e.g. ingested → approved is impossible).
 */
export const ALLOWED_TRANSITIONS: Record<StagingStatus, StagingStatus[]> = {
  ingested: ['validated', 'rejected'],
  validated: ['geocoded', 'deduplicated', 'rejected'],
  geocoded: ['deduplicated', 'rejected'],
  deduplicated: ['pending_review'],
  pending_review: ['approved', 'discarded'],
  approved: ['published', 'discarded'],
  rejected: [],
  discarded: [],
  published: [],
};

export function canTransition(from: StagingStatus, to: StagingStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Move a staged record to a new status, appending history. Returns a NEW object
 * (does not mutate the input). Throws on an illegal transition.
 *
 * `now` is injected (no hidden clock) so callers stay deterministic/testable.
 */
export function transition(
  staged: StagedRecord,
  to: StagingStatus,
  opts: { now: string; by?: string; reason?: string },
): StagedRecord {
  if (!canTransition(staged.status, to)) {
    throw new Error(`illegal staging transition: ${staged.status} → ${to}`);
  }
  return {
    ...staged,
    status: to,
    updatedAt: opts.now,
    history: [
      ...staged.history,
      { from: staged.status, to, at: opts.now, by: opts.by, reason: opts.reason },
    ],
  };
}

/** Build a freshly-ingested staged record from a normalized one (no IO). */
export function stageRecord(
  record: NormalizedImportRecord,
  ctx: { batchId: string; stagingId: string; now: string },
): StagedRecord {
  return {
    stagingId: ctx.stagingId,
    batchId: ctx.batchId,
    sourceId: record.provenance.sourceId,
    status: 'ingested',
    record,
    history: [{ from: null, to: 'ingested', at: ctx.now, by: 'pipeline' }],
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
}
