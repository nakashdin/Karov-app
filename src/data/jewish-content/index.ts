import { HALACHA_ITEMS } from './catalog/halacha';
import { PASUK_ITEMS } from './catalog/pasuk';
import { MUSSAR_ITEMS } from './catalog/mussar';
import { THOUGHT_ITEMS } from './catalog/thought';
import { BLESSING_ITEMS } from './catalog/blessing';
import { JewishContentItem } from './types';

export const ALL_JEWISH_CONTENT: JewishContentItem[] = [
  ...HALACHA_ITEMS,
  ...PASUK_ITEMS,
  ...MUSSAR_ITEMS,
  ...THOUGHT_ITEMS,
  ...BLESSING_ITEMS,
];

export * from './types';
