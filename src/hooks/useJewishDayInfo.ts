import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JEWISH_STATIC_EVENTS } from '../data/jewishEvents';

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
    const [y, m, d] = iso.split('-').map(Number);
    const cacheKey = `@karov/jewishDay2_${iso}`;

    let mounted = true;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && mounted) { setInfo(JSON.parse(cached)); return; }
      } catch {}

      try {
        const [calResp, convResp] = await Promise.all([
          fetch(
            `https://www.hebcal.com/hebcal/?v=1&cfg=json` +
            `&maj=on&min=on&mod=on&nx=on&omer=on` +
            `&year=${y}&month=${m}&yt=G&xl=0&c=off&l=IL`,
          ),
          fetch(
            `https://www.hebcal.com/converter?cfg=json&gd=${d}&gm=${m}&gy=${y}&g2h=1`,
          ),
        ]);

        const calJson = await calResp.json();
        const convJson = await convResp.json();

        const hMonth: string = convJson.heDateParts?.m ?? '';
        const hDay: number = parseInt(convJson.heDateParts?.d ?? '0', 10);
        const staticEvents = hMonth && hDay
          ? (JEWISH_STATIC_EVENTS[`${hMonth}_${hDay}`] ?? [])
          : [];

        const allItems: any[] = calJson.items ?? [];
        const todayItems = allItems.filter(
          (i: any) => i.date && (i.date === iso || i.date.startsWith(iso + 'T')),
        );

        let result: JewishDayInfo;

        if (todayItems.length > 0) {
          const best = pickBest(todayItems);
          const title: string = best.hebrew || best.title || 'אירוע מיוחד';
          let body: string = best.memo ? best.memo.slice(0, 120) : '';

          // Supplement with static events (hilulot) if not already covered
          if (staticEvents.length > 0) {
            const st = staticEvents[0];
            const alreadyCovered = title.includes(st.title.slice(0, 4)) || st.title.includes(title.slice(0, 4));
            if (!alreadyCovered) {
              body = body ? `${body} • ${st.title}` : st.body;
            } else if (!body) {
              body = st.body;
            }
          }

          // Fill body from other today items if still empty
          if (!body && todayItems.length > 1) {
            body = todayItems
              .filter((i: any) => i !== best)
              .map((i: any) => i.hebrew || i.title)
              .join(' • ')
              .slice(0, 120);
          }
          if (!body) body = 'לחץ לפרטים נוספים';

          result = { title, body };
        } else if (staticEvents.length > 0) {
          const ev = staticEvents[0];
          const extras = staticEvents.slice(1).map((e) => e.title).join(' • ');
          result = {
            title: ev.title,
            body: ev.body + (extras ? ` • ${extras}` : ''),
          };
        } else {
          // Look ahead up to 14 days
          const upcomingItem = allItems.find((i: any) => {
            if (!i.date) return false;
            const diff = (new Date(i.date).getTime() - new Date(iso).getTime()) / 86400000;
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
