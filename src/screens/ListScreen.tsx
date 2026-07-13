import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { PlaceCard } from '../components/PlaceCard';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { FilterSheet } from '../components/FilterSheet';
import { BirkatHamazonModal } from '../components/BirkatHamazonModal';
import { colors, radius, shadow, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { usePlaces } from '../hooks/usePlaces';
import { useSharedLocation, getCachedLocation } from '../context/LocationContext';
import { useFilters } from '../context/FiltersContext';
import { countActiveFilters, GeoPoint, KosherType, PlaceType } from '../types';
import { distanceKm } from '../utils/geo';
import { kosherTypeLabel } from '../utils/kosher';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ListRoute = RouteProp<RootStackParamList, 'List'>;

type LocationMode = 'current' | 'other';

async function geocodeAddress(query: string): Promise<GeoPoint | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=il`;
    const res = await fetch(url, { headers: { 'User-Agent': 'KarovApp/1.0' } });
    const data = await res.json();
    if (data[0]) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}

export function ListScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ListRoute>();
  const { filters, setFilter } = useFilters();

  const CATEGORY_TABS: Array<{ key: PlaceType | null; label: string; icon: string }> = [
    { key: null,           label: t.listCategories.all,          icon: 'apps-outline' },
    { key: 'restaurant',   label: t.listCategories.restaurant,   icon: 'restaurant-outline' },
    { key: 'synagogue',    label: t.listCategories.synagogue,    icon: 'business-outline' },
    { key: 'mikveh',       label: t.listCategories.mikveh,       icon: 'water-outline' },
    { key: 'chabad_house', label: t.listCategories.chabad_house, icon: 'home-outline' },
    { key: 'tzaddik_grave',label: t.listCategories.tzaddik_grave,icon: 'flower-outline' },
  ];

  const CUISINE_TABS: Array<{ key: string; label: string; emoji: string }> = [
    { key: 'coffee_shop', label: t.cuisine.coffee_shop, emoji: '☕' },
    { key: 'burger',      label: t.cuisine.burger,      emoji: '🍔' },
    { key: 'pizza',       label: t.cuisine.pizza,       emoji: '🍕' },
    { key: 'street_food', label: t.cuisine.street_food, emoji: '🥙' },
    { key: 'sushi',       label: t.cuisine.sushi,       emoji: '🍣' },
    { key: 'meat',        label: t.cuisine.meat,        emoji: '🥩' },
  ];
  const { places, loading, error, reload } = usePlaces(filters);
  const isFoodType = ['restaurant', 'fast_food', 'cafe', 'coffee_cart'].includes(filters.placeType ?? '');
  // Base places filtered by placeType only — used for kosherType chips + autocomplete
  const { places: basePlaces } = usePlaces(filters.placeType ? { placeType: filters.placeType } : {});
  const availableKosherTypes = useMemo<KosherType[]>(() => {
    if (!isFoodType) return [];
    const seen = new Set<KosherType>();
    for (const p of basePlaces) {
      if (p.kosherType) seen.add(p.kosherType as KosherType);
    }
    return Array.from(seen).sort((a, b) =>
      (kosherTypeLabel[a] ?? a).localeCompare(kosherTypeLabel[b] ?? b, 'he')
    );
  }, [basePlaces, isFoodType]);
  const { location: ctxLocation, status: locationStatus, request: requestLocation } = useSharedLocation();
  const ctxOrCachedLocation = ctxLocation ?? getCachedLocation();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [birkatOpen, setBirkatOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [radiusOpen, setRadiusOpen] = useState(false);

  // Location mode: use current GPS or a custom geocoded address
  const [locationMode, setLocationMode] = useState<LocationMode>('current');
  const [customAddress, setCustomAddress] = useState('');
  const [customLocation, setCustomLocation] = useState<GeoPoint | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const addressInputRef = useRef<TextInput>(null); // reused as searchRef when in 'other' mode

  const location = locationMode === 'current' ? ctxOrCachedLocation : customLocation;
  const sortByDistance = !!location;

  // Local search input — debounced
  const [inputText, setInputText] = useState(filters.query ?? '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<TextInput>(null);

  const suggestions = useMemo(() => {
    const q = inputText.trim();
    if (q.length < 1) return [];
    const lq = q.toLowerCase();
    const seen = new Set<string>();
    const names: string[] = [];
    const cities: string[] = [];
    for (const p of basePlaces) {
      if (p.name.includes(q) || p.name.toLowerCase().includes(lq)) {
        if (!seen.has(p.name) && names.length < 5) { seen.add(p.name); names.push(p.name); }
      }
      const city = p.address?.split(',').slice(-1)[0]?.trim();
      if (city && (city.includes(q) || city.toLowerCase().includes(lq))) {
        if (!seen.has(city) && cities.length < 3) { seen.add(city); cities.push(city); }
      }
    }
    return [...names, ...cities].slice(0, 6);
  }, [inputText, basePlaces]);

  useEffect(() => {
    if (route.params?.focus) {
      const timer = setTimeout(() => searchRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [route.params?.focus]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = inputText.trim();
      if (trimmed.length === 0) {
        setFilter('query', '');
      } else if (trimmed.length >= 2) {
        setFilter('query', trimmed);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputText]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try { await reload(); } finally { setIsRefreshing(false); }
  }, [reload]);

  const handleGeocode = async () => {
    const q = customAddress.trim();
    if (!q) return;
    setGeocoding(true);
    setGeocodeError('');
    const loc = await geocodeAddress(q);
    setGeocoding(false);
    if (loc) {
      setCustomLocation(loc);
    } else {
      setGeocodeError('לא מצאנו את המיקום, נסה שם עיר או כתובת אחרת');
    }
  };

  const switchToOtherMode = () => {
    setLocationMode('other');
    setCustomLocation(null);
    setCustomAddress('');
    setGeocodeError('');
    setTimeout(() => addressInputRef.current?.focus(), 150);
  };

  const switchToCurrentMode = () => {
    setLocationMode('current');
    setCustomLocation(null);
    setCustomAddress('');
    setGeocodeError('');
  };

  const activeCount = countActiveFilters(filters);

  const RADIUS_OPTIONS = [1, 3, 5, 10, 25, 50, 100];

  const sorted = useMemo(() => {
    let list = [...places];
    if (sortByDistance && location) {
      list = list.filter(p => distanceKm(location, p.location) <= radiusKm);
      list.sort((a, b) => distanceKm(location, a.location) - distanceKm(location, b.location));
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    }
    return list;
  }, [places, sortByDistance, location, radiusKm]);

  const screenTitle =
    filters.placeType === 'restaurant'   ? t.listCategories.restaurant
    : filters.placeType === 'fast_food'  ? 'מזון מהיר'
    : filters.placeType === 'cafe'       ? 'בתי קפה'
    : filters.placeType === 'coffee_cart'? 'עגלות קפה'
    : filters.placeType === 'synagogue'  ? t.listCategories.synagogue
    : filters.placeType === 'mikveh'     ? t.listCategories.mikveh
    : filters.placeType === 'chabad_house'   ? t.listCategories.chabad_house
    : filters.placeType === 'tzaddik_grave'  ? t.listCategories.tzaddik_grave
    : null;

  // Show results always in 'current' mode; in 'other' mode only after geocoding
  const showResults = locationMode === 'current' || customLocation !== null;

  // Show banner when in current mode but GPS not yet available
  const needsLocation = locationMode === 'current' && !location;

  return (
    <Screen padded>
      <View style={styles.titleRow}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            setFilter('placeType', null);
            setFilter('cuisineTag', null);
            setFilter('kosherType', null);
            navigation.goBack();
          }}
          hitSlop={12}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          <Text style={styles.backText}>חזרה</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          {screenTitle ? (
            <>
              <Text style={styles.title}>{screenTitle}</Text>
              {filters.placeType === 'restaurant' && (
                <Pressable onPress={() => setBirkatOpen(true)}>
                  <Text style={styles.birkatBtnText}>📖 ברכת המזון</Text>
                </Pressable>
              )}
            </>
          ) : (
            <Text style={styles.title}>מה יש סביבי?</Text>
          )}
        </View>
      </View>

      {/* Location mode row */}
      <View style={styles.locationModeRow}>
        {/* "סביבי" pill */}
        <Pressable
          style={[styles.modePill, locationMode === 'current' && styles.modePillActive]}
          onPress={switchToCurrentMode}
        >
          <Ionicons name="navigate" size={13} color={locationMode === 'current' ? '#fff' : colors.textMuted} />
          <Text style={[styles.modePillText, locationMode === 'current' && styles.modePillTextActive]}>
            סביבי
          </Text>
        </Pressable>

        {/* "סביב מיקום אחר" — collapses into inline input when active */}
        {locationMode === 'other' ? (
          <View style={styles.geocodeRow}>
            <Pressable
              style={[styles.geocodeSubmitBtn, geocoding && { opacity: 0.6 }]}
              onPress={handleGeocode}
              disabled={geocoding}
            >
              {geocoding
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="arrow-back" size={15} color="#fff" />}
            </Pressable>
            <TextInput
              ref={addressInputRef}
              style={styles.geocodeInput}
              placeholder="עיר או כתובת..."
              placeholderTextColor={colors.textMuted}
              value={customAddress}
              onChangeText={(v) => { setCustomAddress(v); setGeocodeError(''); setCustomLocation(null); }}
              textAlign="right"
              returnKeyType="search"
              onSubmitEditing={handleGeocode}
            />
            {customLocation
              ? <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              : null}
            <Pressable onPress={switchToCurrentMode} hitSlop={6}>
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.modePill}
            onPress={switchToOtherMode}
          >
            <Ionicons name="search" size={13} color={colors.textMuted} />
            <Text style={styles.modePillText}>סביב מיקום אחר</Text>
          </Pressable>
        )}
      </View>
      {geocodeError ? <Text style={styles.geocodeError}>{geocodeError}</Text> : null}

      {/* Search pill — hidden in "other" mode until a location is geocoded */}
      {(locationMode === 'current' || customLocation !== null) && (
        <View>
          <View style={styles.searchPill}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="חיפוש לפי שם, רחוב או עיר..."
              placeholderTextColor={colors.textMuted}
              ref={searchRef}
              value={inputText}
              onChangeText={(v) => { setInputText(v); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              textAlign="right"
              returnKeyType="search"
            />
            {inputText.length > 0 && (
              <Pressable onPress={() => { setInputText(''); setFilter('query', ''); setShowSuggestions(false); }} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
            <View style={styles.pillDivider} />
            <Pressable style={styles.filterTrigger} onPress={() => setSheetOpen(true)} hitSlop={8}>
              <Ionicons
                name="options-outline"
                size={20}
                color={activeCount > 0 ? colors.primary : colors.textMuted}
              />
              {activeCount > 0 && <View style={styles.filterDot} />}
            </Pressable>
          </View>
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionBox}>
              {suggestions.map((s) => (
                <Pressable
                  key={s}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setInputText(s);
                    setFilter('query', s);
                    setShowSuggestions(false);
                  }}
                >
                  <Ionicons name="search-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.suggestionText} numberOfLines={1}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Category tabs — cuisine sub-tabs for restaurants, category tabs only when no type selected */}
      {filters.placeType === 'restaurant' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {CUISINE_TABS.map((tab) => {
            const active = filters.cuisineTag === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setFilter('cuisineTag', active ? null : tab.key)}
              >
                <Text style={styles.tabEmoji}>{tab.emoji}</Text>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : filters.placeType === null ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {CATEGORY_TABS.map((tab) => {
            const active = filters.placeType === tab.key;
            return (
              <Pressable
                key={String(tab.key)}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => {
                  setFilter('placeType', tab.key);
                  setFilter('cuisineTag', null);
                }}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={active ? '#fff' : colors.textMuted}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Kashrut type chips — only for food categories, dynamic from data */}
      {isFoodType && availableKosherTypes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          <Pressable
            style={[styles.tab, filters.kosherType === null && styles.tabActive]}
            onPress={() => setFilter('kosherType', null)}
          >
            <Text style={[styles.tabText, filters.kosherType === null && styles.tabTextActive]}>הכל</Text>
          </Pressable>
          {availableKosherTypes.map((kt) => (
            <Pressable
              key={kt}
              style={[styles.tab, filters.kosherType === kt && styles.tabActive]}
              onPress={() => setFilter('kosherType', filters.kosherType === kt ? null : kt)}
            >
              <Text style={[styles.tabText, filters.kosherType === kt && styles.tabTextActive]}>
                {kosherTypeLabel[kt] ?? kt}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Location prompt — when no GPS location yet */}
      {needsLocation && (
        <Pressable style={styles.locationBanner} onPress={requestLocation}>
          <Ionicons name="location-outline" size={16} color="#92400e" />
          <Text style={styles.locationBannerText}>
            {locationStatus === 'denied'
              ? 'הפעלת מיקום בהגדרות? לחץ כאן לנסות שוב'
              : 'הפעל שירותי מיקום כדי לראות מקומות קרובים אליך'}
          </Text>
          <Ionicons name="chevron-back" size={14} color="#92400e" />
        </Pressable>
      )}

      {!showResults ? (
        needsLocation ? null : (
          <EmptyState
            title="חפש מיקום"
            hint="הקלד עיר, רחוב או שם מקום ולחץ על החץ"
            icon="search-outline"
          />
        )
      ) : (
        <>
          {/* Radius toggle + slider */}
          {sortByDistance && (
            <View style={styles.radiusBlock}>
              <Pressable style={styles.radiusTrigger} onPress={() => setRadiusOpen(o => !o)}>
                <Ionicons name="navigate-circle-outline" size={15} color={colors.primary} />
                <Text style={styles.radiusTriggerText}>טווח חיפוש · {radiusKm} ק״מ</Text>
                <Ionicons name={radiusOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
              </Pressable>
              {radiusOpen && (
                <View style={styles.sliderBox}>
                  <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={100}
                    step={1}
                    value={radiusKm}
                    onValueChange={(v) => setRadiusKm(Math.round(v))}
                    minimumTrackTintColor={colors.primary}
                    maximumTrackTintColor={colors.border}
                    thumbTintColor={colors.primary}
                  />
                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabel}>100 ק״מ</Text>
                    <Text style={styles.sliderValue}>{radiusKm} ק״מ</Text>
                    <Text style={styles.sliderLabel}>1 ק״מ</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.resultCount}>{t.list.resultsCount(sorted.length)}</Text>
            <View style={styles.sortToggle}>
              <Ionicons name={sortByDistance ? 'navigate' : 'text'} size={14} color={colors.primary} />
              <Text style={styles.sortText}>
                {sortByDistance ? t.list.sortByDistance : t.list.sortByName}
              </Text>
            </View>
          </View>
          {loading && !isRefreshing && places.length === 0 ? (
        <Loading />
      ) : error ? (
        <EmptyState title={t.common.error} hint={t.common.retry} icon="alert-circle-outline" />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          ListEmptyComponent={
            <EmptyState title={t.common.empty} hint={t.common.emptyHint} />
          }
          renderItem={({ item }) => (
            <PlaceCard
              place={item}
              distanceKm={location ? distanceKm(location, item.location) : null}
              onPress={() => navigation.navigate('PlaceDetail', { id: item.id })}
            />
          )}
        />
          )}
        </>
      )}

      <FilterSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
      <BirkatHamazonModal visible={birkatOpen} onClose={() => setBirkatOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  birkatBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'right',
  },

  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    ...shadow.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  pillDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
  },
  filterTrigger: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  geocodeInlinBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  suggestionBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    marginBottom: spacing.xs,
    overflow: 'hidden',
    ...shadow.card,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },

  // Location mode toggle
  locationModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modePillTextActive: {
    color: '#fff',
  },

  // Inline geocode input (expands inside the mode row)
  geocodeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  geocodeInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  geocodeSubmitBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  geocodeError: {
    fontSize: 12,
    color: colors.danger,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },

  // Category tabs
  tabsScroll: {
    marginBottom: spacing.sm,
    flexGrow: 0,
    flexShrink: 0,
    height: 40,
  },
  tabsContent: {
    gap: 8,
    paddingRight: 2,
    paddingLeft: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabEmoji: {
    fontSize: 13,
  },

  // Location banner
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  locationBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#92400e',
    textAlign: 'right',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  sortToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: spacing.xs,
    marginEnd: -spacing.xs,
  },
  sortText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  listContent: {
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },

  radiusBlock: {
    marginBottom: spacing.sm,
  },
  radiusTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  radiusTriggerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  sliderBox: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  sliderLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },

});
