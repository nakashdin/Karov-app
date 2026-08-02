import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@karov/hebrewDateToday';

interface Cached {
  hebrew: string;
  gregorianDate: string; // YYYY-MM-DD — invalidate on new day
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function useHebrewDate(): string | null {
  const [hebrewDate, setHebrewDate] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached: Cached = JSON.parse(raw);
          if (cached.gregorianDate === todayKey()) {
            if (mounted) setHebrewDate(cached.hebrew);
            return;
          }
        }
      } catch {}

      try {
        const d = new Date();
        const url = `https://www.hebcal.com/converter?cfg=json&gy=${d.getFullYear()}&gm=${
          d.getMonth() + 1
        }&gd=${d.getDate()}&g2h=1&strict=1`;
        const resp = await fetch(url);
        const json = await resp.json();
        if (json.hebrew && mounted) {
          setHebrewDate(json.hebrew);
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ hebrew: json.hebrew, gregorianDate: todayKey() }),
          );
        }
      } catch {}
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return hebrewDate;
}
