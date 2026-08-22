import { getJson, type RequestOptions } from './client';

/**
 * Sefaria — the source of record for Torah text and topic descriptions.
 *
 * Project rule: Torah content comes only from Sefaria or Chabad.org, and is
 * never attributed to a commentator without verification against the source.
 *
 * https://developers.sefaria.org
 */

const BASE = 'https://www.sefaria.org';

export interface SefariaTopic {
  description?: { he?: string; en?: string };
  primaryTitle?: { he?: string; en?: string };
}

export const topicUrl = (slug: string): string =>
  `${BASE}/api/topics/${encodeURIComponent(slug)}`;

/**
 * Public reading page for a parasha — used for "read more" links.
 *
 * Hebcal titles sometimes already carry the "Parashat " prefix, so it is
 * stripped before being re-added; `lang=he` keeps Sefaria in Hebrew, which is
 * the whole point for this audience.
 */
export const parashaPageUrl = (englishName: string): string => {
  const slug = englishName.replace(/^Parashat\s+/i, '').trim().replace(/\s+/g, '_');
  return `${BASE}/Parashat_${slug}?lang=he`;
};

export const fetchTopic = (slug: string, opts?: RequestOptions) =>
  getJson<SefariaTopic>(topicUrl(slug), opts);

/** Topic description as plain text, tags stripped and clipped for a card. */
export function topicSummary(topic: SefariaTopic | null, maxChars = 220): string | null {
  const raw = topic?.description?.he || topic?.description?.en;
  if (!raw) return null;
  const text = raw.replace(/<[^>]*>/g, '').trim();
  return text ? text.slice(0, maxChars) : null;
}
