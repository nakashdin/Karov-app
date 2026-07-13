import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Place } from '../types';
import { colors, radius, shadow, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { transliterateHebrew } from '../utils/transliterate';
import { categoryLabel, kosherTypeLabel } from '../utils/kosher';
import { placeTypeLabel } from '../utils/placeType';
import { formatDistance } from '../utils/geo';

const PLACE_EMOJI: Record<Place['type'], string> = {
  restaurant:   '🍽️',
  fast_food:    '🍔',
  cafe:         '☕',
  coffee_cart:  '🛒',
  synagogue:    '🕍',
  mikveh:       '💧',
  chabad_house: '🕎',
  tzaddik_grave:'🪦',
};

const CHIP_COLOR: Record<Place['type'], string> = {
  restaurant:   colors.categoryRestaurant,
  fast_food:    colors.categoryFastFood,
  cafe:         colors.categoryCafe,
  coffee_cart:  colors.categoryCoffeeCart,
  synagogue:    colors.categorySynagogue,
  mikveh:       colors.categoryMikveh,
  chabad_house: colors.chabad,
  tzaddik_grave:colors.tzaddik,
};

// Kashrut badge color per level
const KOSHER_COLOR: Record<string, string> = {
  mehadrin:       '#166534',
  mehadrin_plus:  '#14532d',
  regular:        '#1e40af',
  chalav_yisrael: '#7c3aed',
};

function StarRow({ rating }: { rating: number | null | undefined }) {
  const filled = rating != null ? Math.round(rating) : 0;
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= filled ? 'star' : 'star-outline'}
          size={13}
          color={i <= filled ? colors.star : colors.border}
        />
      ))}
      {rating != null ? (
        <Text style={starStyles.value}>{rating.toFixed(1)}</Text>
      ) : (
        <Text style={starStyles.none}>טרם דורג</Text>
      )}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  value: { fontSize: 12, fontWeight: '700', color: colors.text, marginRight: 2 },
  none: { fontSize: 11, color: colors.textFaint, marginRight: 2 },
});

interface PlaceCardProps {
  place: Place;
  distanceKm?: number | null;
  onPress: () => void;
}

export function PlaceCard({ place, distanceKm, onPress }: PlaceCardProps) {
  const { t, locale } = useLanguage();
  const isHe = locale === 'he';
  const displayName = isHe ? place.name : transliterateHebrew(place.name);
  const emoji = PLACE_EMOJI[place.type];
  const chipColor = CHIP_COLOR[place.type];
  const typeLabel = placeTypeLabel[place.type];

  const isFoodType = ['restaurant', 'fast_food', 'cafe', 'coffee_cart'].includes(place.type);
  const kosherLabel = isFoodType && place.kosherType
    ? kosherTypeLabel[place.kosherType]
    : null;
  const kosherColor = place.kosherType ? (KOSHER_COLOR[place.kosherType] ?? colors.primary) : colors.primary;

  // Second info chip (category / nusach)
  const subChip =
    isFoodType && place.category ? categoryLabel[place.category]
    : place.type === 'synagogue' && place.nusach ? place.nusach
    : place.type === 'mikveh' && place.mikvehGender ? place.mikvehGender
    : null;

  // Certification line
  const certLine = isFoodType && place.certifiedBy ? place.certifiedBy : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* Top row: icon + name + distance */}
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: chipColor + '1A' }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>

        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={2}>{displayName}</Text>
          {!isHe && (
            <Text style={styles.nameHe} numberOfLines={1}>{place.name}</Text>
          )}
        </View>

        {typeof distanceKm === 'number' && (
          <Text style={styles.distance}>{formatDistance(distanceKm, t)}</Text>
        )}
      </View>

      {/* Chips row */}
      <View style={styles.chipsRow}>
        <View style={[styles.chip, { borderColor: chipColor }]}>
          <Text style={[styles.chipText, { color: chipColor }]}>{typeLabel}</Text>
        </View>
        {kosherLabel && (
          <View style={[styles.chip, { borderColor: kosherColor, backgroundColor: kosherColor + '12' }]}>
            <Text style={[styles.chipText, { color: kosherColor }]}>{kosherLabel}</Text>
          </View>
        )}
        {subChip && (
          <View style={styles.chipSecondary}>
            <Text style={styles.chipSecondaryText} numberOfLines={1}>{subChip}</Text>
          </View>
        )}
      </View>

      {/* Stars row */}
      <StarRow rating={place.rating} />

      {/* Address + navigate button */}
      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={12} color={colors.textMuted} />
        <Text style={styles.address} numberOfLines={2}>
          {place.locationPrecision === 'city'
            ? `${place.address} · ${t.detail.approxLocation}`
            : place.address}
        </Text>
        <Pressable
          style={styles.navBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            const { latitude, longitude } = place.location;
            Linking.openURL(`https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`);
          }}
          hitSlop={8}
        >
          <Ionicons name="navigate" size={14} color={colors.primary} />
          <Text style={styles.navText}>נווט</Text>
        </Pressable>
      </View>

      {/* Certification */}
      {certLine && (
        <Text style={styles.cert} numberOfLines={1}>🏛 הכשר: {certLine}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 10,
    gap: 8,
    ...shadow.card,
  },
  pressed: { opacity: 0.85 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 22, lineHeight: 26 },
  nameBlock: { flex: 1 },
  name: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
    textAlign: 'right',
  },
  nameHe: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 1,
  },
  distance: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    flexShrink: 0,
    paddingTop: 2,
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'flex-end',
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  chipSecondary: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    maxWidth: 130,
  },
  chipSecondaryText: { fontSize: 11, fontWeight: '500', color: colors.textMuted },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    justifyContent: 'flex-end',
  },
  address: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    flex: 1,
  },

  cert: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
  },

  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    flexShrink: 0,
  },
  navText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
});
