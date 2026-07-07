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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TabParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { PlaceCard } from '../components/PlaceCard';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { FilterSheet } from '../components/FilterSheet';
import { colors, radius, shadow, spacing } from '../theme';
import { t } from '../i18n';
import { usePlaces } from '../hooks/usePlaces';
import { useSharedLocation, getCachedLocation } from '../context/LocationContext';
import { useFilters } from '../context/FiltersContext';
import { countActiveFilters, GeoPoint, PlaceType } from '../types';
import { distanceKm } from '../utils/geo';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ListRoute = RouteProp<TabParamList, 'List'>;

type LocationMode = 'current' | 'other';

const CATEGORY_TABS: Array<{ key: PlaceType | null; label: string; icon: string }> = [
  { key: null, label: 'הכל', icon: 'apps-outline' },
  { key: 'restaurant', label: 'מסעדות', icon: 'restaurant-outline' },
  { key: 'synagogue', label: 'בתי כנסת', icon: 'business-outline' },
  { key: 'mikveh', label: 'מקוואות', icon: 'water-outline' },
  { key: 'chabad_house', label: 'בתי חב"ד', icon: 'home-outline' },
  { key: 'tzaddik_grave', label: 'קברי צדיקים', icon: 'flower-outline' },
];

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
  const navigation = useNavigation<Nav>();
  const route = useRoute<ListRoute>();
  const { filters, setFilter } = useFilters();
  const { places, loading, error, reload } = usePlaces(filters);
  const { location: ctxLocation, status: locationStatus, request: requestLocation } = useSharedLocation();
  const ctxOrCachedLocation = ctxLocation ?? getCachedLocation();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Location mode: use current GPS or a custom geocoded address
  const [locationMode, setLocationMode] = useState<LocationMode>('current');
  const [customAddress, setCustomAddress] = useState('');
  const [customLocation, setCustomLocation] = useState<GeoPoint | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const addressInputRef = useRef<TextInput>(null);

  const location = locationMode === 'current' ? ctxOrCachedLocation : customLocation;
  const sortByDistance = !!location;

  // Local search input — debounced
  const [inputText, setInputText] = useState(filters.query ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<TextInput>(null);

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

  const sorted = useMemo(() => {
    const list = [...places];
    if (sortByDistance && location) {
      list.sort(
        (a, b) => distanceKm(location, a.location) - distanceKm(location, b.location),
      );
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    }
    return list;
  }, [places, sortByDistance, location]);

  const screenTitle =
    filters.placeType === 'synagogue' ? t.home.synagogues
    : filters.placeType === 'restaurant' ? t.home.restaurants
    : filters.placeType === 'mikveh' ? t.home.mikvahs
    : filters.placeType === 'chabad_house' ? t.home.chabadHouses
    : filters.placeType === 'tzaddik_grave' ? t.home.tzadikGraves
    : t.list.title;

  return (
    <Screen padded>
      <View style={styles.titleRow}>
        {filters.placeType ? (
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              setFilter('placeType', null);
              navigation.navigate('Tabs', { screen: 'Home' });
            }}
            hitSlop={12}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            <Text style={styles.backText}>בית</Text>
          </Pressable>
        ) : <View />}
        <Text style={styles.title}>{screenTitle}</Text>
      </View>

      {/* Location mode selector — above search */}
      <View style={styles.locationModeRow}>
        <Pressable
          style={[styles.modePill, locationMode === 'current' && styles.modePillActive]}
          onPress={switchToCurrentMode}
        >
          <Ionicons
            name="navigate"
            size={13}
            color={locationMode === 'current' ? '#fff' : colors.textMuted}
          />
          <Text style={[styles.modePillText, locationMode === 'current' && styles.modePillTextActive]}>
            סביבי
          </Text>
        </Pressable>

        <Pressable
          style={[styles.modePill, locationMode === 'other' && styles.modePillActive]}
          onPress={switchToOtherMode}
        >
          <Ionicons
            name="search"
            size={13}
            color={locationMode === 'other' ? '#fff' : colors.textMuted}
          />
          <Text style={[styles.modePillText, locationMode === 'other' && styles.modePillTextActive]}>
            סביב מיקום אחר
          </Text>
        </Pressable>
      </View>

      {/* Address input when in "other location" mode */}
      {locationMode === 'other' && (
        <View style={styles.addressRow}>
          <Pressable
            style={[styles.geocodeBtn, geocoding && { opacity: 0.6 }]}
            onPress={handleGeocode}
            disabled={geocoding}
          >
            {geocoding
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="arrow-back" size={18} color="#fff" />}
          </Pressable>
          <TextInput
            ref={addressInputRef}
            style={styles.addressInput}
            placeholder="עיר, רחוב, או מקום..."
            placeholderTextColor={colors.textMuted}
            value={customAddress}
            onChangeText={(v) => { setCustomAddress(v); setGeocodeError(''); setCustomLocation(null); }}
            textAlign="right"
            returnKeyType="search"
            onSubmitEditing={handleGeocode}
          />
          {customLocation && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          )}
        </View>
      )}
      {geocodeError ? (
        <Text style={styles.geocodeError}>{geocodeError}</Text>
      ) : null}

      {/* Search pill */}
      <View style={styles.searchPill}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t.list.searchPlaceholder}
          placeholderTextColor={colors.textMuted}
          ref={searchRef}
          value={inputText}
          onChangeText={setInputText}
          textAlign="right"
          returnKeyType="search"
        />
        {inputText.length > 0 && (
          <Pressable onPress={() => { setInputText(''); setFilter('query', ''); }} hitSlop={8}>
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

      {/* Category tabs */}
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
              onPress={() => setFilter('placeType', tab.key)}
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

      {/* Location banner — only if no location at all */}
      {locationMode === 'current' && (locationStatus === 'denied' || locationStatus === 'idle') && (
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

      {/* Result count + sort indicator */}
      <View style={styles.metaRow}>
        <Text style={styles.resultCount}>{t.list.resultsCount(places.length)}</Text>
        <View style={styles.sortToggle}>
          <Ionicons
            name={sortByDistance ? 'navigate' : 'text'}
            size={14}
            color={colors.primary}
          />
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

      <FilterSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
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

  // Address input row
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  addressInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  geocodeBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
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
});
