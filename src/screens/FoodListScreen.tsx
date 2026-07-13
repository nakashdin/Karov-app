import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { PlaceCard } from '../components/PlaceCard';
import { Loading } from '../components/Loading';
import { colors, radius, shadow, spacing } from '../theme';
import { usePlaces } from '../hooks/usePlaces';
import { useSharedLocation } from '../context/LocationContext';
import { distanceKm } from '../utils/geo';
import { PlaceType } from '../types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FoodTab = 'all' | 'restaurant' | 'fast_food' | 'cafe' | 'coffee_cart';

const ALL_FOOD: PlaceType[] = ['restaurant', 'fast_food', 'cafe', 'coffee_cart'];

const TABS: Array<{ key: FoodTab; label: string; emoji: string }> = [
  { key: 'all',         label: 'הכל',       emoji: '🍽️' },
  { key: 'restaurant',  label: 'מסעדות',    emoji: '🍽️' },
  { key: 'fast_food',   label: 'מזון מהיר', emoji: '🍔' },
  { key: 'cafe',        label: 'בתי קפה',   emoji: '☕' },
  { key: 'coffee_cart', label: 'עגלות קפה', emoji: '🛒' },
];

export function FoodListScreen() {
  const navigation = useNavigation<Nav>();
  const { places, loading } = usePlaces();
  const { location } = useSharedLocation();
  const [activeTab, setActiveTab] = useState<FoodTab>('all');
  const listRef = useRef<FlatList>(null);

  const filtered = useMemo(() => {
    const types = activeTab === 'all' ? ALL_FOOD : [activeTab as PlaceType];
    const result = places.filter(p => types.includes(p.type));
    if (location) {
      return [...result].sort(
        (a, b) => distanceKm(location, a.location) - distanceKm(location, b.location),
      );
    }
    return result;
  }, [places, activeTab, location]);

  const handleTabPress = (key: FoodTab) => {
    setActiveTab(key);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  // Sticky tab bar rendered as FlatList header
  const TabBar = (
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
  );

  return (
    <Screen style={styles.screen}>
      {/* Header — always visible */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>🍽 אוכל כשר</Text>
        <Text style={styles.count}>{filtered.length}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <Loading />
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
          // Tab bar as sticky header (index 0 → stays at top while scrolling)
          ListHeaderComponent={TabBar}
          stickyHeaderIndices={[0]}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>אין מקומות בקטגוריה זו</Text>
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
  count: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    flexShrink: 0,
  },
  pressed: { opacity: 0.85 },

  // Tab bar — sticky header
  tabsScroll: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
