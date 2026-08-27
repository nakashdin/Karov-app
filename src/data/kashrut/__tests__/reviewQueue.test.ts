import { readFileSync } from 'node:fs';
import path from 'node:path';
import { REVIEW_QUEUE_RAWS, isReviewQueueDeferred } from '../reviewQueue';

/**
 * REVIEW_QUEUE_RAWS is a hand-copied mirror of kashrut-registry.json's
 * reviewQueue[].raw values (the registry lives outside src/, so app code
 * can't import it directly). A silently drifted mirror here is a
 * correctness bug with religious consequences, not a maintenance
 * annoyance — a raw string a human explicitly deferred to review would stop
 * being marked as unverified in the UI. This test makes that drift loud.
 */
describe('REVIEW_QUEUE_RAWS mirrors kashrut-registry.json exactly', () => {
  const registryPath = path.resolve(__dirname, '../../../../scripts/reports/kashrut-registry.json');
  const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as {
    reviewQueue: { raw: string }[];
  };

  it('has the exact same set of raw strings as the registry\'s reviewQueue', () => {
    const registryRaws = new Set(registry.reviewQueue.map((r) => r.raw));
    const mirrorRaws = new Set(REVIEW_QUEUE_RAWS);

    const missingFromMirror = [...registryRaws].filter((r) => !mirrorRaws.has(r));
    const extraInMirror = [...mirrorRaws].filter((r) => !registryRaws.has(r));

    expect(missingFromMirror).toEqual([]);
    expect(extraInMirror).toEqual([]);
    expect(mirrorRaws.size).toBe(registryRaws.size);
  });

  it('sanity: the registry file actually has entries (guards against a silently empty/missing file passing vacuously)', () => {
    expect(registry.reviewQueue.length).toBeGreaterThan(50);
  });

  it('isReviewQueueDeferred agrees with the registry for a real deferred string and a real non-deferred one', () => {
    const deferred = registry.reviewQueue[0].raw;
    expect(isReviewQueueDeferred(deferred)).toBe(true);
    expect(isReviewQueueDeferred('a string that is definitely not in the registry')).toBe(false);
    expect(isReviewQueueDeferred(undefined)).toBe(false);
    expect(isReviewQueueDeferred(null)).toBe(false);
  });
});
