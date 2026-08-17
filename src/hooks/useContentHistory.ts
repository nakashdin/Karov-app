import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContentHistory, ContentHistoryRecord } from '../data/jewish-content/types';

const HISTORY_KEY = '@karov/contentHistory';

export const EMPTY_HISTORY: ContentHistory = { entries: {} };

export async function loadHistory(): Promise<ContentHistory> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return EMPTY_HISTORY;
    const parsed = JSON.parse(raw);
    // Basic shape validation
    if (parsed && typeof parsed.entries === 'object') {
      return parsed as ContentHistory;
    }
    return EMPTY_HISTORY;
  } catch {
    return EMPTY_HISTORY;
  }
}

async function saveHistory(history: ContentHistory): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Non-fatal — history is a best-effort feature
  }
}

function getDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface UseContentHistoryResult {
  history: ContentHistory;
  markShown: (contentId: string) => void;
  markOpened: (contentId: string) => void;
  markSaved: (contentId: string) => void;
}

export function useContentHistory(): UseContentHistoryResult {
  const [history, setHistory] = useState<ContentHistory>(EMPTY_HISTORY);

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  const update = useCallback(
    (updater: (h: ContentHistory) => ContentHistory) => {
      setHistory(prev => {
        const next = updater(prev);
        saveHistory(next);
        return next;
      });
    },
    []
  );

  const markShown = useCallback(
    (contentId: string) => {
      const today = getDateString();
      update(h => {
        const existing: ContentHistoryRecord | undefined = h.entries[contentId];
        const updated: ContentHistoryRecord = {
          contentId,
          firstShownAt: existing?.firstShownAt ?? today,
          lastShownAt: today,
          showCount: (existing?.showCount ?? 0) + 1,
          lastOpenedAt: existing?.lastOpenedAt,
          openCount: existing?.openCount,
          savedAt: existing?.savedAt,
        };
        return { ...h, entries: { ...h.entries, [contentId]: updated } };
      });
    },
    [update]
  );

  const markOpened = useCallback(
    (contentId: string) => {
      const today = getDateString();
      update(h => {
        const existing = h.entries[contentId];
        if (!existing) return h;
        return {
          ...h,
          entries: {
            ...h.entries,
            [contentId]: {
              ...existing,
              lastOpenedAt: today,
              openCount: (existing.openCount ?? 0) + 1,
            },
          },
        };
      });
    },
    [update]
  );

  const markSaved = useCallback(
    (contentId: string) => {
      const today = getDateString();
      update(h => {
        const existing = h.entries[contentId];
        if (!existing) return h;
        return {
          ...h,
          entries: { ...h.entries, [contentId]: { ...existing, savedAt: today } },
        };
      });
    },
    [update]
  );

  return { history, markShown, markOpened, markSaved };
}
