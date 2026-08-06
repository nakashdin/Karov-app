import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, sizes, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { useFilters } from '../context/FiltersContext';
import { useCities } from '../hooks/useCities';
import { emptyFilters, KosherCategory, PlaceFilters } from '../types';
import { ALL_CATEGORIES, categoryLabel, KOSHER_BODY_LABEL } from '../utils/kosher';
import { Chip } from './Chip';

const DISTANCE_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: '5 ק״מ',   value: 5 },
  { label: '10 ק״מ',  value: 10 },
  { label: '20 ק״מ',  value: 20 },
  { label: '50 ק״מ',  value: 50 },
  { label: '100 ק״מ', value: 100 },
  { label: 'הכל',     value: null },
];

const CUISINE_OPTIONS: Array<{ key: string; label: string; emoji: string }> = [
  { key: 'burger', label: 'בורגר',  emoji: '🍔' },
  { key: 'pizza',  label: 'פיצה',   emoji: '🍕' },
  { key: 'sushi',  label: 'אסייתי', emoji: '🥢' },
  { key: 'meat',   label: 'בשרים',  emoji: '🥩' },
];

// Ordered list of authority filter options — only bodies that exist in the data.
// 'rabbinate' and 'unknown' match by kosherAuthorityGroup; the rest match by kosherAuthority.
const AUTHORITY_OPTIONS: Array<{ key: string; label: string }> = Object.entries(KOSHER_BODY_LABEL).map(
  ([key, label]) => ({ key, label })
);

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  isFoodMode?: boolean;
  hasLocation?: boolean;
}

