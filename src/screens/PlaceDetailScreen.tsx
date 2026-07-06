import React, { useEffect } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { KosherBadge } from '../components/KosherBadge';
import { StarRating } from '../components/StarRating';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { colors, radius, shadow, sizes, spacing } from '../theme';
import { t } from '../i18n';
import { usePlace } from '../hooks/usePlace';
import { useSharedLocation } from '../context/LocationContext';
import { useFavorites } from '../context/FavoritesContext';
import { distanceKm, formatDistance } from '../utils/geo';
import { categoryLabel, kosherTypeLabel } from '../utils/kosher';
import { placeTypeLabel } from '../utils/placeType';
import { callPhone, openWaze } from '../utils/navigation';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, 'PlaceDetail'>;

const PLACE_TYPE_COLOR = {
  restaurant: colors.categoryRestaurant,
  synagogue: colors.categorySynagogue,
  mikveh: colors.categoryMikveh,
  chabad_house: colors.chabad,
  tzaddik_grave: colors.tzaddik,
} as const;

export function PlaceDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<DetailRoute>();
  const { place, loading, error } = usePlace(params.id);
  const { location } = useSharedLocation();
  const { isFavorite, toggleFavorite } = useFavorites();

  const fav = isFavorite(params.id);

  // Title + favorite heart in the header.
  useEffect(() => {
    navigation.setOptions({
      title: place?.name ?? '',
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={{ paddingEnd: 8 }}
        >
          <Ionicons name="chevron-forward" size={26} color={colors.primary} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable onPress={() => toggleFavorite(params.id)} hitSlop={10}>
          <Ionicons
            name={fav ? 'heart' : 'heart-outline'}
            size={24}
            color={fav ? colors.danger : colors.text}
          />
        </Pressable>
      ),
    });
  }, [place, fav, navigation, params.id, toggleFavorite]);

  if (loading) return <Screen><Loading /></Screen>;
  if (error || !place) {
    return (
      <Screen>
        <EmptyState title={t.detail.notFound} icon="sad-outline" />
      </Screen>
    );
  }

  const dist = location ? distanceKm(location, place.location) : null;
  const subtitle =
    place.type === 'synagogue'
      ? place.nusach
        ? `נוסח ${place.nusach}`
        : placeTypeLabel.synagogue
      : place.type === 'restaurant'
        ? place.kosherType
          ? kosherTypeLabel[place.kosherType]
          : placeTypeLabel.restaurant
        : placeTypeLabel[place.type];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroIconBox, { backgroundColor: PLACE_TYPE_COLOR[place.type] + '1A' }]}>
            <Text style={styles.heroEmoji}>
              {({ restaurant: '🍽️', synagogue: '🕍', mikveh: '💧', chabad_house: '🕎', tzaddik_grave: '🪦' } as const)[place.type]}
            </Text>
          </View>
          <Text style={styles.name}>{place.name}</Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {place.category && <KosherBadge category={place.category} />}
          </View>
          {(typeof place.rating === 'number' || dist !== null) && (
            <View style={styles.metaRow}>
              {typeof place.rating === 'number' && <StarRating value={place.rating} />}
              {typeof place.rating === 'number' && dist !== null && (
                <Text style={styles.metaDot}>·</Text>
              )}
              {dist !== null && (
                <Text style={styles.distance}>
                  {t.detail.distanceAway(formatDistance(dist))}
                </Text>
              )}
            </View>
          )}
        </View>

        {place.description ? (
          <Text style={styles.description}>{place.description}</Text>
        ) : null}

        {/* Primary actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.primaryAction]}
            onPress={() => openWaze(place.location, place.name)}
          >
            <Ionicons name="navigate" size={20} color={colors.textInverse} />
            <Text style={styles.primaryActionText}>{t.detail.navigate}</Text>
          </Pressable>

          {place.phone ? (
            <Pressable
              style={[styles.actionBtn, styles.secondaryAction]}
              onPress={() => callPhone(place.phone!)}
            >
              <Ionicons name="call" size={20} color={colors.primary} />
              <Text style={styles.secondaryActionText}>{t.detail.call}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Info rows */}
        <View style={styles.card}>
          <InfoRow icon="location-outline" label={t.detail.address} value={place.address} />
          {place.type === 'tzaddik_grave' && place.extra?.buriedPerson ? (
            <InfoRow
              icon="flower-outline"
              label={t.detail.buriedPerson}
              value={String(place.extra.buriedPerson)}
            />
          ) : null}
          {place.locationPrecision === 'city' ? (
            <View style={styles.approxRow}>
              <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
              <Text style={styles.approxText}>{t.detail.approxLocation}</Text>
            </View>
          ) : null}
          {place.category ? (
            <InfoRow
              icon="fast-food-outline"
              label={t.detail.foodType}
              value={categoryLabel[place.category]}
            />
          ) : null}
          {place.type === 'restaurant' && place.kosherType ? (
            <InfoRow
              icon="shield-checkmark-outline"
              label={t.detail.kosherType}
              value={kosherTypeLabel[place.kosherType]}
            />
          ) : null}
          {place.certifiedBy ? (
            <InfoRow
              icon="ribbon-outline"
              label={t.detail.certifiedBy}
              value={place.certifiedBy}
            />
          ) : null}
          {place.nusach ? (
            <InfoRow icon="book-outline" label={t.detail.nusach} value={place.nusach} />
          ) : null}
          {place.type === 'mikveh' && place.mikvehGender ? (
            <InfoRow icon="people-outline" label={t.detail.gender} value={place.mikvehGender} />
          ) : null}
          {place.type === 'mikveh' && place.attendant ? (
            <InfoRow icon="person-outline" label={t.detail.attendant} value={place.attendant} />
          ) : null}
          {place.contactPerson ? (
            <InfoRow icon="person-outline" label={t.detail.contactPerson} value={place.contactPerson} />
          ) : null}
          {place.services && place.services.length > 0 ? (
            <InfoRow
              icon="sparkles-outline"
              label={t.detail.services}
              value={place.services.join(' · ')}
            />
          ) : null}
          {place.phone ? (
            <InfoRow icon="call-outline" label={t.detail.phone} value={place.phone} />
          ) : null}
          {place.openingHours ? (
            <InfoRow icon="time-outline" label={t.detail.hours} value={place.openingHours} />
          ) : null}
          {place.website ? (
            <Pressable onPress={() => Linking.openURL(place.website!)}>
              <InfoRow
                icon="globe-outline"
                label={t.detail.website}
                value={place.website}
                link
              />
            </Pressable>
          ) : null}
          {place.certificateValidUntil ? (
            <InfoRow
              icon="calendar-outline"
              label={t.detail.validUntil}
              value={place.certificateValidUntil}
            />
          ) : null}
          {place.lastVerifiedAt ? (
            <InfoRow
              icon="checkmark-done-outline"
              label={t.detail.lastVerified}
              value={place.lastVerifiedAt}
            />
          ) : null}
          {place.sourceUrl ? (
            <Pressable onPress={() => Linking.openURL(place.sourceUrl!)}>
              <InfoRow
                icon="link-outline"
                label={t.detail.source}
                value={place.sourceName ?? place.sourceUrl}
                link
              />
            </Pressable>
          ) : null}
        </View>

        {/* Report */}
        <Pressable
          style={styles.reportBtn}
          onPress={() => navigation.navigate('Report', { placeId: place.id })}
        >
          <Ionicons name="flag-outline" size={16} color={colors.danger} />
          <Text style={styles.reportText}>{t.detail.report}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
  link,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  /** Render the value as a tappable link (color + underline). */
  link?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={link ? colors.primary : colors.textMuted} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, link && styles.infoLink]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // ── Hero ─────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroIconBox: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroEmoji: {
    fontSize: 34,
    lineHeight: 40,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaDot: {
    fontSize: 12,
    color: colors.textMuted,
  },
  distance: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // ── Description ──────────────────────────────────────────
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },

  // ── Actions ──────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: sizes.button,
    borderRadius: radius.pill,
  },
  primaryAction: {
    backgroundColor: colors.primary,
  },
  primaryActionText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  secondaryAction: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // ── Info card ─────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  approxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  approxText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
  },
  infoLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  // ── Report ───────────────────────────────────────────────
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xxl,
    paddingVertical: spacing.sm,
  },
  reportText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
});
