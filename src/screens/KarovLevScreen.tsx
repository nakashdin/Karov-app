import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { alpha, makeStyles, radius, spacing, useTheme } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { PLACEHOLDER_CONTENT } from '../data/jewish-content/placeholder';
import { JewishContentItem } from '../data/jewish-content/types';
import {
  CATEGORY_GROUPS,
  CategoryGroupMeta,
  getPrimaryCategory,
} from '../data/jewish-content/category-groups';
import { MIDDAH_LABELS } from '../data/jewish-content/middot';
import { useCategoryPreferences } from '../hooks/useCategoryPreferences';
import { useDailyReads } from '../hooks/useDailyReads';
import { useSelectedMiddot } from '../hooks/useSelectedMiddot';
import { useMiddahProgress } from '../hooks/useMiddahProgress';
import { SelectedCategoriesRow } from '../components/karov-lev/SelectedCategoriesRow';
import { KarovContentCard } from '../components/karov-lev/KarovContentCard';
import { MiddahDailyCard } from '../components/karov-lev/MiddahDailyCard';
import { MiddahPickerModal } from '../components/karov-lev/MiddahPickerModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface CategorySection {
  group: CategoryGroupMeta;
  items: JewishContentItem[];
  // Only populated for mussar_middot — maps middahTopic → all weekly cards
  middahCardsByTopic: Record<string, JewishContentItem[]>;
}

function getSortedCards(cards: JewishContentItem[]): JewishContentItem[] {
  return [...cards].sort((a, b) => (a.weekCardIndex ?? 0) - (b.weekCardIndex ?? 0));
}

