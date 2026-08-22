import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@expo/vector-icons/Ionicons';
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

const MAX_KM = 100;

export function WhatsAroundScreen() {
  const navigation = useNavigation<Nav>();
  const { places } = usePlaces();
  const { location } = useSharedLocation();
  const { setFilters } = useFilters();
  // null = show all; number = filter by km
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [sliderValue, setSliderValue] = useState(0);

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
      navigation.navigate('FoodList', radiusKm ? { radiusKm } : undefined);
      return;
    }
    setFilters({ ...emptyFilters, placeType: cat.types[0] });
    navigation.navigate('List', radiusKm ? { radiusKm } : undefined);
  };

  const formatDist = (d: number) =>
    d < 1 ? `${Math.round(d * 1000)} מ׳` : `${d.toFixed(1)} ק״מ`;

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
          <View style={styles.radiusRow}>
            <Ionicons name="radio-button-on-outline" size={14} color={colors.primary} />
            <Text style={styles.radiusLabel}>טווח חיפוש</Text>
            <Text style={styles.radiusValue}>
              {radiusKm === null ? 'הכל' : `${radiusKm} ק״מ`}
            </Text>
            {!location && (
              <Text style={styles.noLocNote}>· הפעל מיקום לסינון</Text>
            )}
          </View>
          {/* Force LTR so slider goes 0 (left) → 100 (right) */}
          <View style={{ direction: 'ltr' }}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={MAX_KM}
              step={1}
              value={sliderValue}
              disabled={!location}
              minimumTrackTintColor={location ? colors.primary : colors.border}
              maximumTrackTintColor={colors.border}
              thumbTintColor={location ? colors.primary : colors.border}
              onValueChange={v => {
                setSliderValue(v);
                setRadiusKm(v === 0 || v >= MAX_KM ? null : v);
              }}
            />
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderEnd}>100 ק״מ</Text>
            <Text style={styles.sliderEnd}>0 ק״מ</Text>
          </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    ...shadow.card,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
  },
  radiusLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  radiusValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    minWidth: 56,
    textAlign: 'left',
  },
  noLocNote: {
    fontSize: 11,
    color: colors.danger,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
  },
  sliderEnd: {
    fontSize: 11,
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
