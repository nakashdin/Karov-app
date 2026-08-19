import { Topic } from '../../data/jewish-content/types';

export type UITopicGroup = {
  id: string;
  label: string;
  emoji: string;
  color: string;   // text / icon color
  bg: string;      // chip / card background
  topics: Topic[]; // internal Topic values this group maps to
};

export const UI_TOPIC_GROUPS: UITopicGroup[] = [
  {
    id: 'emunah-bitachon',
    label: 'אמונה וביטחון',
    emoji: '✨',
    color: '#7B5EA7',
    bg: '#F2EEFA',
    topics: ['emunah', 'bitachon'],
  },
  {
    id: 'tefilla',
    label: 'תפילה',
    emoji: '🕊️',
    color: '#2A6CA8',
    bg: '#E8F1FC',
    topics: ['tefilla'],
  },
  {
    id: 'middot',
    label: 'מידות',
    emoji: '⚖️',
    color: '#2E7D52',
    bg: '#E8F4EE',
    topics: ['middot', 'anavah', 'kaas', 'savlanut', 'kinah'],
  },
  {
    id: 'lashon-hara',
    label: 'שמירת הלשון',
    emoji: '🤫',
    color: '#0277BD',
    bg: '#E1F5FE',
    topics: ['lashon_hara'],
  },
  {
    id: 'parnasa',
    label: 'פרנסה והשתדלות',
    emoji: '💼',
    color: '#7A5C2E',
    bg: '#F5EEEA',
    topics: ['parnasa'],
  },
  {
    id: 'simcha',
    label: 'שמחה והכרת הטוב',
    emoji: '🌟',
    color: '#B5780A',
    bg: '#FFF8E7',
    topics: ['simcha', 'hakarat_hatov'],
  },
  {
    id: 'teshuva',
    label: 'תשובה',
    emoji: '🔄',
    color: '#B03050',
    bg: '#FEE8EB',
    topics: ['teshuva'],
  },
  {
    id: 'ben-adam',
    label: 'בין אדם לחברו',
    emoji: '🤝',
    color: '#C97A1A',
    bg: '#FFF3E0',
    topics: ['ben_adam_lachavero', 'chessed', 'ahavat_yisrael', 'tzedaka', 'shalom_bayit'],
  },
  {
    id: 'shabbat',
    label: 'שבת',
    emoji: '🕯️',
    color: '#5B4FCF',
    bg: '#EEEDF9',
    topics: ['shabbat', 'moadim'],
  },
  {
    id: 'talmud-torah',
    label: 'לימוד תורה',
    emoji: '📖',
    color: '#1E7A46',
    bg: '#E7F2EB',
    topics: ['talmud_torah', 'yirat_shamayim', 'ahavat_hashem'],
  },
];

/** Returns the style for a content item based on its first matching topic group. */
export function getTopicStyle(topics: Topic[]): { color: string; bg: string } {
  for (const topic of topics) {
    for (const group of UI_TOPIC_GROUPS) {
      if (group.topics.includes(topic)) {
        return { color: group.color, bg: group.bg };
      }
    }
  }
  return { color: '#7B5EA7', bg: '#F2EEFA' };
}

/** Returns the display label for a content item's primary topic group. */
export function getTopicLabel(topics: Topic[]): string {
  for (const topic of topics) {
    for (const group of UI_TOPIC_GROUPS) {
      if (group.topics.includes(topic)) return group.label;
    }
  }
  return 'קרוב ללב';
}

/** Converts selected group IDs → flat Topic[] for repository filtering. */
export function groupIdsToTopics(groupIds: string[]): Topic[] {
  return groupIds.flatMap(id => {
    const g = UI_TOPIC_GROUPS.find(g => g.id === id);
    return g ? g.topics : [];
  });
}