export function KarovLevScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { selected, hasDecided, isLoading, setSelected, markDecided } =
    useCategoryPreferences();
  const { isRead, toggleRead, load: loadReads } = useDailyReads();
  const { selected: selectedMiddot, toggleMiddah } = useSelectedMiddot();
  const { getCardIndex, advance } = useMiddahProgress();
  const [middahPickerVisible, setMiddahPickerVisible] = useState(false);

  // Redirect to onboarding on first visit
  useEffect(() => {
    if (!isLoading && !hasDecided) {
      navigation.replace('KarovLevOnboarding');
    }
  }, [isLoading, hasDecided, navigation]);

  // Reload read state every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadReads();
    }, [loadReads])
  );

  // Build grouped sections — separate middah cards from regular content
  const sections: CategorySection[] = useMemo(() => {
    if (isLoading || selected.length === 0) return [];

    const selectedMeta = CATEGORY_GROUPS.filter((g) => selected.includes(g.id));
    const regularBuckets = new Map<string, JewishContentItem[]>(
      selectedMeta.map((g) => [g.id, []])
    );
    const middahBuckets = new Map<string, Record<string, JewishContentItem[]>>(
      selectedMeta.map((g) => [g.id, {}])
    );

    for (const item of PLACEHOLDER_CONTENT) {
      const primary = getPrimaryCategory(item.topics, selected);
      if (!primary) continue;

      if (item.middahTopic) {
        const bucket = middahBuckets.get(primary)!;
        if (!bucket[item.middahTopic]) bucket[item.middahTopic] = [];
        bucket[item.middahTopic].push(item);
      } else {
        regularBuckets.get(primary)?.push(item);
      }
    }

    return selectedMeta.map((group) => ({
      group,
      items: regularBuckets.get(group.id) ?? [],
      middahCardsByTopic: middahBuckets.get(group.id) ?? {},
    }));
  }, [selected, isLoading]);

  function handleCardPress(id: string) {
    navigation.navigate('KarovLevContent', { id });
  }

  const showNoPrefs = hasDecided && selected.length === 0;
  const isMussarSelected = selected.includes('mussar_middot');

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
          <Ionicons name="chevron-forward" size={22} color={theme.text} />
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
            onEdit={() => navigation.navigate('KarovLevOnboarding', { isEditing: true })}
          />
        )}

        {/* No-preference hint */}
        {showNoPrefs && (
          <Pressable
            style={styles.noPrefsHint}
            onPress={() => navigation.navigate('KarovLevOnboarding', { isEditing: true })}
          >
            <Text style={styles.noPrefsText}>הגדר העדפות תוכן ←</Text>
          </Pressable>
        )}

        {/* Category sections */}
        {sections.map(({ group, items, middahCardsByTopic }) => {
          const isMussarSection = group.id === 'mussar_middot';

          // For mussar: pick card based on per-middah progress (not day-of-week)
          const middahCardEntries = isMussarSection
            ? selectedMiddot.flatMap((topic) => {
                const sorted = getSortedCards(middahCardsByTopic[topic] ?? []);
                if (sorted.length === 0) return [];
                const idx = getCardIndex(topic);
                return [{ card: sorted[idx], cardIndex: idx, totalCards: sorted.length }];
              })
            : [];

          // Read count: regular items + current middah cards
          const allSectionItems = isMussarSection
            ? [...items, ...middahCardEntries.map((e) => e.card)]
            : items;
          const readCount = allSectionItems.filter((i) => isRead(i.id)).length;

          return (
            <View key={group.id} style={styles.section}>
              {/* Section header */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionReadBadge}>
                  {readCount > 0 ? (
                    <>
                      <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                      <Text style={styles.sectionReadText}>{readCount} היום</Text>
                    </>
                  ) : (
                    <Text style={styles.sectionReadTextZero}>0 היום</Text>
                  )}
                </View>
                <View style={styles.sectionTitleRow}>
                  <Text style={[styles.sectionTitle, { color: theme.accent[group.accent].fg }]}>
                    {group.label}
                  </Text>
                  <Text style={styles.sectionEmoji}>{group.emoji}</Text>
                </View>
              </View>

              {/* ── Mussar: middah tracker ── */}
              {isMussarSection && (
                <View style={styles.middahTracker}>
                  {/* Selected middot chips */}
                  <View style={styles.middahChipsRow}>
                    {selectedMiddot.map((topic) => (
                      <Pressable
                        key={topic}
                        style={styles.middahChip}
                        onPress={() => toggleMiddah(topic)}
                        accessibilityLabel={`הסר ${MIDDAH_LABELS[topic] ?? topic}`}
                      >
                        <Text style={styles.middahChipText}>
                          {MIDDAH_LABELS[topic] ?? topic}
                        </Text>
                        <Ionicons name="close" size={11} color={theme.middot} />
                      </Pressable>
                    ))}

                    {/* Add middah button */}
                    <Pressable
                      style={styles.addMiddahBtn}
                      onPress={() => setMiddahPickerVisible(true)}
                    >
                      <Ionicons name="add" size={14} color={theme.textMuted} />
                      <Text style={styles.addMiddahText}>הוסף מידה</Text>
                    </Pressable>
                  </View>

                  {/* Empty state when no middot selected */}
                  {selectedMiddot.length === 0 && (
                    <Pressable
                      style={styles.middahEmptyHint}
                      onPress={() => setMiddahPickerVisible(true)}
                    >
                      <Text style={styles.middahEmptyEmoji}>🌱</Text>
                      <Text style={styles.middahEmptyTitle}>בחר מידה לשבוע</Text>
                      <Text style={styles.middahEmptyDesc}>
                        קבל כרטיסייה חדשה כל יום עם רעיון ועבודה מעשית
                      </Text>
                    </Pressable>
                  )}

                  {/* Current card for each selected middah, driven by progress */}
                  {middahCardEntries.map(({ card, cardIndex, totalCards }) => (
                    <MiddahDailyCard
                      key={card.id}
                      item={card}
                      isDone={isRead(card.id)}
                      cardIndex={cardIndex}
                      totalCards={totalCards}
                      onToggleDone={() => {
                        const wasDone = isRead(card.id);
                        toggleRead(card.id);
                        if (!wasDone) {
                          advance(card.middahTopic!, totalCards);
                        }
                      }}
                      onReadMore={() => handleCardPress(card.id)}
                    />
                  ))}
                </View>
              )}

              {/* Regular content cards — hidden in mussar when specific middot are selected */}
              {isMussarSection && selectedMiddot.length > 0 ? null : items.length === 0 ? (
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

      {isMussarSelected && (
        <MiddahPickerModal
          visible={middahPickerVisible}
          selected={selectedMiddot}
          onToggle={toggleMiddah}
          onClose={() => setMiddahPickerVisible(false)}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: t.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: t.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: t.text,
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
    borderColor: t.border,
    borderStyle: 'dashed',
  },
  noPrefsText: {
    fontSize: 13,
    color: t.textMuted,
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
    color: t.success,
    fontWeight: '600',
  },
  sectionReadTextZero: {
    fontSize: 11,
    color: t.textFaint,
    fontWeight: '500',
  },

  // Middah tracker
  middahTracker: {
    gap: spacing.md,
  },
  middahChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  middahChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: alpha(t.middot, 0.09),
    borderWidth: 1,
    borderColor: alpha(t.middot, 0.25),
  },
  middahChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: t.middot,
  },
  addMiddahBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: t.border,
    borderStyle: 'dashed',
  },
  addMiddahText: {
    fontSize: 12,
    fontWeight: '600',
    color: t.textMuted,
  },
  middahEmptyHint: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: alpha(t.middot, 0.19),
    borderStyle: 'dashed',
    backgroundColor: alpha(t.middot, 0.03),
  },
  middahEmptyEmoji: {
    fontSize: 28,
  },
  middahEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: t.middot,
    textAlign: 'center',
  },
  middahEmptyDesc: {
    fontSize: 12,
    color: t.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  emptySection: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 13,
    color: t.textFaint,
  },
}));
