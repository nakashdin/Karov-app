import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Place } from '../types';
import { colors, radius, shadow, spacing } from '../theme';
import { t } from '../i18n';
import { categoryLabel, kosherTypeLabel } from '../utils/kosher';
import { placeTypeLabel } from '../utils/placeType';
import { formatDistance } from '../utils/geo';
import { StarRating } from './StarRating';

// ---------------------------------------------------------------------------
// Emoji per place type
// ---------------------------------------------------------------------------
const PLACE_EMOJI: Record<Place['type'], string> = {
  restaurant: '🍽️',
  synagogue: '🕍',
  mikveh: '💧',
  chabad_house: '🕎',
  tzaddik_grave: '🪦',
};

// ---------------------------------------------------------------------------
// Chip accent color per place type
// ---------------------------------------------------------------------------
const CHIP_COLOR: Record<Place['type'], string> = {
  restaurant: colors.categoryRestaurant,
  synagogue: colors.categorySynagogue,
  mikveh: colors.categoryMikveh,
  chabad_house: colors.chabad,
  tzaddik_grave: colors.tzaddik,
};

// ---------------------------------------------------------------------------
// Chips: up to 2 small pills under the name
// chip1 = place type label  chip2 = category / nusach / certifiedBy
// ---------------------------------------------------------------------------
function getChips(place: Place): [string, string | null] {
  const type = placeTypeLabel[place.type];
  switch (place.type) {
    case 'restaurant':
      return [type, place.category ? categoryLabel[place.category] : null];
    case 'synagogue':
      return [type, place.nusach ? place.nusach : null];
    case 'mikveh':
      return [type, place.mikvehGender ?? null];
    case 'chabad_house':
      return [type, null];
    case 'tzaddik_grave':
      return [type, null];
    default:
      return [type, null];
  }
}

// ---------------------------------------------------------------------------
// Smart detail line (second info row) — returns null when nothing to show
// ---------------------------------------------------------------------------
function detailLine(place: Place): string | null {
  switch (place.type) {
    case 'restaurant': {
      const parts: string[] = [];
      if (place.kosherType) parts.push(kosherTypeLabel[place.kosherType]);
      if (place.certifiedBy) parts.push(place.certifiedBy);
      return parts.length > 0 ? parts.join(' · ') : null;
    }
    case 'synagogue':
      return place.nusach ? `נוסח ${place.nusach}` : null;
    case 'mikveh': {
      const parts: string[] = [];
      if (place.mikvehGender) parts.push(place.mikvehGender);
      if (place.attendant) parts.push(`בלן/ית: ${place.attendant}`);
      return parts.length > 0 ? parts.join(' · ') : null;
    }
    case 'chabad_house': {
      if (place.contactPerson) return place.contactPerson;
      if (place.services?.length) return place.services.slice(0, 2).join(' · ');
      return null;
    }
    case 'tzaddik_grave':
      return place.description ? place.description.slice(0, 60) : null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface PlaceCardProps {
  place: Place;
  distanceKm?: number | null;
  onPress: () => void;
}

export function PlaceCard({ place, distanceKm, onPress }: PlaceCardProps) {
  const emoji = PLACE_EMOJI[place.type];
  const chipColor = CHIP_COLOR[place.type];
  const [chip1, chip2] = getChips(place);
  const detail = detailLine(place);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        {/* Emoji icon square — appears on RIGHT in RTL */}
        <View style={[styles.iconBox, { backgroundColor: chipColor + '1A' }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>

        {/* Main content */}
        <View style={styles.mainContent}>
          <Text style={styles.name} numberOfLines={2}>
            {place.name}
          </Text>

          {/* Chips row */}
          <View style={styles.chipsRow}>
            <View style={[styles.chip, { borderColor: chipColor }]}>
              <Text style={[styles.chipText, { color: chipColor }]}>{chip1}</Text>
            </View>
            {chip2 ? (
              <View style={styles.chipSecondary}>
                <Text style={styles.chipSecondaryText} numberOfLines={1}>
                  {chip2}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Smart detail line */}
          {detail ? (
            <Text style={styles.detail} numberOfLines={1}>
              {detail}
            </Text>
          ) : null}

          {/* Footer: address + rating + distance */}
          <View style={styles.footerRow}>
            <View style={styles.addressRow}>
              <Text style={styles.address} numberOfLines={1}>
                {place.locationPrecision === 'city'
                  ? `${place.address} · ${t.detail.approxLocation}`
                  : place.address}
              </Text>
            </View>
            <View style={styles.metaRow}>
              {typeof place.rating === 'number' && (
                <StarRating value={place.rating} />
              )}
              {typeof distanceKm === 'number' && (
                <Text style={styles.distance}>{formatDistance(distanceKm)}</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 10,
    ...shadow.card,
  },
  pressed: {
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  mainContent: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.text,
    textAlign: 'right',
    marginBottom: 6,
  },

  // ── Chips ────────────────────────────────────────────────
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'flex-end',
    marginBottom: 5,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chipSecondary: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: 120,
  },
  chipSecondaryText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },

  // ── Detail line ──────────────────────────────────────────
  detail: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: 5,
  },

  // ── Footer ───────────────────────────────────────────────
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  addressRow: {
    flex: 1,
  },
  address: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  distance: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
});
