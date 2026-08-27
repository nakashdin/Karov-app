import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeStyles, mix, radius, shadow, spacing, useTheme } from '../../theme';
import type { Tokens } from '../../theme';
import { Place, PlaceType, GeoPoint } from '../../types';
import { distanceKm } from '../../utils/geo';

interface Props {
  places: Place[];
  location: GeoPoint | null;
  onPress: (id: string) => void;
}

function fmtDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} מ'`;
  return `${km.toFixed(1)} ק"מ`;
}

function typeColorFor(theme: Tokens): Partial<Record<PlaceType, string>> {
  return {
    restaurant: theme.categoryRestaurant,
    fast_food: theme.categoryFastFood,
    cafe: theme.categoryCafe,
    coffee_cart: theme.categoryCoffeeCart,
    juice_bar: theme.categoryFastFood,
    ice_cream_parlor: theme.categoryCafe,
    bakery: theme.categoryRestaurant,
    winery: theme.categoryWinery,
    synagogue: theme.categorySynagogue,
    mikveh: theme.categoryMikveh,
    chabad_house: theme.chabad,
    tzaddik_grave: theme.tzaddik,
  };
}

/** A quiet tint of the type colour — mixed toward the surface so it stays
 * correct in both colour schemes (the surface itself flips light/dark). */
function typeBgFor(theme: Tokens): Partial<Record<PlaceType, string>> {
  const colorOf = typeColorFor(theme);
  return Object.fromEntries(
    Object.entries(colorOf).map(([type, color]) => [type, mix(theme.surface, color as string, 0.12)]),
  ) as Partial<Record<PlaceType, string>>;
}

const TYPE_ICON: Partial<Record<PlaceType, keyof typeof Ionicons.glyphMap>> = {
  restaurant: 'restaurant',
  fast_food: 'fast-food',
  cafe: 'cafe',
  coffee_cart: 'cafe-outline',
  juice_bar: 'nutrition',
  ice_cream_parlor: 'ice-cream',
  bakery: 'pizza',
  winery: 'wine',
  synagogue: 'business',
  mikveh: 'water',
  chabad_house: 'home',
  tzaddik_grave: 'flower-outline',
};

const TYPE_LABEL: Partial<Record<PlaceType, string>> = {
  restaurant: 'מסעדה',
  fast_food: 'מזון מהיר',
  cafe: 'בית קפה',
  coffee_cart: 'עגלת קפה',
  juice_bar: 'בר מיצים',
  ice_cream_parlor: 'גלידריה',
  bakery: 'מאפייה',
  winery: 'יקב',
  synagogue: 'בית כנסת',
  mikveh: 'מקווה',
  chabad_house: 'בית חב"ד',
  tzaddik_grave: 'קבר צדיק',
};

export function NearbyHorizontalList({ places, location, onPress }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  if (places.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
    >
      {places.map((place) => {
        const distKm = location ? distanceKm(location, place.location) : null;
        const type = place.type;
        const bg = typeBgFor(theme)[type] ?? theme.surfaceMuted;
        const iconColor = typeColorFor(theme)[type] ?? theme.primary;
        const icon = TYPE_ICON[type] ?? 'help-circle-outline';
        const typeLabel = TYPE_LABEL[type] ?? '';

        return (
          <Pressable
            key={place.id}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => onPress(place.id)}
          >
            {/* Photo area */}
            <View style={[styles.photoArea, { backgroundColor: bg }]}>
              <Ionicons name={icon} size={36} color={iconColor} />
              {distKm !== null && (
                <View style={styles.distBadge}>
                  <Text style={styles.distText}>{fmtDistance(distKm)}</Text>
                </View>
              )}
            </View>

            {/* Info */}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{place.name}</Text>
              <Text style={styles.meta} numberOfLines={1}>{typeLabel}</Text>
              {place.rating !== undefined && (
                <View style={styles.starsRow}>
                  <Text style={styles.starEmoji}>⭐</Text>
                  <Text style={styles.rating}>{place.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  list: {
    paddingHorizontal: spacing.lg,
    gap: 10,
    paddingBottom: 4,
  },
  card: {
    width: 148,
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  pressed: {
    opacity: 0.88,
  },
  photoArea: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  distBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: t.overlayMedia,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  distText: {
    fontSize: 10,
    fontWeight: '700',
    color: t.textInverse,
  },
  info: {
    padding: 10,
    gap: 3,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: t.text,
    textAlign: 'right',
  },
  meta: {
    fontSize: 11,
    color: t.textMuted,
    textAlign: 'right',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  starEmoji: {
    fontSize: 10,
  },
  rating: {
    fontSize: 12,
    fontWeight: '700',
    color: t.text,
  },
}));
