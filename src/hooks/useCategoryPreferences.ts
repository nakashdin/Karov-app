import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategoryGroup } from '../data/jewish-content/types';

const STORAGE_KEY = '@karov/categoryPreferences';
const HAS_DECIDED_KEY = '@karov/categoryPreferencesDecided';

interface CategoryPreferencesState {
  selected: CategoryGroup[];
  hasDecided: boolean;
  isLoading: boolean;
}

interface CategoryPreferencesActions {
  setSelected: (groups: CategoryGroup[]) => Promise<void>;
  toggleGroup: (group: CategoryGroup) => void;
  markDecided: () => Promise<void>;
  resetDecision: () => Promise<void>;
}

export function useCategoryPreferences(): CategoryPreferencesState & CategoryPreferencesActions {
  const [selected, setSelectedState] = useState<CategoryGroup[]>([]);
  const [hasDecided, setHasDecided] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rawSelected, rawDecided] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(HAS_DECIDED_KEY),
        ]);
        if (rawSelected) setSelectedState(JSON.parse(rawSelected));
        if (rawDecided === 'true') setHasDecided(true);
      } catch {
        // start fresh
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setSelected = useCallback(async (groups: CategoryGroup[]) => {
    setSelectedState(groups);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    } catch {}
  }, []);

  const toggleGroup = useCallback((group: CategoryGroup) => {
    setSelectedState((prev) => {
      const next = prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const markDecided = useCallback(async () => {
    setHasDecided(true);
    try {
      await AsyncStorage.setItem(HAS_DECIDED_KEY, 'true');
    } catch {}
  }, []);

  const resetDecision = useCallback(async () => {
    setHasDecided(false);
    try {
      await AsyncStorage.removeItem(HAS_DECIDED_KEY);
    } catch {}
  }, []);

  return { selected, hasDecided, isLoading, setSelected, toggleGroup, markDecided, resetDecision };
}
