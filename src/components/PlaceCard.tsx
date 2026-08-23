import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Place } from '../types';
import { makeStyles, radius, shadow, spacing, useTheme } from '../theme';
import type { Tokens } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { transliterateHebrew } from '../utils/transliterate';
import { categoryLabel, getKosherLabel } from '../utils/kosher';
import { displayPlaceName, getPlaceEmoji, placeTypeLabel } from '../utils/placeType';
import { formatDistance } from '../utils/geo';
import { isCurrentlyOpen, todayHoursStr } from '../utils/openingHours';
import { NavPickerModal } from './NavPickerModal';


function chipColorFor(theme: Tokens): Record<Place['type'], string> {
  return {
    restaurant:      theme.categoryRestaurant,
    fast_food:       theme.categoryFastFood,
    cafe:            theme.categoryCafe,
    coffee_cart:     theme.categoryCoffeeCart,
    juice_bar:       theme.categoryCoffeeCart,
    ice_cream_parlor:theme.categoryCafe,
    bakery:          theme.categoryFastFood,
    winery:          theme.categoryWinery,
    synagogue:       theme.categorySynagogue,
    mikveh:          theme.categoryMikveh,
    chabad_house:    theme.chabad,
    tzaddik_grave:   theme.tzaddik,
  };
}

// Kashrut badge color by authority group
function kosherBadgeColor(
  place: { kosherLevel?: string | null; kosherAuthorityGroup?: string | null },
  theme: Tokens,
): string {
  if (place.kosherAuthorityGroup === 'badatz') return theme.kosherPremium;
  if (place.kosherLevel === 'mehadrin') return theme.kosherPremium;
  if (place.kosherAuthorityGroup === 'rabbinate') return theme.info;
  return theme.primary;
}

function StarRow({ rating }: { rating: number | null | undefined }) {
  const theme = useTheme();
  const starStyles = useStarStyles();
  const filled = rating != null ? Math.round(rating) : 0;
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= filled ? 'star' : 'star-outline'}
          size={13}
          color={i <= filled ? theme.star : theme.border}
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

const useStarStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  value: { fontSize: 12, fontWeight: '700', color: t.text, marginRight: 2 },
  none: { fontSize: 11, color: t.textFaint, marginRight: 2 },
}));

interface PlaceCardProps {
  place: Place;
  distanceKm?: number | null;
  onPress: () => void;
}

const SUB_TYPE_LABEL: Record<string, string> = {
  fast_food: 'מזון מהיר',
  chef_restaurant: 'מסעדת שף',
};

function subTypeColorFor(theme: Tokens): Record<string, string> {
  return {
    fast_food: theme.categoryFastFood,
    chef_restaurant: theme.categoryChefRestaurant,
  };
}

export function PlaceCard({ place, distanceKm, onPress }: PlaceCardProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t, locale } = useLanguage();
  const [navOpen, setNavOpen] = useState(false);
  const isHe = locale === 'he';
  const heName = displayPlaceName(place);
  const displayName = isHe ? heName : transliterateHebrew(heName);
  const emoji = getPlaceEmoji(place);
  const chipColor = place.subType
    ? (subTypeColorFor(theme)[place.subType] ?? chipColorFor(theme)[place.type])
    : chipColorFor(theme)[place.type];
  const typeLabel = place.subType ? (SUB_TYPE_LABEL[place.subType] ?? placeTypeLabel[place.type]) : placeTypeLabel[place.type];

  const isFoodType = ['restaurant', 'fast_food', 'cafe', 'coffee_cart', 'juice_bar', 'ice_cream_parlor', 'bakery'].includes(place.type);
  const openStatus  = isCurrentlyOpen(place.openingHours, place.location);
  const todayHours  = todayHoursStr(place.openingHours);
  const showHoursRow = todayHours !== null || openStatus !== null;
  const kosherLabel = isFoodType ? getKosherLabel(place) : null;
  const kosherColor = kosherBadgeColor(place, theme);

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
            <Text style={styles.nameHe} numberOfLines={1}>{heName}</Text>
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
        <Ionicons name="location-outline" size={12} color={theme.textMuted} />
        <Text style={styles.address} numberOfLines={2}>
          {place.locationPrecision === 'city'
            ? `${place.address} · ${t.detail.approxLocation}`
            : place.address}
        </Text>
        <Pressable
          style={styles.navBtn}
          onPress={(e) => { e.stopPropagation?.(); setNavOpen(true); }}
          hitSlop={8}
        >
          <Ionicons name="navigate" size={14} color={theme.primary} />
          <Text style={styles.navText}>נווט</Text>
        </Pressable>
      </View>

      {/* Certification */}
      {certLine && (
        <Text style={styles.cert} numberOfLines={1}>🏛 הכשר: {certLine}</Text>
      )}

      {/* Opening hours */}
      {showHoursRow && (
        <View style={styles.hoursRow}>
          <Ionicons name="time-outline" size={12} color={theme.textMuted} />
          {todayHours && (
            <Text style={styles.hoursText} numberOfLines={1}>{todayHours}</Text>
          )}
          {openStatus === true  && <View style={[styles.badge, styles.badgeOpen]}><Text style={styles.badgeText}>פתוח</Text></View>}
          {openStatus === false && <View style={[styles.badge, styles.badgeClosed]}><Text style={styles.badgeText}>סגור</Text></View>}
        </View>
      )}
      <NavPickerModal
        visible={navOpen}
        point={place.location}
        label={place.name}
        address={place.address}
        onClose={() => setNavOpen(false)}
      />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.surface,
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
    color: t.text,
    textAlign: 'right',
  },
  nameHe: {
    fontSize: 11,
    color: t.textMuted,
    textAlign: 'right',
    marginTop: 1,
  },
  distance: {
    fontSize: 13,
    fontWeight: '700',
    color: t.primary,
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
    backgroundColor: t.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    maxWidth: 130,
  },
  chipSecondaryText: { fontSize: 11, fontWeight: '500', color: t.textMuted },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    justifyContent: 'flex-end',
  },
  address: {
    fontSize: 12,
    color: t.textMuted,
    textAlign: 'right',
    flex: 1,
  },

  cert: {
    fontSize: 11,
    color: t.textMuted,
    textAlign: 'right',
  },

  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'flex-end',
  },
  hoursText: {
    fontSize: 11,
    color: t.textMuted,
    flex: 1,
    textAlign: 'right',
  },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  badgeOpen:   { backgroundColor: t.successSurface },
  badgeClosed: { backgroundColor: t.dangerSurface },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: t.text,
  },

  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: t.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    flexShrink: 0,
  },
  navText: {
    fontSize: 11,
    fontWeight: '700',
    color: t.primary,
  },
}));
