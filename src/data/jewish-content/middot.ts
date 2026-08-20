// Mussar / Middot hierarchy — used for the weekly middah picker in קרוב ללב.
// MiddahGroup = sub-category within the mussar_middot CategoryGroup.
// MiddahDef.topic maps to an existing Topic value in types.ts.

export type MiddahGroup = 'midot_adam' | 'ben_adam_lachavero' | 'shmirat_halashon';

export interface MiddahGroupMeta {
  id: MiddahGroup;
  label: string;
  description: string;
}

export interface MiddahDef {
  topic: string;
  label: string;
  group: MiddahGroup;
}

export const MIDDAH_GROUPS: MiddahGroupMeta[] = [
  {
    id: 'midot_adam',
    label: 'מידות האדם',
    description: 'עבודה על המידות הפנימיות שלנו',
  },
  {
    id: 'ben_adam_lachavero',
    label: 'בין אדם לחברו',
    description: 'כיצד אנחנו מתנהגים כלפי הסובבים אותנו',
  },
  {
    id: 'shmirat_halashon',
    label: 'שמירת הלשון',
    description: 'שמירה על הדיבור וכוחו',
  },
];

export const MIDDOT: MiddahDef[] = [
  // מידות האדם
  { topic: 'kaas', label: 'כעס', group: 'midot_adam' },
  { topic: 'anavah', label: 'ענווה', group: 'midot_adam' },
  { topic: 'kinah', label: 'קנאה', group: 'midot_adam' },
  { topic: 'savlanut', label: 'סבלנות', group: 'midot_adam' },
  { topic: 'simcha', label: 'שמחה', group: 'midot_adam' },
  // בין אדם לחברו
  { topic: 'chessed', label: 'חסד', group: 'ben_adam_lachavero' },
  { topic: 'hakarat_hatov', label: 'הכרת הטוב', group: 'ben_adam_lachavero' },
  { topic: 'ahavat_yisrael', label: 'אהבת ישראל', group: 'ben_adam_lachavero' },
  { topic: 'shalom_bayit', label: 'שלום בית', group: 'ben_adam_lachavero' },
  // שמירת הלשון
  { topic: 'lashon_hara', label: 'לשון הרע', group: 'shmirat_halashon' },
];

export const MIDDAH_LABELS: Record<string, string> = Object.fromEntries(
  MIDDOT.map((m) => [m.topic, m.label])
);

// Hebrew day names for the card header
export const HEB_DAY_NAMES = [
  'יום ראשון',
  'יום שני',
  'יום שלישי',
  'יום רביעי',
  'יום חמישי',
  'יום שישי',
  'שבת',
];
