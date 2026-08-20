import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@karov/selectedMiddot';

export function useSelectedMiddot() {
  const [selected, setSelectedState] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v) setSelectedState(JSON.parse(v));
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const setSelected = useCallback(async (middot: string[]) => {
    setSelectedState(middot);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(middot));
  }, []);

  const toggleMiddah = useCallback((topic: string) => {
    setSelectedState((prev) => {
      const next = prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : [...prev, topic];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { selected, isLoaded, setSelected, toggleMiddah };
}
