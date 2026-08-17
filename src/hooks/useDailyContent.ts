import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContentHistory } from '../data/jewish-content/types';
import { contentRepository, getTodayDate } from '../data/jewish-content/repository';
import { getOrCreateDeviceId } from './useDeviceId';
import { loadHistory } from './useContentHistory';

// ─── Legacy types (unchanged — backward compat for DailyCarousel) ─────────────

export type ContentType = 'halacha' | 'pasuk' | 'mussar' | 'thought' | 'blessing';

export interface DailyContentItem {
  title: string;
  body: string;
  source?: string;
}

export interface DailyContent {
  type: ContentType;
  typeName: string;
  item: DailyContentItem;
  setType: (t: ContentType) => void;
  isReady: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PREF_KEY = '@karov/dailyContentType';

export const TYPE_NAMES: Record<ContentType, string> = {
  halacha: 'הלכה יומית',
  pasuk: 'פסוק יומי',
  mussar: 'מוסר יומי',
  thought: 'מחשבה יומית',
  blessing: 'ברכה יומית',
};

export const TYPE_ICONS: Record<ContentType, string> = {
  halacha: '📘',
  pasuk: '✡️',
  mussar: '💭',
  thought: '🌟',
  blessing: '🙏',
};

const VALID_TYPES: ContentType[] = ['halacha', 'pasuk', 'mussar', 'thought', 'blessing'];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDailyContent(): DailyContent {
  const [type, setTypeState] = useState<ContentType>('halacha');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [history, setHistory] = useState<ContentHistory>({ entries: {} });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PREF_KEY).catch(() => null),
      getOrCreateDeviceId(),
      loadHistory(),
    ]).then(([storedType, id, hist]) => {
      if (storedType && (VALID_TYPES as string[]).includes(storedType)) {
        setTypeState(storedType as ContentType);
      }
      setDeviceId(id);
      setHistory(hist);
      setIsReady(true);
    }).catch(() => {
      setIsReady(true);
    });
  }, []);

  const date = getTodayDate();

  // Don't compute content until deviceId is loaded — avoids showing item A
  // (computed with 'default_device') then immediately re-rendering with item B
  // (computed with the real deviceId). isReady gates the UI instead.
  const jewishItem = deviceId !== null
    ? contentRepository.getDailyItemByType(type, { deviceId, date, history })
    : null;

  const sourceDisplay =
    jewishItem === null ||
    jewishItem.source.version.licenseStatus === 'karov_original' ||
    !jewishItem.source.reference
      ? undefined
      : jewishItem.source.reference;

  const item: DailyContentItem = {
    title: jewishItem?.title ?? '',
    body: jewishItem?.karovSummary ?? '',
    source: sourceDisplay,
  };

  const setType = (t: ContentType) => {
    setTypeState(t);
    AsyncStorage.setItem(PREF_KEY, t).catch(() => {});
  };

  return { type, typeName: TYPE_NAMES[type], item, setType, isReady };
}
