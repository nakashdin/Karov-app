import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `@karov/dailyReads:${y}-${m}-${day}`;
}

export function useDailyReads() {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(getTodayKey());
      setReadIds(raw ? new Set(JSON.parse(raw)) : new Set());
    } catch {
      setReadIds(new Set());
    }
  }, []);

  const toggleRead = useCallback(async (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      AsyncStorage.setItem(getTodayKey(), JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const isRead = useCallback((id: string) => readIds.has(id), [readIds]);

  return { readIds, toggleRead, isRead, load };
}
