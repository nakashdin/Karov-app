import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { PlaceCard } from '../components/PlaceCard';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { FilterSheet } from '../components/FilterSheet';
import { BirkatHamazonModal } from '../components/BirkatHamazonModal';
import { MapView } from '../components/map/MapView';
import { PlaceBottomCard } from '../components/map/PlaceBottomCard';
import { colors, radius, shadow, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { usePlaces } from '../hooks/usePlaces';
import { useSharedLocation, getCachedLocation } from '../context/LocationContext';
import { useFilters } from '../context/FiltersContext';
import { countActiveFilters, GeoPoint, PlaceSubType, PlaceType } from '../types';
import { distanceKm } from '../utils/geo';
import { categoryLabel } from '../utils/kosher';
import { RootStackParamList } from '../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAV_SYN_KEY = '@karov/favoriteSynagogue';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ListRoute = RouteProp<RootStackParamList, 'List'>;

const EAT_SUB_TABS: Array<{ emoji: string; label: string; placeType: PlaceType | null; subType: PlaceSubType | null; eatAll?: boolean }> = [
  { emoji: '🍽️', label: 'הכל',        placeType: null,           subType: null,              eatAll: true },
  { emoji: '🍽️', label: 'מסעדות',    placeType: 'restaurant',   subType: null },
  { emoji: '👨‍🍳', label: 'מסעדות שף', placeType: 'restaurant',  subType: 'chef_restaurant' },
  { emoji: '☕', label: 'בתי קפה',    placeType: 'cafe',         subType: null },
  { emoji: '🛒', label: 'עגלות קפה',  placeType: 'coffee_cart',  subType: null },
];

export function ListScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ListRoute>();
  const { filters, setFilter } = useFilters();

  const CATEGORY_TABS: Array<{ key: PlaceType | null; label: string; icon: string; isEat?: boolean }> = [
    { key: null,           label: t.listCategories.all,          icon: 'apps-outline' },
    { key: 'restaurant',   label: 'לאכול',                       icon: 'restaurant-outline', isEat: true },
    { key: 'synagogue',    label: t.listCategories.synagogue,    icon: 'business-outline' },
    { key: 'mikveh',       label: t.listCategories.mikveh,       icon: 'water-outline' },
    { key: 'chabad_house', label: t.listCategories.chabad_house, icon: 'home-outline' },
    { key: 'tzaddik_grave',label: t.listCategories.tzaddik_grave,icon: 'flower-outline' },
  ];

  const isEatMode = filters.eatAll || ['restaurant', 'cafe', 'coffee_cart'].includes(filters.placeType ?? '');
  const isFoodType = filters.eatAll || ['restaurant', 'fast_food', 'cafe', 'coffee_cart', 'juice_bar', 'ice_cream_parlor', 'bakery'].includes(filters.placeType ?? '');

  const { places, loading, error, reload } = usePlaces(filters);
  const { places: basePlaces } = usePlaces(filters.placeType ? { placeType: filters.placeType } : {});

  const { location: ctxLocation, status: locationStatus, request: requestLocation } = useSharedLocation();
  const location = ctxLocation ?? getCachedLocation();
  const sortByDistance = !!location;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [birkatOpen, setBirkatOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedPlace, setSelectedPlace] = useState<import('../types').Place | null>(null);

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

  const selectSynagogue = route.params?.selectSynagogue ?? false;

  useEffect(() => {
    if (selectSynagogue && filters.placeType !== 'synagogue') {
      setFilter('placeType', 'synagogue');
    }
  }, [selectSynagogue]);

  const handleSelectSynagogue = useCallback(async (place: import('../types').Place) => {
    await AsyncStorage.setItem(FAV_SYN_KEY, JSON.stringify(place)).catch(() => {});
    navigation.goBack();
  }, [navigation]);

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

  const handleEatSubTab = (tab: typeof EAT_SUB_TABS[number]) => {
    setFilter('eatAll', tab.eatAll ?? false);
    setFilter('placeType', tab.placeType ?? null);
    setFilter('subType', tab.subType);
    setFilter('cuisineTag', null);
  };

  const activeCount = countActiveFilters(filters);

  const effectiveDistanceKm = filters.distanceKm ?? 20;

  const sorted = useMemo(() => {
    let list = [...places];
    if (sortByDistance && location) {
      if (filters.distanceKm !== null) {
        list = list.filter(p => distanceKm(location, p.location) <= effectiveDistanceKm);
      }
      list.sort((a, b) => distanceKm(location, a.location) - distanceKm(location, b.location));
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    }
    return list;
  }, [places, sortByDistance, location, filters.distanceKm]);

  const screenTitle =
    filters.placeType === 'restaurant' && filters.subType === 'fast_food'        ? 'מזון מהיר'
    : filters.placeType === 'restaurant' && filters.subType === 'chef_restaurant' ? 'מסעדות שף'
    : filters.placeType === 'restaurant'    ? t.listCategories.restaurant
    : filters.placeType === 'fast_food'     ? 'מזון מהיר'
    : filters.placeType === 'cafe'          ? 'בתי קפה'
    : filters.placeType === 'coffee_cart'   ? 'עגלות קפה'
    : filters.placeType === 'synagogue'     ? t.listCategories.synagogue
    : filters.placeType === 'mikveh'        ? t.listCategories.mikveh
    : filters.placeType === 'chabad_house'  ? t.listCategories.chabad_house
    : filters.placeType === 'tzaddik_grave' ? t.listCategories.tzaddik_grave
    : null;

  const needsLocation = !location;

  return (
    <Screen padded>
      {selectSynagogue && (
        <View style={styles.selectionBanner}>
          <Ionicons name="business-outline" size={16} color={colors.categorySynagogue} />
          <Text style={styles.selectionBannerText}>בחר בית כנסת מועדף — הוא יופיע בכרטיס הבית</Text>
        </View>
      )}
      <View style={styles.titleRow}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (!selectSynagogue) {
              setFilter('placeType', null);
              setFilter('subType', null);
              setFilter('cuisineTag', null);
              setFilter('mehadrinOnly', false);
              setFilter('kosherAuthorityGroup', null);
              setFilter('eatAll', false);
            }
            navigation.goBack();
          }}
          hitSlop={12}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          <Text style={styles.backText}>חזרה</Text>
        </Pressable>
        <View style={styles.titleBlock}>
          {selectSynagogue ? (
            <Text style={styles.title}>בתי כנסת</Text>
          ) : screenTitle ? (
            <>
              <Text style={styles.title}>{screenTitle}</Text>
              {filters.placeType === 'restaurant' && (
                <Pressable onPress={() => setBirkatOpen(true)}>
                  <Text style={styles.birkatBtnText}>📖 ברכת המזון</Text>
                </Pressable>
              )}
            </>
          ) : (
            <Text style={styles.title}>חיפוש</Text>
          )}
        </View>
        <Pressable
          style={styles.viewToggle}
          onPress={() => { setViewMode(v => v === 'list' ? 'map' : 'list'); setSelectedPlace(null); }}
        >
          <Ionicons
            name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
            size={20}
            color={colors.primary}
          />
        </Pressable>
      </View>

      {/* Search pill */}
      <View>
        <View style={[styles.searchPill, searchFocused && styles.searchPillFocused]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="חיפוש לפי שם, רחוב או עיר..."
            placeholderTextColor={colors.textMuted}
            ref={searchRef}
            value={inputText}
            onChangeText={(v) => { setInputText(v); setShowSuggestions(true); }}
            onFocus={() => { setShowSuggestions(true); setSearchFocused(true); }}
            onBlur={() => { setTimeout(() => setShowSuggestions(false), 150); setSearchFocused(false); }}
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
              name="menu"
              size={22}
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

      {/* Category tabs or EAT sub-tabs */}
      {isEatMode ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {EAT_SUB_TABS.map((tab) => {
            const active = tab.eatAll
              ? filters.eatAll
              : !filters.eatAll &&
                tab.placeType === filters.placeType &&
                tab.subType === (filters.subType ?? null);
            return (
              <Pressable
                key={`${tab.placeType ?? 'all'}-${tab.subType ?? 'all'}`}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => handleEatSubTab(tab)}
              >
                <Text style={styles.tabEmoji}>{tab.emoji}</Text>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
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
            const active = tab.isEat ? isEatMode : (!filters.eatAll && filters.placeType === tab.key);
            return (
              <Pressable
                key={String(tab.key)}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => {
                  if (tab.isEat) {
                    setFilter('eatAll', true);
                    setFilter('placeType', null);
                    setFilter('subType', null);
                  } else {
                    setFilter('eatAll', false);
                    setFilter('placeType', tab.key);
                  }
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

      {/* Active filter chips */}
      {(filters.category || filters.mehadrinOnly || filters.kosherAuthorityGroup || filters.cityId || filters.cuisineTag || (sortByDistance && filters.distanceKm !== 20 && filters.distanceKm !== null)) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeFiltersScroll}
          contentContainerStyle={styles.activeFiltersContent}
        >
          {filters.category && (
            <Pressable style={styles.activeChip} onPress={() => setFilter('category', null)}>
              <Text style={styles.activeChipText}>{categoryLabel[filters.category]}</Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </Pressable>
          )}
          {filters.mehadrinOnly && (
            <Pressable style={styles.activeChip} onPress={() => setFilter('mehadrinOnly', false)}>
              <Text style={styles.activeChipText}>מהדרין בלבד</Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </Pressable>
          )}
          {filters.kosherAuthorityGroup && (
            <Pressable style={styles.activeChip} onPress={() => setFilter('kosherAuthorityGroup', null)}>
              <Text style={styles.activeChipText}>
                {{ rabbinate: 'רבנות', badatz: 'בד״ץ', tzohar: 'צהר', unknown: 'לא ידוע' }[filters.kosherAuthorityGroup] ?? filters.kosherAuthorityGroup}
              </Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </Pressable>
          )}
          {filters.cuisineTag && (
            <Pressable style={styles.activeChip} onPress={() => setFilter('cuisineTag', null)}>
              <Text style={styles.activeChipText}>{filters.cuisineTag}</Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </Pressable>
          )}
          {filters.cityId && (
            <Pressable style={styles.activeChip} onPress={() => setFilter('cityId', null)}>
              <Text style={styles.activeChipText}>{filters.cityId}</Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </Pressable>
          )}
          {sortByDistance && filters.distanceKm !== 20 && filters.distanceKm !== null && (
            <Pressable style={styles.activeChip} onPress={() => setFilter('distanceKm', 20)}>
              <Text style={styles.activeChipText}>{filters.distanceKm} ק״מ</Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Location prompt */}
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
      ) : viewMode === 'map' ? (
        <View style={styles.mapWrap}>
          <MapView
            places={sorted}
            userLocation={location}
            onSelectPlace={setSelectedPlace}
          />
          {selectedPlace && (
            <PlaceBottomCard
              place={selectedPlace}
              onClose={() => setSelectedPlace(null)}
              onOpenDetails={() => {
                const id = selectedPlace.id;
                setSelectedPlace(null);
                navigation.navigate('PlaceDetail', { id });
              }}
            />
          )}
        </View>
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
              onPress={() => selectSynagogue
                ? handleSelectSynagogue(item)
                : navigation.navigate('PlaceDetail', { id: item.id })
              }
            />
          )}
        />
      )}

      <FilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        isFoodMode={isFoodType}
        hasLocation={sortByDistance}
      />
      <BirkatHamazonModal visible={birkatOpen} onClose={() => setBirkatOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  selectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F1FC',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  selectionBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.categorySynagogue,
    textAlign: 'right',
  },
  viewToggle: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mapWrap: {
    flex: 1,
    overflow: 'hidden',
    marginHorizontal: -spacing.lg,
  },
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
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  searchPillFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
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

  activeFiltersScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: spacing.xs,
  },
  activeFiltersContent: {
    gap: 6,
    paddingRight: 2,
    paddingLeft: 4,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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

});

