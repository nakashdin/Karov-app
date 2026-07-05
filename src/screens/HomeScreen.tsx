import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { PlaceCard } from '../components/PlaceCard';
import { Loading } from '../components/Loading';
import { colors, radius, shadow, spacing } from '../theme';
import { t } from '../i18n';
import { usePlaces } from '../hooks/usePlaces';
import { useSharedLocation } from '../context/LocationContext';
import { useFilters } from '../context/FiltersContext';
import { distanceKm } from '../utils/geo';
import { emptyFilters, PlaceType } from '../types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function getGreeting(): string {
  const day = new Date().getDay(); // 0=Sun … 6=Sat
  return day === 5 || day === 6 ? 'שבת שלום' : 'שבוע טוב';
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { places, loading } = usePlaces();
  const { status, location, request } = useSharedLocation();
  const { setFilters } = useFilters();

  const nearby = useMemo(() => {
    const list = [...places];
    if (location) {
      list.sort(
        (a, b) =>
          distanceKm(location, a.location) - distanceKm(location, b.location),
      );
    } else {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return list.slice(0, 4);
  }, [places, location]);

  const onWhatsAround = async () => {
    await request();
    navigation.navigate('Tabs', { screen: 'Map' });
  };

  const openType = (placeType: PlaceType) => {
    setFilters({ ...emptyFilters, placeType });
    navigation.navigate('Tabs', { screen: 'List' });
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — centered brand with bsd/greeting row above */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            {/* bsd on LEFT, greeting on RIGHT */}
            <Text style={styles.bsd}>בס״ד</Text>
            <Text style={styles.greeting}>{getGreeting()}</Text>
          </View>
          <Text style={styles.title}>{t.home.title}</Text>
          <Text style={styles.subtitle}>{t.home.subtitle}</Text>
        </View>

        {/* Search bar — pill shape, visual only */}
        <Pressable
          style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
          onPress={() => navigation.navigate('Tabs', { screen: 'List', params: { focus: true } })}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>{t.home.homeSearchPlaceholder}</Text>
          <View style={styles.searchDivider} />
          <Ionicons name="options-outline" size={17} color={colors.textMuted} />
        </Pressable>

        {/* CTA — elevated presence */}
        <Pressable
          style={({ pressed }) => [
            styles.ctaCard,
            pressed && styles.pressed,
            status === 'requesting' && styles.ctaLoading,
          ]}
          onPress={onWhatsAround}
          disabled={status === 'requesting'}
        >
          <Ionicons name="chevron-back" size={18} color={colors.border} />
          <View style={styles.ctaTextBlock}>
            <Text style={styles.ctaTitle}>
              {status === 'requesting' ? t.home.locating : t.home.whatsAround}
            </Text>
            <Text style={styles.ctaSubtitle}>{t.home.whatsAroundSubtitle}</Text>
          </View>
          <View style={styles.ctaIconBox}>
            <Ionicons name="navigate" size={22} color={colors.primary} />
          </View>
        </Pressable>

        {/* Shortcut grid */}
        <View style={styles.shortcutRow}>
          <Shortcut
            icon="restaurant"
            color={colors.categoryRestaurant}
            label={t.home.restaurants}
            onPress={() => openType('restaurant')}
          />
          <Shortcut
            icon="business"
            color={colors.categorySynagogue}
            label={t.home.synagogues}
            onPress={() => openType('synagogue')}
          />
          <Shortcut
            icon="water"
            color={colors.categoryMikveh}
            label={t.home.mikvahs}
            onPress={() => openType('mikveh')}
          />
        </View>
        <View style={[styles.shortcutRow, styles.shortcutRowLast]}>
          <Shortcut
            icon="home"
            color={colors.chabad}
            label={t.home.chabadHouses}
            onPress={() => openType('chabad_house')}
          />
          <Shortcut
            icon="flower-outline"
            color={colors.tzaddik}
            label={t.home.tzadikGraves}
            onPress={() => openType('tzaddik_grave')}
          />
          <Shortcut
            icon="heart"
            color={colors.categoryFavorites}
            label={t.home.favorites}
            onPress={() => navigation.navigate('Favorites')}
          />
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.home.nearbyTitle}</Text>
          <Pressable
            onPress={() => navigation.navigate('Tabs', { screen: 'List' })}
            style={({ pressed }) => [styles.seeAllHitbox, pressed && styles.pressed]}
          >
            <Text style={styles.seeAll}>{t.home.seeAll}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <Loading />
          </View>
        ) : (
          nearby.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              distanceKm={
                location ? distanceKm(location, place.location) : null
              }
              onPress={() =>
                navigation.navigate('PlaceDetail', { id: place.id })
              }
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function Shortcut({
  icon,
  label,
  onPress,
  color = colors.primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={28} color={color} />
      <Text style={styles.shortcutLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    marginBottom: spacing.xxl,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  bsd: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.5,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // ── Search bar — pill shape ──────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    ...shadow.card,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'right',
    opacity: 0.6,
  },
  searchDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
  },

  // ── CTA card — elevated presence ────────────────────────
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
    ...shadow.card,
  },
  ctaLoading: {
    opacity: 0.72,
  },
  ctaTextBlock: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
    textAlign: 'right',
  },
  ctaSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 3,
  },
  ctaIconBox: {
    width: 46,
    height: 46,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Shortcut grid — Airbnb spacing ──────────────────────
  pressed: {
    opacity: 0.85,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  shortcutRowLast: {
    marginBottom: 0,
  },
  shortcut: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 18,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadow.card,
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: colors.text,
    textAlign: 'center',
  },

  // ── Section header ──────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.text,
  },
  seeAllHitbox: {
    padding: spacing.sm,
    marginEnd: -spacing.sm,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  loadingBox: {
    height: 200,
  },
});
