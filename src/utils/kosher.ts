import { colors } from '../theme';
import { KosherCategory, KosherType, Place } from '../types';

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
  tzohar: 'צהר',
  kosher: 'כשר',
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

/**
 * Groups of raw kosherType values that map to a single filter chip.
 * Key = the KosherType stored in PlaceFilters.kosherType when the chip is selected.
 * Value = all raw data values that match that chip.
 */
export const KOSHER_GROUP_MEMBERS: Partial<Record<KosherType, KosherType[]>> = {
  rabanut: ['rabanut', 'rabanut_mekomi', 'rabanut_beit_shean', 'rabanut_afula', 'rabanut_tel_aviv', 'kosher'],
  rabanut_mehadrin: ['rabanut_mehadrin', 'rabanut_mehadrin_jerusalem'],
  badatz_edah: ['badatz_edah', 'badatz_beit_yosef', 'badatz_rubin', 'badatz_kehilot'],
};

/** Display label override for grouped filter chips (replaces kosherTypeLabel for the group key). */
export const KOSHER_GROUP_LABEL: Partial<Record<KosherType, string>> = {
  rabanut: 'רבנות',
  rabanut_mehadrin: 'רבנות מהדרין',
  badatz_edah: 'בד״ץ',
};

/** Which group key represents a raw kosherType (reverse lookup). */
export const RAW_TO_GROUP: Partial<Record<KosherType, KosherType>> = Object.fromEntries(
  (Object.entries(KOSHER_GROUP_MEMBERS) as [KosherType, KosherType[]][])
    .flatMap(([group, members]) => members.map(m => [m, group]))
);

/**
 * Given the full set of raw kosherTypes present in the data, return the
 * deduplicated list of filter-chip keys (groups + ungrouped) in display order.
 */
export function groupedKosherTypes(rawTypes: Set<KosherType>): KosherType[] {
  const seen = new Set<KosherType>();
  const result: KosherType[] = [];

  const ORDER: KosherType[] = [
    'badatz_edah', 'rabanut_mehadrin', 'rabanut',
    'rav_landa', 'rav_machpud', 'chatam_sofer', 'tzohar', 'mehadrin', 'other',
  ];

  for (const key of ORDER) {
    const members = KOSHER_GROUP_MEMBERS[key];
    if (members) {
      if (members.some(m => rawTypes.has(m)) && !seen.has(key)) {
        seen.add(key);
        result.push(key);
      }
    } else {
      if (rawTypes.has(key) && !seen.has(key)) {
        seen.add(key);
        result.push(key);
      }
    }
  }
  return result;
}

/** Human-readable kosher label for a place card, using the new structured fields.
 *  Falls back to kosherTypeLabel if new fields are absent. */
export function getKosherLabel(place: Pick<Place, 'kosherType' | 'kosherLevel' | 'kosherAuthorityGroup' | 'kosherAuthority'>): string | null {
  const { kosherLevel, kosherAuthorityGroup, kosherAuthority } = place;

  // Use structured fields when available
  if (kosherAuthorityGroup || kosherLevel) {
    if (kosherAuthority) {
      const byAuthority: Record<string, string> = {
        rabbinate_tel_aviv:      'רבנות תל אביב',
        rabbinate_jerusalem:     'רבנות ירושלים מהדרין',
        badatz_beit_yosef:       'בד״ץ בית יוסף',
        badatz_edah_hachareidis: 'בד״ץ העדה החרדית',
        yoreh_deah_mahfoud:      'הרב מחפוד',
        chatam_sofer:            'חוג חתם סופר',
        badatz_kehilot:          'קהילות',
        badatz_rubin:            'הרב רובין',
        tzohar:                  'צהר',
      };
      const label = byAuthority[kosherAuthority];
      if (label) return label;
    }

    if (kosherAuthorityGroup === 'rabbinate') {
      return kosherLevel === 'mehadrin' ? 'רבנות מהדרין' : 'רבנות';
    }
    if (kosherAuthorityGroup === 'badatz') return 'בד״ץ';
    if (kosherAuthorityGroup === 'independent') return kosherLevel === 'mehadrin' ? 'מהדרין' : 'כשר';
    // unknown group
    if (kosherLevel === 'mehadrin') return 'מהדרין';
    return 'גוף כשרות לא ידוע';
  }

  // Legacy fallback
  return place.kosherType ? (kosherTypeLabel[place.kosherType] ?? null) : null;
}

/** Kosher-type keys shown in the restaurant kashruyot filter screen (display order). */
export const KASHRUYOT_FILTER_TYPES: KosherType[] = [
  'badatz_beit_yosef',
  'badatz_edah',
  'badatz_rubin',
  'badatz_kehilot',
  'rav_landa',
  'rav_machpud',
  'chatam_sofer',
  'kosher',
  'rabanut',
  'rabanut_beit_shean',
  'rabanut_mehadrin',
  'rabanut_mehadrin_jerusalem',
  'rabanut_mekomi',
  'rabanut_afula',
  'rabanut_tel_aviv',
  'tzohar',
];

/** All kosher-type keys in display order. */
export const ALL_KOSHER_TYPES: KosherType[] = [
  ...KASHRUYOT_FILTER_TYPES,
  'mehadrin',
  'other',
];
