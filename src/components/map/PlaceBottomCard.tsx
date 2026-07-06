import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Place } from '../../types';
import { colors, radius, shadow, spacing } from '../../theme';
import { t } from '../../i18n';
import { kosherTypeLabel } from '../../utils/kosher';
import { placeTypeLabel } from '../../utils/placeType';
import { openWaze } from '../../utils/navigation';
import { KosherBadge } from '../KosherBadge';

interface PlaceBottomCardProps {
  place: Place;
  onClose: () => void;
  onOpenDetails: () => void;
}

function subtitle(place: Place): string {
  if (place.type === 'restaurant' && place.kosherType) {
    return kosherTypeLabel[place.kosherType];
  }
  if (place.type === 'synagogue') {
    return place.nusach ? `נוסח ${place.nusach}` : placeTypeLabel.synagogue;
  }
  return placeTypeLabel[place.type];
}

/** Card that slides up when a place is tapped on the map. */
export function PlaceBottomCard({
  place,
  onClose,
  onOpenDetails,
}: PlaceBottomCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>
          {place.name}
        </Text>
        <View style={styles.headerRight}>
          {place.category && <KosherBadge category={place.category} />}
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.subtitle} numberOfLines={1}>
        {subtitle(place)}
      </Text>
      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
        <Text style={styles.address} numberOfLines={1}>
          {place.locationPrecision === 'city'
            ? `${place.address} · ${t.detail.approxLocation}`
            : place.address}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.detailsBtn} onPress={onOpenDetails}>
          <Text style={styles.detailsText}>{t.card.details}</Text>
        </Pressable>
        <Pressable
          style={styles.wazeBtn}
          onPress={() => openWaze(place.location, place.name)}
        >
          <Ionicons name="navigate" size={18} color={colors.textInverse} />
          <Text style={styles.wazeText}>{t.detail.navigate}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.raised,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.text,
    textAlign: 'right',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  detailsBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  wazeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  wazeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
  },
});
