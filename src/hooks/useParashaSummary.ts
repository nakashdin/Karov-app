import { useEffect, useState } from 'react';
import { sefaria } from '../shared/api';
import { getString, setString, StorageKeyFor } from '../shared/storage';

/**
 * Short description of the week's parasha, from Sefaria.
 *
 * Torah content comes only from Sefaria or Chabad.org — never generated, never
 * attributed to a commentator without verification. See AGENTS.md.
 */
export function useParashaSummary(topicSlug: string | null): string | null {
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!topicSlug) return;

    const controller = new AbortController();
    const key = StorageKeyFor.parashaSummary(topicSlug);
    let mounted = true;

    (async () => {
      const cached = await getString(key);
      if (cached) {
        if (mounted) setSummary(cached);
        return;
      }

      try {
        const topic = await sefaria.fetchTopic(topicSlug, { signal: controller.signal });
        const text = sefaria.topicSummary(topic);
        if (!text) return;
        await setString(key, text);
        if (mounted) setSummary(text);
      } catch {
        // The card renders without a summary rather than showing an error.
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [topicSlug]);

  return summary;
}
