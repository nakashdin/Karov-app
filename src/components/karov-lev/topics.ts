import { Topic } from '../../data/jewish-content/types';
import type { AccentName, AccentToken, Tokens } from '../../theme';

export type UITopicGroup = {
  id: string;
  label: string;
  emoji: string;
  /** Which theme accent this group wears. Resolved per colour scheme. */
  accent: AccentName;
  topics: Topic[]; // internal Topic values this group maps to
};

/** Used when an item carries no topic we have a group for. */
const DEFAULT_ACCENT: AccentName = 'violet';

export const UI_TOPIC_GROUPS: UITopicGroup[] = [
  {
    id: 'emunah-bitachon',
    label: 'אמונה וביטחון',
    emoji: '✨',
    accent: 'violet',
    topics: ['emunah', 'bitachon'],
  },
  {
    id: 'tefilla',
    label: 'תפילה',
    emoji: '🕊️',
    accent: 'blue',
    topics: ['tefilla'],
  },
  {
    id: 'middot',
    label: 'מידות',
    emoji: '⚖️',
    accent: 'emerald',
    topics: ['middot', 'anavah', 'kaas', 'savlanut', 'kinah'],
  },
  {
    id: 'lashon-hara',
    label: 'שמירת הלשון',
    emoji: '🤫',
    accent: 'cyan',
    topics: ['lashon_hara'],
  },
  {
    id: 'parnasa',
    label: 'פרנסה והשתדלות',
    emoji: '💼',
    accent: 'earth',
    topics: ['parnasa'],
  },
  {
    id: 'simcha',
    label: 'שמחה והכרת הטוב',
    emoji: '🌟',
    accent: 'gold',
    topics: ['simcha', 'hakarat_hatov'],
  },
  {
    id: 'teshuva',
    label: 'תשובה',
    emoji: '🔄',
    accent: 'berry',
    topics: ['teshuva'],
  },
  {
    id: 'ben-adam',
    label: 'בין אדם לחברו',
    emoji: '🤝',
    accent: 'orange',
    topics: ['ben_adam_lachavero', 'chessed', 'ahavat_yisrael', 'tzedaka', 'shalom_bayit'],
  },
  {
    id: 'shabbat',
    label: 'שבת',
    emoji: '🕯️',
    accent: 'indigo',
    topics: ['shabbat', 'moadim'],
  },
  {
    id: 'talmud-torah',
    label: 'לימוד תורה',
    emoji: '📖',
    accent: 'green',
    topics: ['talmud_torah', 'yirat_shamayim', 'ahavat_hashem'],
  },
];

/** The accent for a content item, from its first matching topic group. */
export function getTopicAccent(topics: Topic[]): AccentName {
  for (const topic of topics) {
    for (const group of UI_TOPIC_GROUPS) {
      if (group.topics.includes(topic)) return group.accent;
    }
  }
  return DEFAULT_ACCENT;
}

/** Resolved colours for a content item under the active colour scheme. */
export function getTopicStyle(topics: Topic[], theme: Tokens): AccentToken {
  return theme.accent[getTopicAccent(topics)];
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
