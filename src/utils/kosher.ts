import { colors } from '../theme';
import { KosherCategory, KosherType } from '../types';

/** Hebrew label for a food category. */
export const categoryLabel: Record<KosherCategory, string> = {
  meat: 'בשרי',
  dairy: 'חלבי',
  parve: 'פרווה',
};

/** Accent color for a food category. */
export const categoryColor: Record<KosherCategory, string> = {
  meat: colors.meat,
  dairy: colors.dairy,
  parve: colors.parve,
};

/** Hebrew label for a kosher certification type. */
export const kosherTypeLabel: Record<KosherType, string> = {
  badatz_beit_yosef: 'בד״ץ בית יוסף',
  badatz_edah: 'בד״ץ העדה החרדית',
  badatz_rubin: 'בד״ץ הרב רובין',
  badatz_kehilot: 'בד״ץ קהילות',
  rav_landa: 'הרב לנדא',
  rav_machpud: 'הרב מחפוד',
  chatam_sofer: 'חוג חתם סופר',
  rabanut: 'רבנות',
  rabanut_beit_shean: 'רבנות בית שאן',
  rabanut_mehadrin: 'רבנות מהדרין',
  rabanut_mehadrin_jerusalem: 'רבנות מהדרין ירושלים',
  rabanut_mekomi: 'רבנות מקומי',
  rabanut_afula: 'רבנות עפולה',
  rabanut_tel_aviv: 'רבנות תל אביב',
  mehadrin: 'מהדרין',
  other: 'אחר',
};

/** All category keys in display order. */
export const ALL_CATEGORIES: KosherCategory[] = ['meat', 'dairy', 'parve'];

/** Kosher-type keys shown in the restaurant kashruyot filter screen (display order). */
export const KASHRUYOT_FILTER_TYPES: KosherType[] = [
  'badatz_beit_yosef',
  'badatz_edah',
  'badatz_rubin',
  'badatz_kehilot',
  'rav_landa',
  'rav_machpud',
  'chatam_sofer',
  'rabanut',
  'rabanut_beit_shean',
  'rabanut_mehadrin',
  'rabanut_mehadrin_jerusalem',
  'rabanut_mekomi',
  'rabanut_afula',
  'rabanut_tel_aviv',
];

/** All kosher-type keys in display order. */
export const ALL_KOSHER_TYPES: KosherType[] = [
  ...KASHRUYOT_FILTER_TYPES,
  'mehadrin',
  'other',
];
