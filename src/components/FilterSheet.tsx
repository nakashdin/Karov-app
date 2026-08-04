import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, sizes, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { useFilters } from '../context/FiltersContext';
import { useCities } from '../hooks/useCities';
import { emptyFilters, KosherCategory, KosherType, PlaceFilters, PlaceType } from '../types';
import { ALL_CATEGORIES, categoryLabel, kosherTypeLabel } from '../utils/kosher';
import { placeTypeLabel } from '../utils/placeType';
import { Chip } from './Chip';

const ALL_PLACE_TYPES: PlaceType[] = ['restaurant', 'synagogue', 'mikveh', 'chabad_house', 'tzaddik_grave'];

const CUISINE_OPTIONS: Array<{ key: string; label: string; emoji: string }> = [
  { key: 'coffee_shop', label: 'קפה',       emoji: '☕' },
  { key: 'burger',      label: 'בורגר',      emoji: '🍔' },
  { key: 'pizza',       label: 'פיצה',       emoji: '🍕' },
  { key: 'street_food', label: 'מזון רחוב',  emoji: '🥙' },
  { key: 'sushi',       label: 'סושי',       emoji: '🍣' },
  { key: 'meat',        label: 'בשרים',      emoji: '🥩' },
];

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  isFoodMode?: boolean;
  availableKosherTypes?: KosherType[];
}

/** Bottom-sheet modal for city / kosher-type / category filters. */
export function FilterSheet({ visible, onClose, isFoodMode = false, availableKosherTypes }: FilterSheetProps) {
  const { t } = useLanguage();
  const { filters, setFilters, reset } = useFilters();
  const { cities } = useCities();

  // Edit a local draft; commit only on "apply".
  const [draft, setDraft] = useState<PlaceFilters>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const toggle = <K extends keyof PlaceFilters>(
    key: K,
    value: PlaceFilters[K],
  ) =>
    setDraft((prev) => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }));

  const apply = () => {
    setFilters(draft);
    onClose();
  };

  const clear = () => {
    reset();
    setDraft({ ...emptyFilters, query: draft.query });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{t.filters.title}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {!isFoodMode && (
            <Section title={t.filters.placeType}>
              {ALL_PLACE_TYPES.map((pt: PlaceType) => (
                <Chip
                  key={pt}
                  label={placeTypeLabel[pt]}
                  selected={draft.placeType === pt}
                  onPress={() => toggle('placeType', pt)}
                />
              ))}
            </Section>
          )}

          {isFoodMode && (
            <Section title="סוג מטבח">
              {CUISINE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.key}
                  label={`${opt.emoji} ${opt.label}`}
                  selected={draft.cuisineTag === opt.key}
                  onPress={() => setDraft((prev) => ({
                    ...prev,
                    cuisineTag: prev.cuisineTag === opt.key ? null : opt.key,
                  }))}
                />
              ))}
            </Section>
          )}

          {isFoodMode && (
            <Section title={t.filters.category}>
              {ALL_CATEGORIES.map((c: KosherCategory) => (
                <Chip
                  key={c}
                  label={categoryLabel[c]}
                  selected={draft.category === c}
                  onPress={() => toggle('category', c)}
                />
              ))}
            </Section>
          )}

          {isFoodMode && availableKosherTypes && availableKosherTypes.length > 0 && (
            <Section title={t.filters.kosherType}>
              {availableKosherTypes.map((k: KosherType) => (
                <Chip
                  key={k}
                  label={kosherTypeLabel[k] ?? k}
                  selected={draft.kosherType === k}
                  onPress={() => toggle('kosherType', k)}
                />
              ))}
            </Section>
          )}

          <Section title={t.filters.city}>
            {cities.map((city) => (
              <Chip
                key={city.id}
                label={city.name}
                selected={draft.cityId === city.id}
                onPress={() => toggle('cityId', city.id)}
              />
            ))}
          </Section>
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chipsWrap}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '80%',
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
    marginBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.text,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
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
  clearText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  applyBtn: {
    flex: 1,
    minHeight: sizes.button,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: -0.2,
  },
});
