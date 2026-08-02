import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface JewishDayInfo {
  title: string;
  body: string;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const CATEGORY_PRIORITY = ['holiday', 'roshchodesh', 'omer', 'mevarchim', 'parashat'];

function pickBest(items: any[]): any | null {
  for (const cat of CATEGORY_PRIORITY) {
    const found = items.find((i: any) => i.category === cat);
    if (found) return found;
  }
  return items[0] ?? null;
}

export function useJewishDayInfo(): JewishDayInfo | null {
  const [info, setInfo] = useState<JewishDayInfo | null>(null);

  useEffect(() => {
    const iso = todayISO();
    const [y, m] = iso.split('-').map(Number);
    const cacheKey = `@karov/jewishDay_${iso}`;

    let mounted = true;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && mounted) { setInfo(JSON.parse(cached)); return; }
      } catch {}

      try {
        const url =
          `https://www.hebcal.com/hebcal/?v=1&cfg=json` +
          `&maj=on&min=on&mod=on&nx=on&omer=on` +
          `&year=${y}&month=${m}&yt=G&xl=0&c=off&l=IL`;
        const resp = await fetch(url);
        const json = await resp.json();
        const allItems: any[] = json.items ?? [];

        // Events happening today
        const todayItems = allItems.filter(
          (i: any) => i.date && (i.date === iso || i.date.startsWith(iso + 'T')),
        );

        let result: JewishDayInfo;

        if (todayItems.length > 0) {
          const best = pickBest(todayItems);
          const title: string = best.hebrew || best.title || 'אירוע מיוחד';
          const memo: string = best.memo ?? '';
          const body =
            memo
              ? memo.slice(0, 100)
              : todayItems.length > 1
              ? todayItems
                  .filter((i: any) => i !== best)
                  .map((i: any) => i.hebrew || i.title)
                  .join(' • ')
                  .slice(0, 100)
              : 'לחץ לפרטים נוספים';
          result = { title, body };
        } else {
          // Look ahead up to 14 days for the next special event
          const upcomingItem = allItems.find((i: any) => {
            if (!i.date) return false;
            const diff =
              (new Date(i.date).getTime() - new Date(iso).getTime()) / 86400000;
            return diff > 0 && diff <= 14 && ['holiday', 'roshchodesh'].includes(i.category);
          });
          if (upcomingItem) {
            const daysLeft = Math.round(
              (new Date(upcomingItem.date).getTime() - new Date(iso).getTime()) / 86400000,
            );
            result = {
              title: 'מה מתקרב?',
              body: `${upcomingItem.hebrew || upcomingItem.title} — עוד ${daysLeft} ימים`,
            };
          } else {
            result = { title: 'הלוח העברי', body: 'אין אירועים מיוחדים להיום' };
          }
        }

        if (mounted) setInfo(result);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
      } catch {}
    })();

    return () => { mounted = false; };
  }, []);

  return info;
}
