import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@karov/middahProgress';

type ProgressMap = Record<string, number>; // middahTopic → current card index (0-based)

export function useMiddahProgress() {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) {
        try { setProgress(JSON.parse(raw)); } catch {}
      }
      setIsLoaded(true);
    });
  }, []);

  const getCardIndex = useCallback(
    (topic: string) => progress[topic] ?? 0,
    [progress]
  );

  // Call when user marks a card done — advances to the next card (capped at last).
  const advance = useCallback((topic: string, totalCards: number) => {
    setProgress((prev) => {
      const current = prev[topic] ?? 0;
      const next = Math.min(current + 1, totalCards - 1);
      if (next === current) return prev;
      const updated = { ...prev, [topic]: next };
      AsyncStorage.setItem(KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { getCardIndex, advance, isLoaded };
}
