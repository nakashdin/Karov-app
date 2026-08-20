import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { PLACEHOLDER_CONTENT } from '../data/jewish-content/placeholder';
import { JewishContentItem } from '../data/jewish-content/types';
import { itemMatchesCategories } from '../data/jewish-content/category-groups';
import { useCategoryPreferences } from '../hooks/useCategoryPreferences';
import { CategoryPreferenceModal } from '../components/karov-lev/CategoryPreferenceModal';
import { SelectedCategoriesRow } from '../components/karov-lev/SelectedCategoriesRow';
import { DailyFeedSection } from '../components/karov-lev/DailyFeedSection';
import { DiscoverySection } from '../components/karov-lev/DiscoverySection';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function KarovLevScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { selected, hasDecided, isLoading, setSelected, markDecided } =
    useCategoryPreferences();
  const [modalVisible, setModalVisible] = useState(false);

  // Auto-open modal on first entry (before user has ever made a decision)
  useEffect(() => {
    if (!isLoading && !hasDecided) {
      setModalVisible(true);
    }
  }, [isLoading, hasDecided]);

  const handleSave = async (groups: typeof selected) => {
    await setSelected(groups);
    await markDecided();
    setModalVisible(false);
  };

  const handleSkip = async () => {
    await markDecided();
    setModalVisible(false);
  };

  // Build feed + discovery from placeholder content
  const { feedItems, discoveryItems } = useMemo(() => {
    if (isLoading) return { feedItems: [], discoveryItems: [] };

    if (selected.length === 0) {
      // No preferences yet — show all as feed
      return { feedItems: [...PLACEHOLDER_CONTENT], discoveryItems: [] };
    }

    const matched: JewishContentItem[] = [];
    const unmatched: JewishContentItem[] = [];

    for (const item of PLACEHOLDER_CONTENT) {
      if (itemMatchesCategories(item.topics, selected)) {
        matched.push(item);
      } else {
        unmatched.push(item);
      }
    }

    return {
      feedItems: matched.length > 0 ? matched : [...PLACEHOLDER_CONTENT],
      discoveryItems: unmatched.slice(0, 2),
    };
  }, [selected, isLoading]);

  function handleCardPress(id: string) {
    navigation.navigate('KarovLevContent', { id });
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>קרוב ללב</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={8}
          accessibilityLabel="חזור"
        >
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Preference row: compact chips for returning users */}
        {hasDecided && selected.length > 0 && (
          <SelectedCategoriesRow
            selected={selected}
            onEdit={() => setModalVisible(true)}
          />
        )}

        {/* No-preference state hint (decided but selected nothing) */}
        {hasDecided && selected.length === 0 && (
          <Pressable
            style={styles.noPrefsHint}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.noPrefsText}>הגדר העדפות תוכן ←</Text>
          </Pressable>
        )}

        {/* Feed */}
        <DailyFeedSection items={feedItems} onPress={handleCardPress} />

        {/* Discovery */}
        <DiscoverySection items={discoveryItems} onPress={handleCardPress} />
      </ScrollView>

      {/* Category preference modal */}
      <CategoryPreferenceModal
        visible={modalVisible}
        initialSelected={selected}
        onSave={handleSave}
        onSkip={handleSkip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  noPrefsHint: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  noPrefsText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
