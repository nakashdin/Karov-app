import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../../theme';
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

const TYPE_BG: Partial<Record<PlaceType, string>> = {
  restaurant: '#FEF3E2',
  fast_food: '#FEE8E2',
  cafe: '#F0EAF8',
  coffee_cart: '#EBF5E6',
  juice_bar: '#E8F5E9',
  ice_cream_parlor: '#FCF3FB',
  bakery: '#FFF8E6',
  winery: '#F8EAF0',
  synagogue: '#E8F1FC',
  mikveh: '#E5F5FD',
  chabad_house: '#F0EBF8',
  tzaddik_grave: '#F5EEEA',
};

const TYPE_COLOR: Partial<Record<PlaceType, string>> = {
  restaurant: colors.categoryRestaurant,
  fast_food: colors.categoryFastFood,
  cafe: colors.categoryCafe,
  coffee_cart: colors.categoryCoffeeCart,
  juice_bar: colors.categoryFastFood,
  ice_cream_parlor: colors.categoryCafe,
  bakery: colors.categoryRestaurant,
  winery: colors.categoryWinery,
  synagogue: colors.categorySynagogue,
  mikveh: colors.categoryMikveh,
  chabad_house: colors.chabad,
  tzaddik_grave: colors.tzaddik,
};

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
        const bg = TYPE_BG[type] ?? '#F5F5F7';
        const iconColor = TYPE_COLOR[type] ?? colors.primary;
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

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    gap: 10,
    paddingBottom: 4,
  },
  card: {
    width: 148,
    backgroundColor: colors.surface,
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
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  distText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  info: {
    padding: 10,
    gap: 3,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
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
    color: colors.text,
  },
});
