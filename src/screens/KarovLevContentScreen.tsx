import React, { useMemo, useEffect } from 'react';
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
import { useDailyReads } from '../hooks/useDailyReads';
import { MIDDAH_LABELS } from '../data/jewish-content/middot';

type Route = RouteProp<RootStackParamList, 'KarovLevContent'>;

function resolveItem(id: string): JewishContentItem | undefined {
  return PLACEHOLDER_CONTENT.find(i => i.id === id);
}

export function KarovLevContentScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const item = useMemo(() => resolveItem(route.params.id), [route.params.id]);
  const { isRead, toggleRead, load } = useDailyReads();

  useEffect(() => { load(); }, []);

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
  const isMiddahCard = Boolean(item.middahTopic);
  const middahLabel = item.middahTopic ? (MIDDAH_LABELS[item.middahTopic] ?? item.middahTopic) : null;
  const MIDDAH_COLOR = '#5D8A6F';

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
        <View style={[styles.hero, { backgroundColor: isMiddahCard ? `${MIDDAH_COLOR}10` : bg }]}>
          {/* Topic / middah chip */}
          {isMiddahCard ? (
            <View style={[styles.topicChip, { backgroundColor: `${MIDDAH_COLOR}20` }]}>
              <Text style={[styles.topicChipText, { color: MIDDAH_COLOR }]}>
                מידה שבועית · {middahLabel}
              </Text>
            </View>
          ) : (
            <View style={[styles.topicChip, { backgroundColor: `${color}1A` }]}>
              <Text style={[styles.topicChipText, { color }]}>{topicLabel}</Text>
            </View>
          )}

          {/* Title */}
          <Text style={styles.title}>{item.title}</Text>

          {/* Middah: show originalText as source quote */}
          {isMiddahCard && item.originalText ? (
            <View style={[styles.quoteBlock, { borderRightColor: MIDDAH_COLOR }]}>
              <Text style={styles.quoteText}>״{item.originalText}״</Text>
              <Text style={[styles.quoteRef, { color: MIDDAH_COLOR }]}>
                — {item.source.reference}
              </Text>
            </View>
          ) : (
            <ContentSource source={item.source} size="medium" />
          )}
        </View>

        {/* הרעיון */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{isMiddahCard ? 'הרעיון' : 'הרעיון המרכזי'}</Text>
          <Text style={styles.summaryText}>{item.karovSummary}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* לחיים שלנו / להבין יותר */}
        {item.karovExplanation ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>
              {isMiddahCard ? 'לחיים שלנו' : 'להבין יותר'}
            </Text>
            <Text style={styles.bodyText}>{item.karovExplanation}</Text>
          </View>
        ) : null}

        {/* נקודה למחשבה (middah only) */}
        {isMiddahCard && item.reflectionQuestion ? (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>נקודה למחשבה</Text>
              <Text style={[styles.bodyText, styles.reflectionText]}>
                {item.reflectionQuestion}
              </Text>
            </View>
          </>
        ) : null}

        {/* העבודה שלי היום / לקחת איתך היום */}
        {item.dailyTakeaway ? (
          <DailyTakeawayCard
            text={item.dailyTakeaway}
            label={isMiddahCard ? 'העבודה שלי היום' : undefined}
          />
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
          <Pressable
            style={styles.actionBtn}
            onPress={() => toggleRead(item.id)}
            accessibilityRole="button"
            accessibilityLabel={isRead(item.id) ? 'סומן כנקרא' : 'סמן כנקרא'}
          >
            <Ionicons
              name={isRead(item.id) ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={20}
              color={isRead(item.id) ? '#4caf50' : colors.textMuted}
            />
            <Text style={[styles.actionLabel, isRead(item.id) && styles.actionLabelRead]}>
              {isRead(item.id) ? 'קראת ✓' : 'קראתי'}
            </Text>
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

  // Source quote (middah cards)
  quoteBlock: {
    borderRightWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(93,138,111,0.06)',
  },
  quoteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'right',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  quoteRef: {
    fontSize: 12,
    textAlign: 'right',
    fontWeight: '600',
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
  reflectionText: {
    fontStyle: 'italic',
    fontSize: 15,
    color: colors.textMuted,
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
  actionLabelRead: {
    color: '#4caf50',
    fontWeight: '700',
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
