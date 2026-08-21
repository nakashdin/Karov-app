import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Nusach } from '../data/birkatHamazon';

const STORAGE_KEY = '@karov/nusach';

export function useNusach() {
  const [nusach, setNusachState] = useState<Nusach | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw === 'ashkenaz' || raw === 'sfarad' || raw === 'edot_hamizrach') {
          setNusachState(raw);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const setNusach = useCallback(async (n: Nusach) => {
    setNusachState(n);
    await AsyncStorage.setItem(STORAGE_KEY, n);
  }, []);

  return { nusach, loaded, setNusach };
}