export function FilterSheet({
  visible,
  onClose,
  isFoodMode = false,
  hasLocation = false,
}: FilterSheetProps) {
  const { t } = useLanguage();
  const { filters, setFilters, reset } = useFilters();
  const { cities } = useCities();

  const [draft, setDraft] = useState<PlaceFilters>(filters);
  const [citySearch, setCitySearch] = useState('');
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setCitySearch('');
      setCityPickerOpen(false);
    }
  }, [visible, filters]);

  const toggle = <K extends keyof PlaceFilters>(key: K, value: PlaceFilters[K]) =>
    setDraft(prev => ({ ...prev, [key]: prev[key] === value ? null : value }));

  const filteredCities = useMemo(() => {
    const q = citySearch.trim();
    if (!q) return cities;
    const lq = q.toLowerCase();
    return cities.filter(c => c.name.includes(q) || c.name.toLowerCase().includes(lq));
  }, [cities, citySearch]);

  const apply = () => { setFilters(draft); onClose(); };

  const clear = () => {
    reset();
    setDraft({ ...emptyFilters, query: draft.query });
    setCitySearch('');
  };

  const selectedCityName = draft.cityId
    ? cities.find(c => c.id === draft.cityId)?.name ?? draft.cityId
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>סינון תוצאות</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Distance */}
          {hasLocation && (
            <Section title="טווח חיפוש">
              <View style={styles.distanceRow}>
                {DISTANCE_OPTIONS.map(opt => {
                  const active = draft.distanceKm === opt.value;
                  return (
                    <Pressable
                      key={String(opt.value)}
                      style={[styles.distChip, active && styles.distChipActive]}
                      onPress={() => setDraft(prev => ({ ...prev, distanceKm: opt.value }))}
                    >
                      <Text style={[styles.distChipText, active && styles.distChipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          )}

          {/* City — inline dropdown */}
          <Section title="עיר">
            <Pressable
              style={[styles.cityPickerBtn, cityPickerOpen && styles.cityPickerBtnOpen]}
              onPress={() => setCityPickerOpen(o => !o)}
            >
              <Ionicons
                name={cityPickerOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={selectedCityName ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.cityPickerBtnText, !!selectedCityName && styles.cityPickerBtnTextSelected]}>
                {selectedCityName ?? 'בחר עיר, קיבוץ, מושב...'}
              </Text>
              {selectedCityName ? (
                <Pressable
                  hitSlop={10}
                  onPress={e => { e.stopPropagation(); setDraft(prev => ({ ...prev, cityId: null })); }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.primary} />
                </Pressable>
              ) : (
                <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              )}
            </Pressable>

            {cityPickerOpen && (
              <View style={styles.cityDropdown}>
                <View style={styles.citySearchPill}>
                  <Ionicons name="search" size={14} color={colors.textMuted} />
                  <TextInput
                    style={styles.citySearchInput}
                    placeholder="הקלד לסינון..."
                    placeholderTextColor={colors.textMuted}
                    value={citySearch}
                    onChangeText={setCitySearch}
                    textAlign="right"
                  />
                  {citySearch.length > 0 && (
                    <Pressable onPress={() => setCitySearch('')} hitSlop={8}>
                      <Ionicons name="close" size={14} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>
                <ScrollView
                  style={styles.cityList}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  {filteredCities.map(city => (
                    <Pressable
                      key={city.id}
                      style={[styles.cityRow, draft.cityId === city.id && styles.cityRowActive]}
                      onPress={() => {
                        setDraft(prev => ({ ...prev, cityId: city.id }));
                        setCitySearch('');
                        setCityPickerOpen(false);
                      }}
                    >
                      {draft.cityId === city.id && (
                        <Ionicons name="checkmark" size={14} color={colors.primary} />
                      )}
                      <Text style={[styles.cityName, draft.cityId === city.id && styles.cityNameActive]}>
                        {city.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </Section>

          {/* Kashrut filters */}
          {isFoodMode && (
            <>
              <Section title="רמת כשרות">
                <Chip
                  label="מהדרין בלבד"
                  selected={draft.mehadrinOnly}
                  onPress={() => setDraft(prev => ({ ...prev, mehadrinOnly: !prev.mehadrinOnly }))}
                />
              </Section>
              <Section title="גוף כשרות">
                <View style={styles.chipsWrap}>
                  {AUTHORITY_OPTIONS.map(opt => (
                    <Chip
                      key={opt.key}
                      label={opt.label}
                      selected={draft.kosherAuthorityGroup === opt.key}
                      onPress={() => setDraft(prev => ({
                        ...prev,
                        kosherAuthorityGroup: prev.kosherAuthorityGroup === opt.key ? null : opt.key,
                      }))}
                    />
                  ))}
                </View>
              </Section>
            </>
          )}

          {/* Cuisine */}
          {isFoodMode && (
            <Section title="סוג מטבח">
              <View style={styles.chipsWrap}>
                {CUISINE_OPTIONS.map(opt => (
                  <Chip
                    key={opt.key}
                    label={`${opt.emoji} ${opt.label}`}
                    selected={draft.cuisineTag === opt.key}
                    onPress={() => setDraft(prev => ({
                      ...prev,
                      cuisineTag: prev.cuisineTag === opt.key ? null : opt.key,
                    }))}
                  />
                ))}
              </View>
            </Section>
          )}

          {/* Category (meat/dairy/parve) */}
          {isFoodMode && (
            <Section title="קטגוריה">
              <View style={styles.chipsWrap}>
                {ALL_CATEGORIES.map((c: KosherCategory) => (
                  <Chip
                    key={c}
                    label={categoryLabel[c]}
                    selected={draft.category === c}
                    onPress={() => toggle('category', c)}
                  />
                ))}
              </View>
            </Section>
          )}

        </ScrollView>

        <View style={styles.actions}>
          <Pressable style={styles.clearBtn} onPress={clear}>
            <Text style={styles.clearText}>{t.filters.clear}</Text>
          </Pressable>
          <Pressable style={styles.applyBtn} onPress={apply}>
            <Text style={styles.applyText}>{t.filters.apply}</Text>
          </Pressable>
        </View>
      </View>

    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceMuted,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.text,
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  // Distance
  distanceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  distChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  distChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  distChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  distChipTextActive: { color: '#fff' },

  // City inline dropdown
  cityPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityPickerBtnOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: 'transparent',
  },
  cityPickerBtnText: { flex: 1, fontSize: 14, color: colors.textMuted, textAlign: 'right', marginHorizontal: 8 },
  cityPickerBtnTextSelected: { color: colors.primary, fontWeight: '700' },
  cityDropdown: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  citySearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  citySearchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },
  cityList: { maxHeight: 220 },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    justifyContent: 'flex-end',
  },
  cityRowActive: { backgroundColor: colors.primaryLight },
  cityName: { fontSize: 14, color: colors.text, textAlign: 'right' },
  cityNameActive: { fontWeight: '700', color: colors.primary },
  cityHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 10 },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  clearBtn: {
    minHeight: sizes.button,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  applyBtn: {
    flex: 1,
    minHeight: sizes.button,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { fontSize: 15, fontWeight: '800', color: colors.textInverse, letterSpacing: -0.2 },
});
