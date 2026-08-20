import { CategoryGroup, Topic } from './types';

export interface CategoryGroupMeta {
  id: CategoryGroup;
  label: string;
  description: string;
  emoji: string;
  color: string;
  backgroundColor: string;
}

export const CATEGORY_GROUPS: CategoryGroupMeta[] = [
  {
    id: 'emunah_bitachon',
    label: 'אמונה וביטחון',
    description: 'חיזוק האמונה, ביטחון בה׳, השגחה פרטית',
    emoji: '✨',
    color: '#7B5EA7',
    backgroundColor: '#F2EEFA',
  },
  {
    id: 'mussar_middot',
    label: 'מוסר ומידות',
    description: 'עבודת המידות, שמירת הלשון, בין אדם לחברו',
    emoji: '🌱',
    color: '#2E7D52',
    backgroundColor: '#E8F5EE',
  },
  {
    id: 'tefilla',
    label: 'תפילה',
    description: 'כוונה בתפילה, קשר עם הבורא, ברכות ותחינות',
    emoji: '🙏',
    color: '#1E6A9E',
    backgroundColor: '#E8F2FB',
  },
  {
    id: 'shabbat_moadim',
    label: 'שבת ומועדים',
    description: 'קדושת השבת, חגים ומועדי ישראל',
    emoji: '🕯️',
    color: '#5B4FCF',
    backgroundColor: '#EEECFA',
  },
];

// Maps each Topic → CategoryGroup(s) it belongs to.
// A topic can map to multiple groups (e.g. yirat_shamayim → emunah + tefilla).
const TOPIC_TO_CATEGORIES: Record<Topic, CategoryGroup[]> = {
  emunah: ['emunah_bitachon'],
  bitachon: ['emunah_bitachon'],
  yirat_shamayim: ['emunah_bitachon', 'tefilla'],
  ahavat_hashem: ['emunah_bitachon', 'tefilla'],
  tefilla: ['tefilla'],
  middot: ['mussar_middot'],
  lashon_hara: ['mussar_middot'],
  ben_adam_lachavero: ['mussar_middot'],
  chessed: ['mussar_middot'],
  tzedaka: ['mussar_middot'],
  ahavat_yisrael: ['mussar_middot'],
  shalom_bayit: ['mussar_middot'],
  kaas: ['mussar_middot'],
  savlanut: ['mussar_middot'],
  anavah: ['mussar_middot'],
  kinah: ['mussar_middot'],
  hakarat_hatov: ['mussar_middot', 'emunah_bitachon'],
  simcha: ['mussar_middot', 'shabbat_moadim'],
  shabbat: ['shabbat_moadim'],
  moadim: ['shabbat_moadim'],
  teshuva: ['emunah_bitachon', 'mussar_middot'],
  parnasa: ['emunah_bitachon'],
  talmud_torah: ['emunah_bitachon'],
};

export function getTopicsForCategories(groups: CategoryGroup[]): Topic[] {
  if (groups.length === 0) return [];
  const set = new Set<Topic>();
  for (const [topic, cats] of Object.entries(TOPIC_TO_CATEGORIES) as [Topic, CategoryGroup[]][]) {
    if (cats.some((c) => groups.includes(c))) {
      set.add(topic);
    }
  }
  return Array.from(set);
}

export function getCategoriesForTopic(topic: Topic): CategoryGroup[] {
  return TOPIC_TO_CATEGORIES[topic] ?? [];
}

export function itemMatchesCategories(topics: Topic[], groups: CategoryGroup[]): boolean {
  if (groups.length === 0) return true;
  return topics.some((t) => getCategoriesForTopic(t).some((c) => groups.includes(c)));
}

// Feed weighting config — controls preference vs discovery ratio
export const FEED_CONFIG = {
  preferenceWeight: 200,   // score bonus for items matching selected category groups
  discoveryWeight: 0,      // items outside preferences still appear (no penalty), creating discovery
};
