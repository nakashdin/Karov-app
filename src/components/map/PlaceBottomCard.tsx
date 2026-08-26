import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Place } from '../../types';
import { makeStyles, radius, shadow, spacing, useTheme } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import type { Strings } from '../../i18n';
import { getPrimaryKosherLabel } from '../../utils/kosher';
import { displayPlaceName, placeTypeLabel } from '../../utils/placeType';
import { NavPickerModal } from '../NavPickerModal';
import { KosherBadge } from '../KosherBadge';

interface PlaceBottomCardProps {
  place: Place;
  onClose: () => void;
  onOpenDetails: () => void;
}

function subtitle(place: Place, strings: Strings): string {
  if (place.type === 'restaurant') {
    const label = getPrimaryKosherLabel(place, strings.kosher);
    if (label) return label;
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
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useLanguage();
  const [navOpen, setNavOpen] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>
          {displayPlaceName(place)}
        </Text>
        <View style={styles.headerRight}>
          {place.category && <KosherBadge category={place.category} />}
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.subtitle} numberOfLines={1}>
        {subtitle(place, t)}
      </Text>
      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={14} color={theme.textMuted} />
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
          onPress={() => setNavOpen(true)}
        >
          <Ionicons name="navigate" size={18} color={theme.textInverse} />
          <Text style={styles.wazeText}>{t.detail.navigate}</Text>
        </Pressable>
      </View>
      <NavPickerModal
        visible={navOpen}
        point={place.location}
        label={place.name}
        address={place.address}
        onClose={() => setNavOpen(false)}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    backgroundColor: t.surface,
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
    color: t.text,
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
    color: t.primary,
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
    color: t.textMuted,
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
    borderColor: t.primary,
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: t.primary,
  },
  wazeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: t.primary,
  },
  wazeText: {
    fontSize: 14,
    fontWeight: '700',
    color: t.textInverse,
  },
}));
