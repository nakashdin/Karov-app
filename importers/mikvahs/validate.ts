/**
 * Validate normalized mikvahs at STEP 2 (pre-geocoding).
 *
 * Rules here are deliberately minimal — there are no coordinates yet, so we do
 * NOT check location. A record is valid if it has a name and a unique sourceId.
 * "Missing address" is a reported statistic, NOT a rejection.
 */
import type { MikvahPlace } from '../shared/types.ts';

export interface MikvahValidation {
  valid: MikvahPlace[];
  rejected: { sourceId: string; reason: string }[];
  duplicates: number;
}

export function validateMikvahs(places: MikvahPlace[]): MikvahValidation {
  const valid: MikvahPlace[] = [];
  const rejected: MikvahValidation['rejected'] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const p of places) {
    if (!p.name || !p.name.trim()) {
      rejected.push({ sourceId: p.sourceId, reason: 'missing name' });
    } else if (seen.has(p.sourceId)) {
      duplicates++;
    } else {
      seen.add(p.sourceId);
      valid.push(p);
    }
  }

  return { valid, rejected, duplicates };
}
