import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHalachicDate } from './useHalachicDate';

const CACHE_KEY = '@karov/hebrewDateToday';

interface Cached {
  hebrew: string;
  gregorianDate: string; // YYYY-MM-DD — invalidate on new day
}

export function useHebrewDate(): string | null {
  const [hebrewDate, setHebrewDate] = useState<string | null>(null);
  // Rolls at sunset, not midnight — the Hebrew date is a Jewish day.
  const { iso, year, month, day } = useHalachicDate();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached: Cached = JSON.parse(raw);
          if (cached.gregorianDate === iso) {
            if (mounted) setHebrewDate(cached.hebrew);
            return;
          }
        }
      } catch {}

      try {
        const url =
          `https://www.hebcal.com/converter?cfg=json` +
          `&gy=${year}&gm=${month}&gd=${day}&g2h=1&strict=1`;
        const resp = await fetch(url);
        const json = await resp.json();
        if (json.hebrew && mounted) {
          setHebrewDate(json.hebrew);
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ hebrew: json.hebrew, gregorianDate: iso }),
          );
        }
      } catch {}
    })();

    return () => {
      mounted = false;
    };
  }, [iso, year, month, day]);

  return hebrewDate;
}
