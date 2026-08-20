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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { PLACEHOLDER_CONTENT } from '../data/jewish-content/placeholder';
import { JewishContentItem } from '../data/jewish-content/types';
import {
  CATEGORY_GROUPS,
  CategoryGroupMeta,
  getPrimaryCategory,
} from '../data/jewish-content/category-groups';
import { useCategoryPreferences } from '../hooks/useCategoryPreferences';
import { useDailyReads } from '../hooks/useDailyReads';
import { CategoryPreferenceModal } from '../components/karov-lev/CategoryPreferenceModal';
import { SelectedCategoriesRow } from '../components/karov-lev/SelectedCategoriesRow';
import { KarovContentCard } from '../components/karov-lev/KarovContentCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface CategorySection {
  group: CategoryGroupMeta;
  items: JewishContentItem[];
}

export function KarovLevScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { selected, hasDecided, isLoading, setSelected, markDecided } =
    useCategoryPreferences();
  const { readIds, isRead, load: loadReads } = useDailyReads();
  const [modalVisible, setModalVisible] = useState(false);

  // Auto-open modal on first entry
  useEffect(() => {
    if (!isLoading && !hasDecided) {
      setModalVisible(true);
    }
  }, [isLoading, hasDecided]);

  // Reload read state every time screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadReads();
    }, [loadReads])
  );

  const handleSave = async (groups: typeof selected) => {
    await setSelected(groups);
    await markDecided();
    setModalVisible(false);
  };

  const handleSkip = async () => {
    await markDecided();
    setModalVisible(false);
  };

  // Build grouped sections: only items matching selected categories
  const sections: CategorySection[] = useMemo(() => {
    if (isLoading || selected.length === 0) return [];

    const selectedMeta = CATEGORY_GROUPS.filter((g) => selected.includes(g.id));
    const buckets = new Map<string, JewishContentItem[]>(
      selectedMeta.map((g) => [g.id, []])
    );

    for (const item of PLACEHOLDER_CONTENT) {
      const primary = getPrimaryCategory(item.topics, selected);
      if (primary) {
        buckets.get(primary)?.push(item);
      }
    }

    return selectedMeta.map((group) => ({
      group,
      items: buckets.get(group.id) ?? [],
    }));
  }, [selected, isLoading]);

  function handleCardPress(id: string) {
    navigation.navigate('KarovLevContent', { id });
  }

  const showNoPrefs = hasDecided && selected.length === 0;

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
        {/* Compact preference row for returning users */}
        {hasDecided && selected.length > 0 && (
          <SelectedCategoriesRow
            selected={selected}
            onEdit={() => setModalVisible(true)}
          />
        )}

        {/* No-preference hint */}
        {showNoPrefs && (
          <Pressable
            style={styles.noPrefsHint}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.noPrefsText}>הגדר העדפות תוכן ←</Text>
          </Pressable>
        )}

        {/* Category sections */}
        {sections.map(({ group, items }) => {
          const readCount = items.filter((i) => isRead(i.id)).length;

          return (
            <View key={group.id} style={styles.section}>
              {/* Section header */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionReadBadge}>
                  {readCount > 0 ? (
                    <>
                      <Ionicons name="checkmark-circle" size={14} color="#4caf50" />
                      <Text style={styles.sectionReadText}>
                        {readCount} קרא{readCount > 1 ? '' : ''} היום
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.sectionReadTextZero}>0 קראת היום</Text>
                  )}
                </View>
                <View style={styles.sectionTitleRow}>
                  <Text style={[styles.sectionTitle, { color: group.color }]}>
                    {group.label}
                  </Text>
                  <Text style={styles.sectionEmoji}>{group.emoji}</Text>
                </View>
              </View>

              {/* Items */}
              {items.length === 0 ? (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>אין תוכן זמין כרגע</Text>
                </View>
              ) : (
                items.map((item) => (
                  <KarovContentCard
                    key={item.id}
                    item={item}
                    onPress={() => handleCardPress(item.id)}
                    isRead={isRead(item.id)}
                  />
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

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

  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  sectionEmoji: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'right',
  },
  sectionReadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  sectionReadText: {
    fontSize: 11,
    color: '#4caf50',
    fontWeight: '600',
  },
  sectionReadTextZero: {
    fontSize: 11,
    color: colors.textFaint,
    fontWeight: '500',
  },

  emptySection: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 13,
    color: colors.textFaint,
  },
});
