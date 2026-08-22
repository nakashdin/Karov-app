import { useEffect, useState } from 'react';
import { hebcal, sefaria } from '../shared/api';
import { getJSON, setJSON, StorageKey } from '../shared/storage';

export interface ParashaData {
  name: string;
  hebrewName: string;
  date: string;
  hebrewDate: string;
  sefariaUrl: string;
  topicSlug: string; // e.g. "parashat-matot-masei" for Sefaria topics API
}

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

function toTopicSlug(title: string): string {
  return title.replace(/^Parashat\s+/i, 'parashat-').toLowerCase().replace(/\s+/g, '-');
}

const isParashaData = (v: unknown): v is ParashaData =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as ParashaData).name === 'string' &&
  typeof (v as ParashaData).date === 'string';

export function useParasha() {
  const [parasha, setParasha] = useState<ParashaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      const cached = await getJSON<ParashaData | null>(StorageKey.parasha, null, isParashaData);
      if (cached && isParashaStillValid(cached.date)) {
        if (!cancelled) {
          setParasha(cached);
          setLoading(false);
        }
        return;
      }

      try {
        const json = await hebcal.fetchShabbatIsrael({ signal: controller.signal });
        const parashaItem = (json.items ?? []).find((i) => i.category === 'parashat');

        if (parashaItem) {
          const rawHdate = parashaItem.hdate ?? '';
          const englishTitle = parashaItem.title_orig ?? parashaItem.title;
          const data: ParashaData = {
            name: englishTitle,
            hebrewName: parashaItem.hebrew ?? parashaItem.title,
            date: parashaItem.date,
            hebrewDate: rawHdate ? translitToHebrew(rawHdate) : '',
            sefariaUrl: sefaria.parashaPageUrl(englishTitle),
            topicSlug: toTopicSlug(englishTitle),
          };
          await setJSON(StorageKey.parasha, data);
          if (!cancelled) setParasha(data);
        }
      } catch {
        // Last week's cached parasha is better than nothing; the card hides
        // itself entirely if there has never been one.
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return { parasha, loading };
}
