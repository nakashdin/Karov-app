import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Loading } from '../components/Loading';
import { LanguagePicker } from '../components/LanguagePicker';
import { AppMenu } from '../components/AppMenu';
import { TodayCard } from '../components/home/TodayCard';
import { DailyCarousel } from '../components/home/DailyCarousel';
import { NearbyHorizontalList } from '../components/home/NearbyHorizontalList';
import { colors, radius, shadow, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { usePlaces } from '../hooks/usePlaces';
import { useParasha } from '../hooks/useParasha';
import { useHebrewDate } from '../hooks/useHebrewDate';
import { useCityName } from '../hooks/useCityName';
import { useSharedLocation } from '../context/LocationContext';
import { useFilters } from '../context/FiltersContext';
import { distanceKm } from '../utils/geo';
import { emptyFilters, PlaceType } from '../types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HEBREW_DAYS = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];

const ALL_SHORTCUTS = [
  { icon: 'restaurant' as const,    color: colors.categoryRestaurant, bg: '#FEF3E2', label: 'מסעדות',      type: 'restaurant' },
  { icon: 'fast-food' as const,     color: colors.categoryFastFood,   bg: '#FEE8E2', label: 'מזון מהיר',   type: 'fast_food' },
  { icon: 'cafe' as const,          color: colors.categoryCafe,       bg: '#F0EAF8', label: 'בתי קפה',     type: 'cafe' },
  { icon: 'cafe-outline' as const,  color: colors.categoryCoffeeCart, bg: '#EBF5E6', label: 'עגלות קפה',   type: 'coffee_cart' },
  { icon: 'wine' as const,          color: colors.categoryWinery,     bg: '#F8EAF0', label: 'ייקבים',      type: 'winery' },
  { icon: 'business' as const,      color: colors.categorySynagogue,  bg: '#E8F1FC', label: 'בתי כנסת',    type: 'synagogue' },
  { icon: 'water' as const,         color: colors.categoryMikveh,     bg: '#E5F5FD', label: 'מקוואות',     type: 'mikveh' },
  { icon: 'home' as const,          color: colors.chabad,             bg: '#F0EBF8', label: 'בתי חב"ד',    type: 'chabad_house' },
  { icon: 'flower-outline' as const,color: colors.tzaddik,            bg: '#F5EEEA', label: 'קברי צדיקים', type: 'tzaddik_grave' },
] as const;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useLanguage();
  const { places, loading } = usePlaces();
  const { parasha } = useParasha();
  const hebrewDate = useHebrewDate();
  const { location } = useSharedLocation();
  const cityName = useCityName(location);
  const { setFilters } = useFilters();
  const [userName, setUserName] = useState<string | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('@karov/auth').then((raw) => {
      if (!raw) return;
      try {
        const auth = JSON.parse(raw);
        if (auth.name && auth.type !== 'guest') setUserName(auth.name);
      } catch {}
    });
  }, []);

  const nearby = useMemo(() => {
    const list = [...places];
    if (location) {
      list.sort((a, b) => distanceKm(location, a.location) - distanceKm(location, b.location));
    } else {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return list.slice(0, 6);
  }, [places, location]);

  const openType = (placeType: PlaceType) => {
    setFilters({ ...emptyFilters, placeType });
    navigation.navigate('List', undefined);
  };

  const openSynagogues = useCallback(() => {
    setFilters({ ...emptyFilters, placeType: 'synagogue' });
    navigation.navigate('List', undefined);
  }, [setFilters, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const dayName = HEBREW_DAYS[new Date().getDay()];
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6;
  const isFriday = new Date().getDay() === 5;
  const isShabbat = new Date().getDay() === 6;

  const sunEmoji = isShabbat ? '🕯' : isFriday ? '🌅' : isNight ? '🌙' : '☀️';

  const locationDisplay = cityName ?? (location ? '...' : null);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Hero Area ─────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Top bar */}
          <View style={styles.heroTopBar}>
            <View style={styles.heroLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.textMuted} />
              <Pressable onPress={() => setLangOpen(true)} hitSlop={12}>
                <Ionicons name="globe-outline" size={19} color={colors.textMuted} />
              </Pressable>
            </View>
            <Pressable onPress={() => setMenuOpen(true)} hitSlop={12}>
              <Ionicons name="menu-outline" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Greeting */}
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingName}>
              {userName ? `שלום, ${userName} 👋` : 'שלום 👋'}
            </Text>
            <Text style={styles.greetingDate}>
              {dayName}{hebrewDate ? ` • ${hebrewDate}` : ''}
            </Text>
            {locationDisplay && (
              <View style={styles.locationRow}>
                <Text style={styles.locationText}>{locationDisplay}</Text>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              </View>
            )}
          </View>

          {/* Scenery illustration */}
          <View style={styles.scenery}>
            <Text style={[styles.skyEl, { left: 48, top: 6, fontSize: 26 }]}>{sunEmoji}</Text>
            <Text style={[styles.skyEl, { right: 55, top: 2, fontSize: 20 }]}>☁️</Text>
            <Text style={[styles.skyEl, { right: 115, top: 16, fontSize: 14 }]}>☁️</Text>
            <View style={styles.sceneryGround}>
              <Text style={styles.sceneryEl}>🌲</Text>
              <Text style={styles.sceneryEl}>🕌</Text>
              <Text style={styles.sceneryEl}>🌲</Text>
              <Text style={styles.sceneryEl}>🏛</Text>
              <Text style={styles.sceneryEl}>🌿</Text>
              <Text style={styles.sceneryEl}>🌲</Text>
              <Text style={styles.sceneryEl}>🌲</Text>
            </View>
          </View>
        </View>

        {/* ── Today Card ────────────────────────────────────── */}
        <TodayCard
          key={refreshKey}
          cityName={cityName}
          onSynagoguePress={openSynagogues}
        />

        {/* ── Daily Carousel ────────────────────────────────── */}
        <Text style={styles.sectionLabelSm}>תוכן יומי</Text>
        <DailyCarousel parasha={parasha} />

        {/* ── Search ────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
          onPress={() => navigation.navigate('List', undefined)}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <View style={styles.searchDivider} />
          <Text style={styles.searchPlaceholder}>מה אתה מחפש היום?</Text>
        </Pressable>

        {/* ── Categories ────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>קטגוריות</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shortcutsRow}
        >
          {ALL_SHORTCUTS.map((s) => (
            <ShortcutCompact
              key={s.type}
              icon={s.icon}
              color={s.color}
              bgColor={s.bg}
              label={s.label}
              onPress={() => openType(s.type as PlaceType)}
            />
          ))}
        </ScrollView>

        {/* ── Nearby ────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Pressable
            onPress={() => navigation.navigate('List', undefined)}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Text style={styles.seeAll}>{t.home.seeAll}</Text>
          </Pressable>
          <Text style={styles.sectionTitle}>{t.home.nearbyTitle}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <Loading />
          </View>
        ) : (
          <NearbyHorizontalList
            places={nearby}
            location={location}
            onPress={(id) => navigation.navigate('PlaceDetail', { id })}
          />
        )}
      </ScrollView>

      <LanguagePicker visible={langOpen} onClose={() => setLangOpen(false)} />
      <AppMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  );
}

// ── Inline components ────────────────────────────────────────────────────────

function ShortcutCompact({
  icon,
  label,
  onPress,
  color = colors.primary,
  bgColor = colors.primaryLight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  bgColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.shortcutH, pressed && styles.pressed]}
    >
      <View style={[styles.shortcutHIconBox, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.shortcutHLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl + 8,
  },

  // ── Hero ──────────────────────────────────────────────
  hero: {
    paddingTop: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  greetingBlock: {
    paddingHorizontal: spacing.lg,
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  greetingName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    letterSpacing: -0.5,
  },
  greetingDate: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 3,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  scenery: {
    height: 90,
    position: 'relative',
    overflow: 'hidden',
  },
  skyEl: {
    position: 'absolute',
  },
  sceneryGround: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: 4,
    gap: 6,
  },
  sceneryEl: {
    fontSize: 26,
    lineHeight: 30,
  },

  // ── Section labels ────────────────────────────────────
  sectionLabelSm: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'right',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Search ────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    ...shadow.card,
  },
  searchDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'right',
    opacity: 0.7,
  },

  // ── Categories horizontal ─────────────────────────────
  shortcutsRow: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingBottom: 4,
  },
  shortcutH: {
    width: 68,
    alignItems: 'center',
    gap: 7,
  },
  shortcutHIconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutHLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.1,
  },

  // ── Misc ──────────────────────────────────────────────
  pressed: {
    opacity: 0.85,
  },
  loadingBox: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
