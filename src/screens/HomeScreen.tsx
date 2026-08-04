import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, DESKTOP_BREAKPOINT } from '../components/Screen';
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
import { emptyFilters, PlaceSubType, PlaceType } from '../types';
import { RootStackParamList } from '../navigation/types';
import { Place } from '../types/place';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HEBREW_DAYS = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];

const ALL_SHORTCUTS = [
  { icon: 'cafe' as const,          color: colors.categoryCafe,       bg: '#F0EAF8', label: 'בתי קפה',     type: 'cafe' },
  { icon: 'cafe-outline' as const,  color: colors.categoryCoffeeCart, bg: '#EBF5E6', label: 'עגלות קפה',   type: 'coffee_cart' },
  { icon: 'wine' as const,          color: colors.categoryWinery,     bg: '#F8EAF0', label: 'ייקבים',      type: 'winery' },
  { icon: 'business' as const,      color: colors.categorySynagogue,  bg: '#E8F1FC', label: 'בתי כנסת',    type: 'synagogue' },
  { icon: 'water' as const,         color: colors.categoryMikveh,     bg: '#E5F5FD', label: 'מקוואות',     type: 'mikveh' },
  { icon: 'home' as const,          color: colors.chabad,             bg: '#F0EBF8', label: 'בתי חב"ד',    type: 'chabad_house' },
  { icon: 'flower-outline' as const,color: colors.tzaddik,            bg: '#F5EEEA', label: 'קברי צדיקים', type: 'tzaddik_grave' },
] as const;

const EAT_OPTIONS = [
  { emoji: '🍽️', label: 'מסעדות',     placeType: 'restaurant' as PlaceType, subType: null as PlaceSubType | null },
  { emoji: '🍔', label: 'מזון מהיר',  placeType: 'restaurant' as PlaceType, subType: 'fast_food' as PlaceSubType },
  { emoji: '👨‍🍳', label: 'מסעדות שף', placeType: 'restaurant' as PlaceType, subType: 'chef_restaurant' as PlaceSubType },
] as const;

