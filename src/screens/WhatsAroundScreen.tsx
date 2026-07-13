import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { colors, radius, shadow, spacing } from '../theme';
import { usePlaces } from '../hooks/usePlaces';
import { useSharedLocation } from '../context/LocationContext';
import { useFilters } from '../context/FiltersContext';
import { distanceKm } from '../utils/geo';
import { emptyFilters, PlaceType } from '../types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FOOD_TYPES: PlaceType[] = ['restaurant', 'fast_food', 'cafe', 'coffee_cart'];

const CATEGORIES: Array<{
  key: string;
  label: string;
  emoji: string;
  color: string;
  types: PlaceType[];
}> = [
  { key: 'food',         label: 'לאכול',        emoji: '🍽',  color: colors.categoryRestaurant, types: FOOD_TYPES },
  { key: 'synagogue',    label: 'בתי כנסת',      emoji: '🕍',  color: colors.categorySynagogue,  types: ['synagogue'] },
  { key: 'mikveh',       label: 'מקוואות',       emoji: '💧',  color: colors.categoryMikveh,     types: ['mikveh'] },
  { key: 'chabad_house', label: 'בתי חב״ד',      emoji: '🕎',  color: colors.chabad,             types: ['chabad_house'] },
  { key: 'tzaddik_grave',label: 'קברי צדיקים',   emoji: '🪦',  color: colors.tzaddik,            types: ['tzaddik_grave'] },
];

const RADIUS_OPTIONS: Array<{ label: string; km: number | null }> = [
  { label: 'הכל',  km: null },
  { label: '1 ק"מ', km: 1 },
  { label: '3 ק"מ', km: 3 },
  { label: '5 ק"מ', km: 5 },
  { label: '10 ק"מ', km: 10 },
];

export function WhatsAroundScreen() {
  const navigation = useNavigation<Nav>();
  const { places } = usePlaces();
  const { location } = useSharedLocation();
  const { setFilters } = useFilters();
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  const inRadius = useMemo(() => {
    if (!location || radiusKm === null) return places;
    return places.filter(p => distanceKm(location, p.location) <= radiusKm);
  }, [places, location, radiusKm]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      map[cat.key] = inRadius.filter(p => cat.types.includes(p.type)).length;
    }
    return map;
  }, [inRadius]);

  const nearest = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const cat of CATEGORIES) {
      if (!location) { map[cat.key] = null; continue; }
      const inCat = inRadius.filter(p => cat.types.includes(p.type));
      if (!inCat.length) { map[cat.key] = null; continue; }
      map[cat.key] = Math.min(...inCat.map(p => distanceKm(location, p.location)));
    }
    return map;
  }, [inRadius, location]);

  const handlePress = (cat: typeof CATEGORIES[0]) => {
    if (cat.key === 'food') {
      navigation.navigate('FoodList');
      return;
    }
    setFilters({ ...emptyFilters, placeType: cat.types[0] });
    navigation.navigate('List', undefined);
  };

  const formatDist = (d: number) =>
    d < 1 ? `${Math.round(d * 1000)} מ׳` : `${d.toFixed(1)} ק"מ`;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>מה יש סביבי?</Text>
            <Text style={styles.subtitle}>בחר קטגוריה להצגת מקומות קרובים</Text>
          </View>
        </View>

        {/* Radius filter */}
        <View style={styles.radiusSection}>
          <Text style={styles.radiusLabel}>
            <Ionicons name="radio-button-on-outline" size={13} color={colors.textMuted} />
            {'  '}טווח חיפוש
            {!location && <Text style={styles.noLocNote}> (הפעל מיקום לסינון)</Text>}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.radiusChips}
          >
            {RADIUS_OPTIONS.map(opt => {
              const active = opt.km === radiusKm;
              const disabled = opt.km !== null && !location;
              return (
                <Pressable
                  key={opt.label}
                  style={[
                    styles.chip,
                    active && styles.chipActive,
                    disabled && styles.chipDisabled,
                  ]}
                  onPress={() => !disabled && setRadiusKm(opt.km)}
                  disabled={disabled}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive, disabled && styles.chipTextDisabled]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Category cards */}
        {CATEGORIES.map(cat => {
          const dist  = nearest[cat.key];
          const count = counts[cat.key] ?? 0;
          return (
            <Pressable
              key={cat.key}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => handlePress(cat)}
            >
              <View style={[styles.iconBox, { backgroundColor: cat.color + '1A' }]}>
                <Text style={styles.emoji}>{cat.emoji}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.label}>{cat.label}</Text>
                <Text style={styles.countText}>{count.toLocaleString()} מקומות</Text>
                {dist !== null && (
                  <Text style={styles.nearest}>הקרוב ביותר: {formatDist(dist)}</Text>
                )}
              </View>
              <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...shadow.card,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  pressed: { opacity: 0.85 },

  // Radius filter
  radiusSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 8,
    ...shadow.card,
  },
  radiusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'right',
  },
  noLocNote: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '400',
  },
  radiusChips: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.35,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: '#fff',
  },
  chipTextDisabled: {
    color: colors.textMuted,
  },

  // Category card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 26 },
  info: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
  },
  countText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  nearest: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
