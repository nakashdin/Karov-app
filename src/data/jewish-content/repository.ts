import {
  JewishContentItem,
  ContentType,
  Topic,
  ContentHistory,
  DailyFeedOptions,
  DailyItemOptions,
} from './types';
import { ALL_JEWISH_CONTENT } from './index';

// ─── Deterministic hashing (FNV-1a 32-bit) ────────────────────────────────────

function hashCode(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
    hash >>>= 0;
  }
  return hash;
}

// Deterministic pseudo-random number in [0, 1) from a seed (xorshift32)
function seededRandom(seed: number): number {
  let x = seed === 0 ? 2166136261 : seed;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  x >>>= 0;
  return x / 0x100000000;
}

// ─── Date utilities ────────────────────────────────────────────────────────────

export function getTodayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(date1: string, date2: string): number {
  const t1 = new Date(date1).getTime();
  const t2 = new Date(date2).getTime();
  return Math.abs(Math.floor((t2 - t1) / 86_400_000));
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

// Higher score = preferred. Starting at 1000; penalties for recency.
// selectedTopics is a future hook for user interests.
function scoreItem(
  item: JewishContentItem,
  date: string,
  history: ContentHistory,
  selectedTopics?: Topic[]
): number {
  let score = 1000;

  const record = history.entries[item.id];
  if (record) {
    const days = daysBetween(record.lastShownAt, date);
    if (days < 7)   score -= 900;
    else if (days < 14) score -= 600;
    else if (days < 30) score -= 300;
    else if (days < 60) score -= 100;
    else if (days < 90) score -= 30;
    // 90+ days: no penalty
  }

  // Future: interest-based boost
  if (selectedTopics && selectedTopics.length > 0) {
    const hasMatch = item.topics.some(t => selectedTopics.includes(t));
    if (hasMatch) score += 200;
  }

  return score;
}

// ─── Repository ───────────────────────────────────────────────────────────────

function getAll(): JewishContentItem[] {
  return ALL_JEWISH_CONTENT;
}

function getPublished(): JewishContentItem[] {
  return ALL_JEWISH_CONTENT.filter(i => i.reviewStatus === 'published');
}

function getById(id: string): JewishContentItem | undefined {
  return ALL_JEWISH_CONTENT.find(i => i.id === id);
}

function getByType(type: ContentType): JewishContentItem[] {
  return getPublished().filter(i => i.contentType === type);
}

function getByTopic(topic: Topic): JewishContentItem[] {
  return getPublished().filter(i => i.topics.includes(topic));
}

function getByTopics(topics: Topic[]): JewishContentItem[] {
  return getPublished().filter(i => i.topics.some(t => topics.includes(t)));
}

function getForSeries(seriesId: string): JewishContentItem[] {
  return getPublished()
    .filter(i => i.seriesId === seriesId)
    .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
}

// ─── Daily item (backward-compat: one item per ContentType) ───────────────────

// Returns the best available published item for the given type for this device+date.
// Stable: same device+date+type always returns the same item.
// Anti-repeat: items seen recently score lower.
function getDailyItemByType(
  type: ContentType,
  opts: DailyItemOptions
): JewishContentItem {
  const { deviceId, date, history } = opts;

  const pool = getByType(type);

  // If no published items exist, widen to all items of this type as a fallback
  const candidates = pool.length > 0
    ? pool
    : ALL_JEWISH_CONTENT.filter(i => i.contentType === type);

  if (candidates.length === 0) {
    // Should never happen if catalog is populated correctly
    throw new Error(`No items found for contentType: ${type}`);
  }

  // Score each candidate
  const scored = candidates
    .map(item => ({ item, score: scoreItem(item, date, history) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Deterministic tiebreak so sort is stable per device+date
      const seedA = hashCode(`${deviceId}:${date}:${type}:${a.item.id}`);
      const seedB = hashCode(`${deviceId}:${date}:${type}:${b.item.id}`);
      return seededRandom(seedA) - seededRandom(seedB);
    });

  // Pick from top candidates using a seeded index, so different devices get
  // different items even when scores are similar.
  const topN = Math.min(5, scored.length);
  const seed = hashCode(`${deviceId}:${date}:${type}`);
  const index = Math.floor(seededRandom(seed) * topN);

  return scored[index].item;
}

// ─── Publish validation ───────────────────────────────────────────────────────

// Legacy items (isLegacyMigrated) bypass validation — they were already live.
// New items cannot be published if their license is uncleared or halachic review
// is still required. Call this before setting reviewStatus: 'published' on any
// new catalog item.
export function validateCanPublish(
  item: JewishContentItem
): { valid: boolean; errors: string[] } {
  if (item.isLegacyMigrated) return { valid: true, errors: [] };

  const errors: string[] = [];

  if (item.source.version.licenseStatus === 'needs_review') {
    errors.push(
      'licenseStatus is needs_review — license must be cleared before publishing'
    );
  }

  if (item.halachicReviewStatus === 'required') {
    errors.push(
      'halachicReviewStatus is required — halachic review must be completed before publishing'
    );
  }

  return { valid: errors.length === 0, errors };
}

// ─── Daily feed (topic-aware, diverse, future-facing) ─────────────────────────

// Fills `limit` slots sequentially. Each slot picks the highest-scoring item
// that satisfies the current diversity constraints. If no item satisfies strict
// constraints, tolerance is raised by 1 (one additional overlap dimension is
// allowed) and the candidate list is retried — guaranteeing the slot is always
// filled as long as unpicked items remain.
//
// violations count: topicOverlap + typeOverlap + workOverlap (0–3)
//   tolerance=0  strict: zero overlap on all three dimensions
//   tolerance=1  one dimension may overlap (e.g. same work but different topic+type)
//   tolerance=2  two dimensions may overlap
//   tolerance=3  any unpicked item (fallback)
function getDailyFeed(opts: DailyFeedOptions): JewishContentItem[] {
  const { deviceId, date, selectedTopics, history, limit = 5 } = opts;

  const baseSeed = hashCode(`${deviceId}:${date}`);
  const pool = getPublished();

  if (pool.length === 0) return [];

  // Pre-score all items; deterministic tiebreak so sort is stable per device+date
  const scored = pool
    .map(item => ({ item, score: scoreItem(item, date, history, selectedTopics) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ra = seededRandom(hashCode(`${baseSeed}:${a.item.id}`));
      const rb = seededRandom(hashCode(`${baseSeed}:${b.item.id}`));
      return rb - ra;
    });

  const selected: JewishContentItem[] = [];
  const selectedIds = new Set<string>();
  const usedTopics = new Set<Topic>();
  const usedTypes = new Set<ContentType>();
  const usedWorks = new Set<string>();

  for (let slot = 0; slot < limit; slot++) {
    let picked: JewishContentItem | null = null;

    // Try progressively relaxed constraints until one item is found
    for (let tolerance = 0; tolerance <= 3 && picked === null; tolerance++) {
      for (const { item } of scored) {
        if (selectedIds.has(item.id)) continue;

        const violations =
          (item.topics.some(t => usedTopics.has(t)) ? 1 : 0) +
          (usedTypes.has(item.contentType) ? 1 : 0) +
          (usedWorks.has(item.source.work.title) ? 1 : 0);

        if (violations <= tolerance) {
          picked = item;
          break;
        }
      }
    }

    if (picked === null) break;

    selected.push(picked);
    selectedIds.add(picked.id);
    picked.topics.forEach(t => usedTopics.add(t));
    usedTypes.add(picked.contentType);
    usedWorks.add(picked.source.work.title);
  }

  return selected;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const contentRepository = {
  getAll,
  getById,
  getByType,
  getByTopic,
  getByTopics,
  getForSeries,
  getDailyItemByType,
  getDailyFeed,
  getTodayDate,
  validateCanPublish,
};
