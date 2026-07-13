/** Validate normalized kosher-restaurant records before they reach the dataset. */
import type { NormalizedPlace, ValidationResult } from '../shared/types.ts';
import { isInIsrael } from '../shared/utils.ts';

export function validateRestaurants(places: NormalizedPlace[]): ValidationResult {
  const valid: NormalizedPlace[] = [];
  const rejected: ValidationResult['rejected'] = [];
  const seen = new Set<string>();

  for (const p of places) {
    if (p.type !== 'restaurant') {
      rejected.push({ record: p, reason: `wrong type: ${p.type}` });
    } else if (!p.name?.trim()) {
      rejected.push({ record: p, reason: 'missing name' });
    } else if (!isInIsrael(p.location)) {
      rejected.push({ record: p, reason: 'coordinates outside Israel' });
    } else if (seen.has(p.id)) {
      rejected.push({ record: p, reason: 'duplicate id' });
    } else {
      seen.add(p.id);
      valid.push(p);
    }
  }

  return { valid, rejected };
}
