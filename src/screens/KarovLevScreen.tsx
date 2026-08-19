import React, { useMemo, useState } from 'react';
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
import { groupIdsToTopics } from '../components/karov-lev/topics';
import { useSelectedTopics } from '../hooks/useSelectedTopics';
import { TopicSelector, SelectedTopicChips } from '../components/karov-lev/TopicSelector';
import { DailyFeedSection } from '../components/karov-lev/DailyFeedSection';
import { DiscoverySection } from '../components/karov-lev/DiscoverySection';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function KarovLevScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { selectedGroupIds, toggle, loaded } = useSelectedTopics();
  const [editing, setEditing] = useState(false);

  const hasTopics = selectedGroupIds.length > 0;

  // Build feed items from placeholder content
  const { feedItems, discoveryItems } = useMemo(() => {
    if (!loaded) return { feedItems: [], discoveryItems: [] };

    const selectedTopics = groupIdsToTopics(selectedGroupIds);

    let feed: JewishContentItem[];
    let discovery: JewishContentItem[];

    if (selectedTopics.length === 0) {
      // No preference — show all as feed, no discovery
      feed = PLACEHOLDER_CONTENT.slice(0, 5);
      discovery = [];
    } else {
      // Items that match selected topics → feed
      const matched = PLACEHOLDER_CONTENT.filter(item =>
        item.topics.some(t => selectedTopics.includes(t))
      );
      // Items that don't match → discovery
      const unmatched = PLACEHOLDER_CONTENT.filter(item =>
        !item.topics.some(t => selectedTopics.includes(t))
      );
      feed = matched.length > 0 ? matched : PLACEHOLDER_CONTENT.slice(0, 3);
      discovery = unmatched.slice(0, 2);
    }

    return { feedItems: feed, discoveryItems: discovery };
  }, [selectedGroupIds, loaded]);

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
        {/* Topic selection area */}
        {!hasTopics || editing ? (
          <View style={styles.topicSection}>
            <Text style={styles.sectionTitle}>מה תרצה לחזק היום?</Text>
            <Text style={styles.sectionSubtitle}>
              בחר נושאים שמעניינים אותך ונציג לך תוכן שמתאים לך
            </Text>
            <TopicSelector selectedIds={selectedGroupIds} onToggle={toggle} />
            {editing && (
              <Pressable
                style={styles.doneBtn}
                onPress={() => setEditing(false)}
              >
                <Text style={styles.doneBtnText}>סיימתי</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.myTopicsRow}>
            <Pressable onPress={() => setEditing(true)} style={styles.editBtn}>
              <Text style={styles.editBtnText}>עריכה</Text>
            </Pressable>
            <View style={styles.myTopicsLabels}>
              <SelectedTopicChips selectedIds={selectedGroupIds} />
              <Text style={styles.myTopicsTitle}>הנושאים שלי</Text>
            </View>
          </View>
        )}

        {/* Feed */}
        <DailyFeedSection items={feedItems} onPress={handleCardPress} />

        {/* Discovery */}
        <DiscoverySection items={discoveryItems} onPress={handleCardPress} />
      </ScrollView>
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

  // Topic section (first-time / editing)
  topicSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 20,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  doneBtnText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },

  // Compact "הנושאים שלי" row
  myTopicsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  myTopicsLabels: {
    flex: 1,
    gap: spacing.xs,
    alignItems: 'flex-end',
  },
  myTopicsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'right',
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  editBtnText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
