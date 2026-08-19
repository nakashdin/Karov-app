import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@karov/selectedTopics';

export function useSelectedTopics() {
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          try {
            setSelectedGroupIds(JSON.parse(raw));
          } catch {
            // corrupt data — start fresh
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedGroupIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedGroupIds([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return { selectedGroupIds, toggle, clear, loaded };
}
