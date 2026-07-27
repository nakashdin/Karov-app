import React, { useMemo, useRef, useState } from 'react';
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
import { Loading } from '../components/Loading';
import { colors, radius, shadow, spacing } from '../theme';
import { usePlaces } from '../hooks/usePlaces';
import { useSharedLocation } from '../context/LocationContext';
import { distanceKm } from '../utils/geo';
import { KosherCategory, Place, PlaceType } from '../types';
import { RootStackParamList } from '../navigation/types';
import { searchPlaces } from '../data/search/searchEngine';
import { MapView } from '../components/map/MapView';
import { PlaceBottomCard } from '../components/map/PlaceBottomCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FoodRoute = RouteProp<RootStackParamList, 'FoodList'>;
type FoodTab = 'all' | KosherCategory;

const ALL_FOOD: PlaceType[] = ['restaurant', 'fast_food', 'cafe', 'coffee_cart'];

const TABS: Array<{ key: FoodTab; label: string; emoji: string }> = [
  { key: 'all',   label: 'הכל',   emoji: '🍽️' },
  { key: 'meat',  label: 'בשרי',  emoji: '🥩' },
  { key: 'dairy', label: 'חלבי',  emoji: '🧀' },
  { key: 'parve', label: 'פרווה', emoji: '🥗' },
];

export function FoodListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FoodRoute>();
  const radiusKm = route.params?.radiusKm ?? null;
  const { places, loading } = usePlaces();
  const { location } = useSharedLocation();
  const [activeTab, setActiveTab] = useState<FoodTab>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const listRef = useRef<FlatList>(null);

  // Search
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<TextInput>(null);

  const allFoodPlaces = useMemo(
    () => places.filter(p => ALL_FOOD.includes(p.type)),
    [places],
  );

  const suggestions = useMemo(() => {
    const q = inputText.trim();
    if (q.length < 1) return [];
    const lq = q.toLowerCase();
    const seen = new Set<string>();
    const names: string[] = [];
    const cities: string[] = [];
    for (const p of allFoodPlaces) {
      if (p.name.includes(q) || p.name.toLowerCase().includes(lq)) {
        if (!seen.has(p.name) && names.length < 5) {
          seen.add(p.name);
          names.push(p.name);
        }
      }
      const city = p.address?.split(',').slice(-1)[0]?.trim();
      if (city && (city.includes(q) || city.toLowerCase().includes(lq))) {
        if (!seen.has(city) && cities.length < 3) {
          seen.add(city);
          cities.push(city);
        }
      }
    }
    return [...names, ...cities].slice(0, 6);
  }, [inputText, allFoodPlaces]);

  const filtered = useMemo(() => {
    let list = allFoodPlaces;
    if (radiusKm && location) {
      list = list.filter(p => distanceKm(location, p.location) <= radiusKm);
    }
    if (activeTab !== 'all') {
      list = list.filter(p => p.category === activeTab);
    }
    const q = searchQuery.trim();
    if (q.length >= 2) {
      const matchedIds = searchPlaces(q);
      if (matchedIds !== null) {
        const idSet = new Set(matchedIds);
        list = list.filter(p => idSet.has(p.id));
      } else {
        // Index not ready yet — fall back to name-only match
        const lq = q.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(lq));
      }
    }
    if (location) {
      return [...list].sort(
        (a, b) => distanceKm(location, a.location) - distanceKm(location, b.location),
      );
    }
    return list;
  }, [allFoodPlaces, activeTab, location, radiusKm, searchQuery]);

  const handleTabPress = (key: FoodTab) => {
    setActiveTab(key);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const handleTextChange = (v: string) => {
    setInputText(v);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(v), 200);
  };

  const handleSuggestionPress = (s: string) => {
    setInputText(s);
    setSearchQuery(s);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setInputText('');
    setSearchQuery('');
    setShowSuggestions(false);
  };

  return (
    <Screen style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>🍽 אוכל כשר</Text>
        <View style={styles.countBlock}>
          <Text style={styles.count}>{filtered.length}</Text>
          {radiusKm && <Text style={styles.radiusBadge}>{radiusKm} ק"מ</Text>}
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
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchPill}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            placeholder="חיפוש לפי שם, רחוב או עיר..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={handleTextChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            textAlign="right"
            returnKeyType="search"
          />
          {inputText.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionBox}>
            {suggestions.map(s => (
              <Pressable
                key={s}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(s)}
              >
                <Ionicons name="search-outline" size={13} color={colors.textMuted} />
                <Text style={styles.suggestionText} numberOfLines={1}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => handleTabPress(tab.key)}
            >
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingBox}>
          <Loading />
        </View>
      ) : viewMode === 'map' ? (
        <View style={styles.mapWrap}>
          <MapView
            places={filtered}
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
          ref={listRef}
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PlaceCard
              place={item}
              distanceKm={location ? distanceKm(location, item.location) : null}
              onPress={() => navigation.navigate('PlaceDetail', { id: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {searchQuery.trim().length >= 2
                ? 'לא נמצאו תוצאות לחיפוש'
                : 'אין מקומות בקטגוריה זו'}
            </Text>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...shadow.card,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.text,
    textAlign: 'right',
  },
  countBlock: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  count: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  radiusBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pressed: { opacity: 0.85 },

  // Search
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    zIndex: 10,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
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
  suggestionBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    overflow: 'hidden',
    ...shadow.card,
    zIndex: 10,
    elevation: 5,
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

  // Tabs
  tabsScroll: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsContent: {
    paddingHorizontal: spacing.lg,
    gap: 6,
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabEmoji: { fontSize: 14 },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  viewToggle: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 40,
  },
});
