import { useEffect, useState } from 'react';
import { useHalachicDate } from './useHalachicDate';
import { hebcal } from '../shared/api';
import { getJSON, setJSON, StorageKey } from '../shared/storage';

interface Cached {
  hebrew: string;
  gregorianDate: string; // YYYY-MM-DD — invalidate on new day
}

const isCached = (v: unknown): v is Cached =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Cached).hebrew === 'string' &&
  typeof (v as Cached).gregorianDate === 'string';

export function useHebrewDate(): string | null {
  const [hebrewDate, setHebrewDate] = useState<string | null>(null);
  // Rolls at sunset, not midnight — the Hebrew date is a Jewish day.
  const { iso, year, month, day } = useHalachicDate();

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    (async () => {
      const cached = await getJSON<Cached | null>(StorageKey.hebrewDateToday, null, isCached);
      if (cached?.gregorianDate === iso) {
        if (mounted) setHebrewDate(cached.hebrew);
        return;
      }

      try {
        const result = await hebcal.fetchConversion(year, month, day, true, {
          signal: controller.signal,
        });
        if (!result.hebrew) return;
        await setJSON<Cached>(StorageKey.hebrewDateToday, {
          hebrew: result.hebrew,
          gregorianDate: iso,
        });
        if (mounted) setHebrewDate(result.hebrew);
      } catch {
        // Yesterday's cached date is still shown; a blank line is the fallback.
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [iso, year, month, day]);

  return hebrewDate;
}
