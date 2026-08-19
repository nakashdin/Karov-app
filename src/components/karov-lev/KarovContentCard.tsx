import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../../theme';
import { JewishContentItem } from '../../data/jewish-content/types';
import { TOPIC_LABELS } from '../../data/jewish-content/types';
import { getTopicStyle, getTopicLabel } from './topics';
import { ContentSource } from './ContentSource';

interface Props {
  item: JewishContentItem;
  onPress: () => void;
}

export function KarovContentCard({ item, onPress }: Props) {
  const { color, bg } = getTopicStyle(item.topics);
  const topicLabel = getTopicLabel(item.topics);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: bg }, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {/* Topic + reading time */}
      <View style={styles.meta}>
        <Text style={styles.readTime}>
          {item.readingTimeMinutes ? `${item.readingTimeMinutes} דקות` : ''}
        </Text>
        <Text style={[styles.topicLabel, { color }]}>{topicLabel}</Text>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

      {/* Summary */}
      <Text style={styles.summary} numberOfLines={3}>{item.karovSummary}</Text>

      {/* Source */}
      <ContentSource source={item.source} style={styles.sourceRow} />

      {/* Tags */}
      <View style={styles.tagsRow}>
        {item.topics.slice(0, 3).map(t => (
          <View key={t} style={[styles.tag, { backgroundColor: `${color}18` }]}>
            <Text style={[styles.tagText, { color }]}>
              #{TOPIC_LABELS[t]}
            </Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <Text style={[styles.cta, { color }]}>קרא עוד ←</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 8,
    ...shadow.card,
  },
  pressed: {
    opacity: 0.86,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'right',
  },
  readTime: {
    fontSize: 10,
    color: colors.textFaint,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  summary: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 20,
  },
  sourceRow: {
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cta: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 2,
  },
});