const FAV_SYN_KEY = '@karov/favoriteSynagogue';

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
  const [eatMenuOpen, setEatMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [favoriteSynagogue, setFavoriteSynagogue] = useState<Place | null>(null);

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  useEffect(() => {
    AsyncStorage.getItem('@karov/auth').then((raw) => {
      if (!raw) return;
      try {
        const auth = JSON.parse(raw);
        if (auth.name && auth.type !== 'guest') setUserName(auth.name);
      } catch {}
    });
  }, []);

  // Re-read favorite synagogue every time screen is focused
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(FAV_SYN_KEY).then((raw) => {
        if (!raw) { setFavoriteSynagogue(null); return; }
        try { setFavoriteSynagogue(JSON.parse(raw)); } catch {}
      });
    }, []),
  );

  const nearby = useMemo(() => {
    const list = [...places];
    if (location) {
      list.sort((a, b) => distanceKm(location, a.location) - distanceKm(location, b.location));
    } else {
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return list.slice(0, isDesktop ? 8 : 6);
  }, [places, location, isDesktop]);

  const openType = (placeType: PlaceType) => {
    setFilters({ ...emptyFilters, placeType });
    navigation.navigate('List', undefined);
  };

  const openEatOption = (placeType: PlaceType, subType: PlaceSubType | null) => {
    setFilters({ ...emptyFilters, placeType, subType });
    setEatMenuOpen(false);
    navigation.navigate('List', undefined);
  };

  const openSynagogues = useCallback(() => {
    setFilters({ ...emptyFilters, placeType: 'synagogue' });
    navigation.navigate('List', { selectSynagogue: true });
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

  const locationDisplay = cityName ?? (location ? '...' : null);

  // ── Hero section (shared between mobile & desktop)
  const heroSection = (
    <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
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

      {!isDesktop && (
        <JerusalemIllustration isNight={isNight} isShabbat={isShabbat} />
      )}
    </View>
  );

  const todayCardSection = (
    <TodayCard
      key={refreshKey}
      cityName={cityName}
      onSynagoguePress={openSynagogues}
      favoriteSynagogue={favoriteSynagogue}
    />
  );

  const contentSection = (
    <>
      <Text style={[styles.sectionLabelSm, isDesktop && styles.sectionLabelSmDesktop]}>תוכן יומי</Text>
      <DailyCarousel parasha={parasha} />
    </>
  );

  const searchSection = (
    <Pressable
      style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
      onPress={() => navigation.navigate('List', undefined)}
    >
      <Ionicons name="search-outline" size={18} color={colors.textMuted} />
      <View style={styles.searchDivider} />
      <Text style={styles.searchPlaceholder}>מה אתה מחפש היום?</Text>
    </Pressable>
  );

  const categoriesSection = (
    <>
      <Text style={[styles.sectionTitle, isDesktop && styles.sectionTitleDesktop, { paddingHorizontal: isDesktop ? 0 : spacing.lg }]}>
        קטגוריות
      </Text>
      {isDesktop ? (
        <View style={styles.shortcutsGrid}>
          {/* לאכול shortcut — opens modal */}
          <ShortcutCompact
            icon="restaurant"
            color={colors.categoryRestaurant}
            bgColor="#FEF3E2"
            label="לאכול"
            onPress={() => setEatMenuOpen(true)}
            desktop
          />
          {ALL_SHORTCUTS.map((s) => (
            <ShortcutCompact
              key={s.type}
              icon={s.icon}
              color={s.color}
              bgColor={s.bg}
              label={s.label}
              onPress={() => openType(s.type as PlaceType)}
              desktop
            />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shortcutsRow}
        >
          {/* לאכול shortcut — opens modal */}
          <ShortcutCompact
            icon="restaurant"
            color={colors.categoryRestaurant}
            bgColor="#FEF3E2"
            label="לאכול"
            onPress={() => setEatMenuOpen(true)}
          />
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
      )}
    </>
  );

  const nearbySection = (
    <>
      <View style={[styles.sectionHeader, isDesktop && styles.sectionHeaderDesktop]}>
        <Pressable
          onPress={() => navigation.navigate('List', undefined)}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Text style={styles.seeAll}>{t.home.seeAll}</Text>
        </Pressable>
        <Text style={[styles.sectionTitle, isDesktop && styles.sectionTitleDesktop]}>
          {t.home.nearbyTitle}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <Loading />
        </View>
      ) : isDesktop ? (
        <View style={styles.nearbyGrid}>
          {nearby.map((place) => (
            <Pressable
              key={place.id}
              style={({ pressed }) => [styles.nearbyGridCard, pressed && styles.pressed]}
              onPress={() => navigation.navigate('PlaceDetail', { id: place.id })}
            >
              <Text style={styles.nearbyCardName} numberOfLines={1}>{place.name}</Text>
              <Text style={styles.nearbyCardSub} numberOfLines={1}>
                {place.address ?? ''}
                {location ? ` · ${distanceKm(location, place.location).toFixed(1)} ק״מ` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <NearbyHorizontalList
          places={nearby}
          location={location}
          onPress={(id) => navigation.navigate('PlaceDetail', { id })}
        />
      )}
    </>
  );

  if (isDesktop) {
    return (
      <Screen>
        <ScrollView
          contentContainerStyle={styles.desktopContent}
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
          {heroSection}

          <View style={styles.desktopColumns}>
            {/* Left column */}
            <View style={styles.desktopLeft}>
              {todayCardSection}
              {contentSection}
            </View>

            {/* Right column */}
            <View style={styles.desktopRight}>
              {searchSection}
              {categoriesSection}
              {nearbySection}
            </View>
          </View>
        </ScrollView>

        <LanguagePicker visible={langOpen} onClose={() => setLangOpen(false)} />
        <AppMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
        <EatMenuModal
          visible={eatMenuOpen}
          onClose={() => setEatMenuOpen(false)}
          onSelect={openEatOption}
        />
      </Screen>
    );
  }

  // ── Mobile layout ────────────────────────────────────────────────────────────
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
        {heroSection}
        {todayCardSection}
        {contentSection}
        {searchSection}
        {categoriesSection}
        {nearbySection}
      </ScrollView>

      <LanguagePicker visible={langOpen} onClose={() => setLangOpen(false)} />
      <AppMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
      <EatMenuModal
        visible={eatMenuOpen}
        onClose={() => setEatMenuOpen(false)}
        onSelect={openEatOption}
      />
    </Screen>
  );
}

// ── Eat Menu Modal ───────────────────────────────────────────────────────────

function EatMenuModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (placeType: PlaceType, subType: PlaceSubType | null) => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={eatStyles.container}>
        <View style={eatStyles.handle} />
        <Text style={eatStyles.title}>לאכול</Text>
        <Text style={eatStyles.subtitle}>בחר קטגוריה</Text>
        <View style={eatStyles.optionsGrid}>
          {EAT_OPTIONS.map((opt) => (
            <Pressable
              key={`${opt.placeType}-${opt.subType ?? 'all'}`}
              style={({ pressed }) => [eatStyles.optionCard, pressed && eatStyles.optionPressed]}
              onPress={() => onSelect(opt.placeType, opt.subType)}
            >
              <Text style={eatStyles.optionEmoji}>{opt.emoji}</Text>
              <Text style={eatStyles.optionLabel}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={eatStyles.cancelBtn} onPress={onClose}>
          <Text style={eatStyles.cancelText}>ביטול</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const eatStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.xl,
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  optionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  cancelBtn: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
  },
});

// ── Jerusalem Illustration ───────────────────────────────────────────────────

function JerusalemIllustration({ isNight, isShabbat }: { isNight: boolean; isShabbat: boolean }) {
  const skyColor = isShabbat ? '#F5F0E8' : isNight ? '#1a2744' : '#FFF0CC';
  const buildingColor = isNight ? '#2a3a5c' : '#C9A96E';
  const buildingDark = isNight ? '#1e2d4a' : '#B08040';
  const domeColor = isNight ? '#3a4e70' : '#D4A843';
  const starColor = isNight ? '#FFD700' : '#E8A317';
  const groundColor = isNight ? '#0f1a30' : '#A67C52';

  return (
    <View style={illStyles.container}>
      {/* Sky */}
      <View style={[illStyles.sky, { backgroundColor: skyColor }]} />

      {/* Stars / Candles at night */}
      {isNight && !isShabbat && (
        <>
          <View style={[illStyles.star, { left: '15%', top: 8 }]} />
          <View style={[illStyles.star, { left: '35%', top: 18 }, { width: 3, height: 3 }]} />
          <View style={[illStyles.star, { right: '20%', top: 6 }]} />
          <View style={[illStyles.star, { right: '38%', top: 20 }, { width: 3, height: 3 }]} />
        </>
      )}
      {isShabbat && (
        <View style={[illStyles.candleGroup]}>
          <View style={illStyles.candleFlame} />
          <View style={illStyles.candleBody} />
          <View style={[illStyles.candleFlame, { marginLeft: 12 }]} />
          <View style={[illStyles.candleBody, { marginLeft: -8 }]} />
        </View>
      )}

      {/* Sun / Moon */}
      {!isShabbat && (
        <View style={[
          illStyles.celestial,
          isNight
            ? { backgroundColor: '#D4D0C0', borderRadius: 14, width: 28, height: 28, left: 24, top: 10 }
            : { backgroundColor: '#FFB800', borderRadius: 20, width: 36, height: 36, left: 20, top: 8 },
        ]} />
      )}

      {/* Buildings silhouette */}
      <View style={illStyles.ground}>
        {/* Ground strip */}
        <View style={[illStyles.groundStrip, { backgroundColor: groundColor }]} />

        {/* Left tower */}
        <View style={[illStyles.building, { left: '5%', width: 22, height: 38, backgroundColor: buildingColor }]}>
          <View style={[illStyles.window, { top: 6 }]} />
          <View style={[illStyles.window, { top: 18 }]} />
        </View>

        {/* Left tree (stylized) */}
        <View style={[illStyles.tree, { left: '16%' }]}>
          <View style={[illStyles.treeTop, { backgroundColor: isNight ? '#1a3a2a' : '#2d6a3f' }]} />
          <View style={illStyles.treeTrunk} />
        </View>

        {/* Dome (Dome of the Rock style) */}
        <View style={[illStyles.domeBase, { backgroundColor: buildingDark }]}>
          <View style={[illStyles.dome, { backgroundColor: domeColor }]} />
          <View style={[illStyles.domeWindow]} />
        </View>

        {/* Center tower / minaret style */}
        <View style={[illStyles.building, { left: '52%', width: 14, height: 50, backgroundColor: buildingColor }]}>
          <View style={[illStyles.towerTop, { backgroundColor: domeColor }]} />
          <View style={[illStyles.window, { top: 14 }]} />
          <View style={[illStyles.window, { top: 28 }]} />
        </View>

        {/* Right building */}
        <View style={[illStyles.building, { right: '16%', width: 28, height: 34, backgroundColor: buildingDark }]}>
          <View style={[illStyles.window, { top: 6, right: 4 }]} />
          <View style={[illStyles.window, { top: 18, right: 4 }]} />
        </View>

        {/* Right tree */}
        <View style={[illStyles.tree, { right: '6%' }]}>
          <View style={[illStyles.treeTop, { backgroundColor: isNight ? '#1a3a2a' : '#2d6a3f' }]} />
          <View style={illStyles.treeTrunk} />
        </View>

        {/* Star of David */}
        <Text style={[illStyles.magen, { color: starColor, opacity: isNight ? 0.9 : 0.5 }]}>✡</Text>
      </View>
    </View>
  );
}

const illStyles = StyleSheet.create({
  container: {
    height: 88,
    overflow: 'hidden',
    position: 'relative',
  },
  sky: {
    ...StyleSheet.absoluteFill,
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  candleGroup: {
    position: 'absolute',
    right: 24,
    top: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  candleFlame: {
    width: 8,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#FFB800',
    opacity: 0.9,
  },
  candleBody: {
    width: 8,
    height: 20,
    backgroundColor: '#F5DEB3',
    marginTop: -2,
  },
  celestial: {
    position: 'absolute',
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
  },
  groundStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
    opacity: 0.7,
  },
  building: {
    position: 'absolute',
    bottom: 8,
  },
  window: {
    position: 'absolute',
    left: 4,
    width: 5,
    height: 5,
    backgroundColor: 'rgba(255,220,100,0.6)',
    borderRadius: 1,
  },
  towerTop: {
    position: 'absolute',
    top: -6,
    left: 4,
    width: 6,
    height: 8,
    borderRadius: 3,
  },
  domeBase: {
    position: 'absolute',
    bottom: 8,
    left: '33%',
    width: 44,
    height: 28,
    alignItems: 'center',
  },
  dome: {
    position: 'absolute',
    top: -14,
    width: 32,
    height: 20,
    borderRadius: 16,
  },
  domeWindow: {
    position: 'absolute',
    bottom: 6,
    width: 8,
    height: 10,
    backgroundColor: 'rgba(255,220,100,0.5)',
    borderRadius: 4,
  },
  tree: {
    position: 'absolute',
    bottom: 8,
    alignItems: 'center',
    width: 20,
  },
  treeTop: {
    width: 18,
    height: 22,
    borderRadius: 9,
  },
  treeTrunk: {
    width: 5,
    height: 8,
    backgroundColor: '#7A5C2E',
    marginTop: -2,
  },
  magen: {
    position: 'absolute',
    right: '30%',
    top: 2,
    fontSize: 14,
  },
});

// ── Shortcut component ───────────────────────────────────────────────────────

function ShortcutCompact({
  icon,
  label,
  onPress,
  color = colors.primary,
  bgColor = colors.primaryLight,
  desktop = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  bgColor?: string;
  desktop?: boolean;
}) {
  if (desktop) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.shortcutDesktop, pressed && styles.pressed]}
      >
        <View style={[styles.shortcutDesktopIcon, { backgroundColor: bgColor }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.shortcutDesktopLabel} numberOfLines={1}>{label}</Text>
      </Pressable>
    );
  }

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
  desktopContent: {
    paddingBottom: spacing.xxl + 8,
    paddingHorizontal: spacing.xl,
  },

  // ── Desktop layout
  desktopColumns: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  desktopLeft: {
    flex: 55,
    minWidth: 0,
  },
  desktopRight: {
    flex: 45,
    minWidth: 0,
  },

  // ── Hero ──────────────────────────────────────────────
  hero: {
    paddingTop: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  heroDesktop: {
    marginBottom: spacing.lg,
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
  sectionLabelSmDesktop: {
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.text,
  },
  sectionTitleDesktop: {
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionHeaderDesktop: {
    paddingHorizontal: 0,
    marginTop: spacing.lg,
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

  // ── Categories horizontal (mobile) ────────────────────
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

  // ── Categories grid (desktop) ─────────────────────────
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  shortcutDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    minWidth: '30%',
    flex: 1,
  },
  shortcutDesktopIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  shortcutDesktopLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },

  // ── Nearby grid (desktop) ─────────────────────────────
  nearbyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nearbyGridCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    minWidth: '48%',
    flex: 1,
    ...shadow.card,
  },
  nearbyCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
    marginBottom: 4,
  },
  nearbyCardSub: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
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
