import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { PlaceCard } from '../components/PlaceCard';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { FilterSheet } from '../components/FilterSheet';
import { colors, radius, shadow, spacing } from '../theme';
import { t } from '../i18n';
import { usePlaces } from '../hooks/usePlaces';
import { useSharedLocation } from '../context/LocationContext';
import { useFilters } from '../context/FiltersContext';
import { countActiveFilters } from '../types';
import { distanceKm } from '../utils/geo';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ListScreen() {
  const navigation = useNavigation<Nav>();
  const { filters, setFilter } = useFilters();
  const { places, loading, error, reload } = usePlaces(filters);
  const { location } = useSharedLocation();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Local input text — decoupled from filters.query so we can debounce.
  const [inputText, setInputText] = useState(filters.query ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = inputText.trim();
      if (trimmed.length === 0) {
        setFilter('query', '');
      } else if (trimmed.length >= 2) {
        setFilter('query', trimmed);
      }
      // 1-char input: do nothing — wait for more characters
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputText]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try { await reload(); } finally { setIsRefreshing(false); }
  }, [reload]);

  const activeCount = countActiveFilters(filters);

  const sorted = useMemo(() => {
    const list = [...places];
    if (sortByDistance && location) {
      list.sort(
        (a, b) =>
          distanceKm(location, a.location) - distanceKm(location, b.location),
      );
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    }
    return list;
  }, [places, sortByDistance, location]);

  // Title reflects the active place-type shortcut (set from Home).
  const screenTitle =
    filters.placeType === 'synagogue'
      ? t.home.synagogues
      : filters.placeType === 'restaurant'
        ? t.home.restaurants
        : filters.placeType === 'mikveh'
          ? t.home.mikvahs
          : filters.placeType === 'chabad_house'
            ? t.home.chabadHouses
            : filters.placeType === 'tzaddik_grave'
              ? t.home.tzadikGraves
              : t.list.title;

  return (
    <Screen padded>
      {filters.placeType ? (
        <Pressable
          style={styles.backRow}
          onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          <Text style={styles.backText}>חזרה</Text>
        </Pressable>
      ) : null}

      <View style={styles.titleRow}>
        <Text style={styles.title}>{screenTitle}</Text>
      </View>

      {/* Search pill — functional TextInput + filter icon in one row */}
      <View style={styles.searchPill}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t.list.searchPlaceholder}
          placeholderTextColor={colors.textMuted}
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
        <Pressable
          style={styles.filterTrigger}
          onPress={() => setSheetOpen(true)}
          hitSlop={8}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeCount > 0 ? colors.primary : colors.textMuted}
          />
          {activeCount > 0 && <View style={styles.filterDot} />}
        </Pressable>
      </View>

      {/* Result count + sort toggle */}
      <View style={styles.metaRow}>
        <Text style={styles.resultCount}>
          {t.list.resultsCount(places.length)}
        </Text>
        <Pressable
          style={styles.sortToggle}
          onPress={() => setSortByDistance((v) => !v)}
        >
          <Ionicons
            name={sortByDistance ? 'navigate' : 'text'}
            size={14}
            color={colors.primary}
          />
          <Text style={styles.sortText}>
            {sortByDistance ? t.list.sortByDistance : t.list.sortByName}
          </Text>
        </Pressable>
      </View>

      {loading && !isRefreshing && places.length === 0 ? (
        <Loading />
      ) : error ? (
        <EmptyState
          title={t.common.error}
          hint={t.common.retry}
          icon="alert-circle-outline"
        />
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
              distanceKm={
                location ? distanceKm(location, item.location) : null
              }
              onPress={() =>
                navigation.navigate('PlaceDetail', { id: item.id })
              }
            />
          )}
        />
      )}

      <FilterSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },

  titleRow: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.text,
    textAlign: 'right',
  },

  // ── Search pill ─────────────────────────────────────────
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
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

  // ── Meta row ────────────────────────────────────────────
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
