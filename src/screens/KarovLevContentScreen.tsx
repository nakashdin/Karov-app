import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, radius, shadow, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { PLACEHOLDER_CONTENT } from '../data/jewish-content/placeholder';
import { JewishContentItem, TOPIC_LABELS } from '../data/jewish-content/types';
import { getTopicStyle, getTopicLabel } from '../components/karov-lev/topics';
import { ContentSource } from '../components/karov-lev/ContentSource';
import { DailyTakeawayCard } from '../components/karov-lev/DailyTakeawayCard';
import { KarovContentCard } from '../components/karov-lev/KarovContentCard';

type Route = RouteProp<RootStackParamList, 'KarovLevContent'>;

function resolveItem(id: string): JewishContentItem | undefined {
  return PLACEHOLDER_CONTENT.find(i => i.id === id);
}

export function KarovLevContentScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const item = useMemo(() => resolveItem(route.params.id), [route.params.id]);

  const relatedItems = useMemo(() => {
    if (!item) return [];
    return PLACEHOLDER_CONTENT.filter(
      i => i.id !== item.id && i.topics.some(t => item.topics.includes(t))
    ).slice(0, 2);
  }, [item]);

  if (!item) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>לא נמצא תוכן</Text>
      </View>
    );
  }

  const { color, bg } = getTopicStyle(item.topics);
  const topicLabel = getTopicLabel(item.topics);

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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section */}
        <View style={[styles.hero, { backgroundColor: bg }]}>
          {/* Topic chip */}
          <View style={[styles.topicChip, { backgroundColor: `${color}1A` }]}>
            <Text style={[styles.topicChipText, { color }]}>{topicLabel}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{item.title}</Text>

          {/* Source */}
          <ContentSource source={item.source} size="medium" />
        </View>

        {/* הרעיון המרכזי */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>הרעיון המרכזי</Text>
          <Text style={styles.summaryText}>{item.karovSummary}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* להבין יותר */}
        {item.karovExplanation ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>להבין יותר</Text>
            <Text style={styles.bodyText}>{item.karovExplanation}</Text>
          </View>
        ) : null}

        {/* לקחת איתך היום */}
        {item.dailyTakeaway ? (
          <DailyTakeawayCard text={item.dailyTakeaway} />
        ) : null}

        {/* Topic tags */}
        <View style={styles.tagsRow}>
          {item.topics.map(t => (
            <View key={t} style={[styles.tag, { backgroundColor: `${color}18` }]}>
              <Text style={[styles.tagText, { color }]}>#{TOPIC_LABELS[t]}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn}>
            <Ionicons name="bookmark-outline" size={20} color={colors.textMuted} />
            <Text style={styles.actionLabel}>שמור</Text>
          </Pressable>
          <Pressable style={styles.actionBtn}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.textMuted} />
            <Text style={styles.actionLabel}>קראתי</Text>
          </Pressable>
          <Pressable style={styles.actionBtn}>
            <Ionicons name="share-outline" size={20} color={colors.textMuted} />
            <Text style={styles.actionLabel}>שתף</Text>
          </Pressable>
        </View>

        {/* עוד בנושא */}
        {relatedItems.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>עוד בנושא {topicLabel}</Text>
            {relatedItems.map(rel => (
              <KarovContentCard
                key={rel.id}
                item={rel}
                onPress={() => {
                  // Replace current screen rather than stacking
                  navigation.setParams?.({ id: rel.id } as never);
                }}
              />
            ))}
          </View>
        )}
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

  errorText: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 60,
  },

  // Hero
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  topicChip: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  topicChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'right',
    letterSpacing: -0.5,
    lineHeight: 36,
  },

  // Sections
  section: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textAlign: 'right',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 17,
    lineHeight: 28,
    color: colors.text,
    textAlign: 'right',
    fontWeight: '600',
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 27,
    color: colors.text,
    textAlign: 'right',
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: -spacing.sm,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.sm,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: colors.border,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Related
  relatedSection: {
    gap: spacing.md,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    letterSpacing: -0.2,
  },
});
