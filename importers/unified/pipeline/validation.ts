/**
 * Validation pipeline — a composable set of rules over a NormalizedImportRecord.
 *
 * Rules are pure functions: each takes one record and returns zero or more
 * issues. `runValidation` aggregates them; a record is `ok` when no rule
 * reports an `error` (warnings never block, they annotate). This mirrors the
 * legacy per-category validators but generalizes them so any source reuses the
 * same gate before staging.
 */
import type { NormalizedImportRecord } from '../schema/normalized-record.ts';
import { isInIsrael } from '../../shared/utils.ts';

export type Severity = 'error' | 'warning';

export interface ValidationIssue {
  /** Name of the rule that produced this issue. */
  rule: string;
  severity: Severity;
  message: string;
  /** Field the issue is about, when applicable. */
  field?: keyof NormalizedImportRecord | string;
}

export interface ValidationOutcome {
  ok: boolean;
  issues: ValidationIssue[];
}

export interface ValidationRule {
  name: string;
  run(record: NormalizedImportRecord): ValidationIssue[];
}

/** Run a record through an ordered list of rules and aggregate the result. */
export function runValidation(
  record: NormalizedImportRecord,
  rules: ValidationRule[] = defaultRules,
): ValidationOutcome {
  const issues: ValidationIssue[] = [];
  for (const rule of rules) {
    for (const issue of rule.run(record)) issues.push({ ...issue, rule: rule.name });
  }
  return { ok: !issues.some((i) => i.severity === 'error'), issues };
}

// --- default rule set -------------------------------------------------------

const VALID_TYPES = new Set(['synagogue', 'restaurant', 'mikveh']);
// Israeli phone shape, permissive: optional +972, separators allowed.
const PHONE_RE = /^(\+?972[-\s]?|0)([23489]|5\d|7\d)[-\s]?\d{3}[-\s]?\d{4}$/;

const err = (message: string, field?: string): ValidationIssue =>
  ({ rule: '', severity: 'error', message, field });
const warn = (message: string, field?: string): ValidationIssue =>
  ({ rule: '', severity: 'warning', message, field });

export const defaultRules: ValidationRule[] = [
  {
    name: 'name-present',
    run: (r) => (r.name && r.name.trim() ? [] : [err('missing name', 'name')]),
  },
  {
    name: 'type-supported',
    run: (r) => (VALID_TYPES.has(r.type) ? [] : [err(`unsupported type "${r.type}"`, 'type')]),
  },
  {
    name: 'provenance-present',
    run: (r) => {
      const p = r.provenance;
      if (!p || !p.sourceId || !p.sourceRecordId) {
        return [err('missing provenance (sourceId / sourceRecordId)', 'provenance')];
      }
      return [];
    },
  },
  {
    name: 'coords-in-israel',
    run: (r) => {
      // Location is optional pre-geocoding; only validate what's present.
      if (!r.location) return [];
      return isInIsrael(r.location) ? [] : [err('coordinates outside Israel', 'location')];
    },
  },
  {
    name: 'phone-shape',
    run: (r) => {
      if (!r.phone) return [];
      return PHONE_RE.test(r.phone.trim()) ? [] : [warn('phone does not look Israeli', 'phone')];
    },
  },
  {
    name: 'address-present',
    run: (r) =>
      r.address && r.address.trim() ? [] : [warn('missing address (statistic only)', 'address')],
  },
];
