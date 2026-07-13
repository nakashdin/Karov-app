/**
 * Review / approval flow.
 *
 * Records reach here only after they are `deduplicated` and moved to
 * `pending_review`. A human (or a trusted auto-approver policy) decides
 * approve / reject / hold; the decision is recorded on the staged record and
 * drives the corresponding guarded status transition. Approval is the LAST step
 * the unified importer performs — promoting an approved record into production
 * `places` is a separate, out-of-scope action.
 */
import type { StagedRecord, StagingStatus } from '../schema/import-staging.ts';
import { transition } from '../schema/import-staging.ts';
import type { ImportType } from '../schema/normalized-record.ts';
import type { DuplicateClass } from './duplicate-detection.ts';

export type ReviewAction = 'approve' | 'reject' | 'hold';

export interface ReviewDecision {
  action: ReviewAction;
  /** Reviewer id (or an auto-approver policy name). */
  by: string;
  at: string;
  reason?: string;
  /** Fields the reviewer agreed should enrich an existing matched record. */
  approvedEnrichFields?: string[];
}

/** The compact view a reviewer is shown for one pending record. */
export interface ReviewQueueItem {
  stagingId: string;
  name: string;
  type: ImportType;
  sourceId: string;
  duplicateClass?: DuplicateClass;
  /** Why it needs a human: 'conflict' | 'suspicious' | 'match' | 'enrich'. */
  reason: string;
  staged: StagedRecord;
}

/**
 * A pluggable queue of records awaiting human decision. Implementations may be
 * backed by a JSON file, a DB table, or an admin UI; the flow depends only on
 * this interface.
 */
export interface ReviewQueue {
  pending(): Promise<ReviewQueueItem[]>;
  submit(stagingId: string, decision: ReviewDecision): Promise<StagedRecord>;
}

/** Map a review action to the staging status it drives. */
export function statusForAction(action: ReviewAction): StagingStatus | null {
  switch (action) {
    case 'approve':
      return 'approved';
    case 'reject':
      return 'discarded';
    case 'hold':
      return null; // stays in pending_review
  }
}

/**
 * Apply a decision to a staged record (pure). Records the decision, then
 * performs the guarded transition. A `hold` records the decision but keeps the
 * record in `pending_review`. Throws if the record isn't awaiting review.
 */
export function applyReview(staged: StagedRecord, decision: ReviewDecision): StagedRecord {
  if (staged.status !== 'pending_review') {
    throw new Error(`cannot review record in status "${staged.status}"`);
  }
  const withDecision: StagedRecord = { ...staged, review: decision };
  const next = statusForAction(decision.action);
  if (!next) return { ...withDecision, updatedAt: decision.at };
  return transition(withDecision, next, {
    now: decision.at,
    by: decision.by,
    reason: decision.reason,
  });
}

/** Decide whether a record needs human review, and why (else auto-approvable). */
export function reviewReason(staged: StagedRecord): string | null {
  const dup = staged.duplicate;
  if (!dup || dup.class === 'new') return null; // clean new record — auto-approvable
  if (dup.suspicious) return 'suspicious';
  if (dup.class === 'conflict') return 'conflict';
  if (dup.class === 'match' && (dup.enrichableFields?.length ?? 0) > 0) return 'enrich';
  return 'match'; // exact duplicate of an existing record — reviewer may discard
}
