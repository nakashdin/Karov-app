import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ParashaData {
  name: string;
  hebrewName: string;
  date: string;
  hebrewDate: string;
  sefariaUrl: string;
  topicSlug: string; // e.g. "parashat-matot-masei" for Sefaria topics API
}

const CACHE_KEY = '@karov/parasha';
const HEBCAL_URL =
  'https://www.hebcal.com/shabbat/?cfg=json&geo=il&m=50&b=18&M=on';

const MONTH_HE: Record<string, string> = {
  Nisan: 'ניסן', Iyyar: 'אייר', Sivan: 'סיון', Tamuz: 'תמוז',
  Av: 'אב', Elul: 'אלול', Tishrei: 'תשרי', Cheshvan: 'חשון',
  Kislev: 'כסלו', Tevet: 'טבת', Shevat: 'שבט',
  Adar: 'אדר', 'Adar I': 'אדר א׳', 'Adar II': 'אדר ב׳',
};

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת'];

function numToHebrew(n: number): string {
  let result = '';
  const h = Math.floor(n / 100);
  n %= 100;
  const t = Math.floor(n / 10);
  const o = n % 10;

  if (h > 0 && h <= 4) result += HUNDREDS[h];
  else if (h >= 5) result += HUNDREDS[4] + HUNDREDS[h - 4];

  // special cases to avoid divine names
  if (t === 1 && o === 5) return result + 'טו';
  if (t === 1 && o === 6) return result + 'טז';

  result += TENS[t] + ONES[o];
  return result;
}

function yearToHebrew(year: number): string {
  // drop the millennium (5000), e.g. 5786 → 786
  const y = year % 1000;
  const s = numToHebrew(y);
  // insert geresh before last letter: תשפו → תשפ״ו
  if (s.length === 1) return s + '׳';
  return s.slice(0, -1) + '״' + s.slice(-1);
}

function dayToHebrew(day: number): string {
  const s = numToHebrew(day);
  return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
}

// "26 Tamuz 5786" → "כ״ו תמוז תשפ״ו"
function translitToHebrew(hdate: string): string {
  const parts = hdate.split(' ');
  if (parts.length < 3) return hdate;
  const day = parseInt(parts[0], 10);
  const monthKey = parts.slice(1, -1).join(' ');
  const year = parseInt(parts[parts.length - 1], 10);
  const monthHe = MONTH_HE[monthKey] ?? monthKey;
  return `${dayToHebrew(day)} ${monthHe} ${yearToHebrew(year)}`;
}

function isParashaStillValid(parashaDate: string): boolean {
  const shabbat = new Date(parashaDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return shabbat >= today;
}

function toSefariaUrl(title: string): string {
  const slug = title.replace(/^Parashat\s+/i, '').trim().replace(/\s+/g, '_');
  return `https://www.sefaria.org/Parashat_${slug}?lang=he`;
}

function toTopicSlug(title: string): string {
  return title.replace(/^Parashat\s+/i, 'parashat-').toLowerCase().replace(/\s+/g, '-');
}

export function useParasha() {
  const [parasha, setParasha] = useState<ParashaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: ParashaData = JSON.parse(cached);
          if (isParashaStillValid(parsed.date)) {
            if (!cancelled) setParasha(parsed);
            setLoading(false);
            return;
          }
        }
      } catch {}

      try {
        const res = await fetch(HEBCAL_URL);
        const json = await res.json();
        const items: any[] = json.items ?? [];
        const parashaItem = items.find((i) => i.category === 'parashat');

        if (parashaItem) {
          const rawHdate: string = parashaItem.hdate ?? '';
          const englishTitle: string = parashaItem.title_orig ?? parashaItem.title;
          const data: ParashaData = {
            name: englishTitle,
            hebrewName: parashaItem.hebrew ?? parashaItem.title,
            date: parashaItem.date,
            hebrewDate: rawHdate ? translitToHebrew(rawHdate) : '',
            sefariaUrl: toSefariaUrl(englishTitle),
            topicSlug: toTopicSlug(englishTitle),
          };
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
          if (!cancelled) setParasha(data);
        }
      } catch {}

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { parasha, loading };
}
