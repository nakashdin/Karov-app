/**
 * Validate synagogue candidates and split them into valid / rejected, while
 * counting duplicates. Rules (a record must pass ALL):
 *   - name is required
 *   - lat & lng are required
 *   - coordinates must fall inside Israel
 *   - sourceId must be unique (later occurrences counted as duplicates)
 */
import type { SynagoguePlace } from '../shared/types.ts';
import { isInIsrael } from '../shared/utils.ts';

export interface ValidationOutcome {
  valid: SynagoguePlace[];
  rejected: { sourceId: string; reason: string }[];
  /** Count of records dropped because their sourceId was already seen. */
  duplicates: number;
}

export function validateSynagogues(candidates: SynagoguePlace[]): ValidationOutcome {
  const valid: SynagoguePlace[] = [];
  const rejected: ValidationOutcome['rejected'] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const p of candidates) {
    if (!p.name || !p.name.trim()) {
      rejected.push({ sourceId: p.sourceId, reason: 'missing name' });
    } else if (p.lat == null || p.lng == null) {
      rejected.push({ sourceId: p.sourceId, reason: 'missing coordinates' });
    } else if (!isInIsrael({ latitude: p.lat, longitude: p.lng })) {
      rejected.push({ sourceId: p.sourceId, reason: 'coordinates outside Israel' });
    } else if (seen.has(p.sourceId)) {
      duplicates++;
    } else {
      seen.add(p.sourceId);
      valid.push(p);
    }
  }

  return { valid, rejected, duplicates };
}
