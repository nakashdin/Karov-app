import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { alpha, makeStyles, radius, shadow, spacing, useTheme } from '../../theme';
import { JewishContentItem } from '../../data/jewish-content/types';
import { TOPIC_LABELS } from '../../data/jewish-content/types';
import { getTopicStyle, getTopicLabel } from './topics';
import { ContentSource } from './ContentSource';

interface Props {
  item: JewishContentItem;
  onPress: () => void;
  isRead?: boolean;
}

export function KarovContentCard({ item, onPress, isRead = false }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const { fg: color, tint: bg } = getTopicStyle(item.topics, theme);
  const topicLabel = getTopicLabel(item.topics);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: bg },
        isRead && styles.cardRead,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {/* Topic + reading time + read badge */}
      <View style={styles.meta}>
        {isRead ? (
          <View style={styles.readBadge}>
            <Ionicons name="checkmark-circle" size={13} color={theme.success} />
            <Text style={styles.readBadgeText}>קראת</Text>
          </View>
        ) : (
          <Text style={styles.readTime}>
            {item.readingTimeMinutes ? `${item.readingTimeMinutes} דקות` : ''}
          </Text>
        )}
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
          <View key={t} style={[styles.tag, { backgroundColor: alpha(color, 0.09) }]}>
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

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 8,
    ...shadow.card,
  },
  pressed: {
    opacity: 0.86,
  },
  cardRead: {
    opacity: 0.72,
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  readBadgeText: {
    fontSize: 10,
    color: t.success,
    fontWeight: '600',
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
    color: t.textFaint,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: t.text,
    textAlign: 'right',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  summary: {
    fontSize: 13,
    color: t.textMuted,
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
}));
