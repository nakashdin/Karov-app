import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapView } from '../components/map/MapView';
import { PlaceBottomCard } from '../components/map/PlaceBottomCard';
import { FilterSheet } from '../components/FilterSheet';
import { colors, radius, shadow, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { usePlaces } from '../hooks/usePlaces';
import { useSharedLocation } from '../context/LocationContext';
import { useFilters } from '../context/FiltersContext';
import { countActiveFilters, Place } from '../types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function MapScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation<Nav>();
  const { filters } = useFilters();
  const { places } = usePlaces(filters);
  const { location, request, status } = useSharedLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Place | null>(null);

  // Ask for location once when the map opens; if denied we stay on Israel.
  useEffect(() => {
    if (status === 'idle') void request();
  }, [status, request]);

  const activeCount = countActiveFilters(filters);

  // Title reflects the active place-type shortcut (set from Home).
  const screenTitle =
    filters.placeType === 'synagogue'     ? t.listCategories.synagogue
    : filters.placeType === 'restaurant'  ? t.listCategories.restaurant
    : filters.placeType === 'mikveh'      ? t.listCategories.mikveh
    : filters.placeType === 'chabad_house'   ? t.listCategories.chabad_house
    : filters.placeType === 'tzaddik_grave'  ? t.listCategories.tzaddik_grave
    : t.map.title;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.mapWrap}>
        <MapView
          places={places}
          userLocation={location}
          onSelectPlace={(place) => setSelected(place)}
        />

        {/* Floating header — overlays the map */}
        <View style={styles.header}>
          <Text style={styles.title}>{screenTitle}</Text>
          <Pressable style={styles.headerBtn} onPress={() => setSheetOpen(true)}>
            <Ionicons
              name="options-outline"
              size={20}
              color={activeCount > 0 ? colors.primary : colors.textMuted}
            />
            {activeCount > 0 && <View style={styles.filterDot} />}
          </Pressable>
        </View>

        {/* Floating recenter button */}
        <Pressable
          style={styles.recenter}
          onPress={request}
          disabled={status === 'requesting'}
        >
          <Ionicons
            name="locate"
            size={22}
            color={location ? colors.primary : colors.text}
          />
        </Pressable>

        {selected && (
          <PlaceBottomCard
            place={selected}
            onClose={() => setSelected(null)}
            onOpenDetails={() => {
              const id = selected.id;
              setSelected(null);
              navigation.navigate('PlaceDetail', { id });
            }}
          />
        )}
      </View>

      <FilterSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapWrap: {
    flex: 1,
    overflow: 'hidden',
  },

  // ── Floating header ──────────────────────────────────────
  header: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    zIndex: 10,
    ...shadow.raised,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.text,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },

  // ── Recenter button ──────────────────────────────────────
  recenter: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...shadow.raised,
  },
});
