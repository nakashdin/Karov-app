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
  rabanut: 'רבנות מקומית',
  rabanut_mehadrin: 'רבנות מהדרין',
  mehadrin: 'מהדרין',
  badatz_edah: 'בד״ץ העדה החרדית',
  badatz_beit_yosef: 'בד״ץ בית יוסף',
  chatam_sofer: 'בד״ץ חתם סופר',
  other: 'אחר',
};

/** All category keys in display order. */
export const ALL_CATEGORIES: KosherCategory[] = ['meat', 'dairy', 'parve'];

/** All kosher-type keys in display order. */
export const ALL_KOSHER_TYPES: KosherType[] = [
  'rabanut',
  'rabanut_mehadrin',
  'mehadrin',
  'badatz_edah',
  'badatz_beit_yosef',
  'chatam_sofer',
  'other',
];
