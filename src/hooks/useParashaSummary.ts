import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useParashaSummary(topicSlug: string | null): string | null {
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!topicSlug) return;

    const key = `@karov/parashaSummary_${topicSlug}`;
    let mounted = true;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached && mounted) { setSummary(cached); return; }
      } catch {}

      try {
        const url = `https://www.sefaria.org/api/topics/${topicSlug}`;
        const resp = await fetch(url);
        const json = await resp.json();
        const desc: string | undefined =
          json?.description?.he || json?.description?.en;
        if (desc && mounted) {
          const trimmed = desc.replace(/<[^>]*>/g, '').trim().slice(0, 220);
          setSummary(trimmed);
          await AsyncStorage.setItem(key, trimmed).catch(() => {});
        }
      } catch {}
    })();

    return () => { mounted = false; };
  }, [topicSlug]);

  return summary;
}
