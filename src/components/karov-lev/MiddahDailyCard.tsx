import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../../theme';
import { JewishContentItem } from '../../data/jewish-content/types';
import { MIDDAH_LABELS, HEB_DAY_NAMES } from '../../data/jewish-content/middot';

interface Props {
  item: JewishContentItem;
  isDone: boolean;
  onToggleDone: () => void;
  onReadMore: () => void;
  cardIndex?: number;  // 0-based position in the middah journey
  totalCards?: number;
}

const MIDDAH_COLOR = '#5D8A6F'; // earthy green — distinct from category colors

export function MiddahDailyCard({ item, isDone, onToggleDone, onReadMore, cardIndex, totalCards }: Props) {
  const middahLabel = item.middahTopic ? (MIDDAH_LABELS[item.middahTopic] ?? item.middahTopic) : '';
  const dayLabel = cardIndex != null && totalCards != null
    ? `יום ${cardIndex + 1} מתוך ${totalCards}`
    : HEB_DAY_NAMES[new Date().getDay()];

  return (
    <View style={styles.card}>
      {/* Card header: middah chip + day progress */}
      <View style={styles.cardHeader}>
        <Text style={styles.dayName}>{dayLabel}</Text>
        <View style={styles.middahChip}>
          <Text style={styles.middahChipText}>{middahLabel}</Text>
        </View>
      </View>

      {/* Source quote */}
      {item.originalText ? (
        <View style={styles.quoteBlock}>
          <Text style={styles.quoteText}>״{item.originalText}״</Text>
          <Text style={styles.quoteRef}>{item.source.reference}</Text>
        </View>
      ) : null}

      {/* Title + idea */}
      <View style={styles.ideaBlock}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.summary} numberOfLines={3}>{item.karovSummary}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Today's practice */}
      <View style={styles.practiceBlock}>
        <View style={styles.practiceHeader}>
          <Ionicons name="flag" size={13} color={MIDDAH_COLOR} />
          <Text style={styles.practiceLabel}>העבודה שלי היום</Text>
        </View>
        <Text style={styles.practiceText}>{item.dailyTakeaway}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.doneBtn, isDone && styles.doneBtnActive]}
          onPress={onToggleDone}
          accessibilityRole="button"
          accessibilityLabel={isDone ? 'בטל סימון עשיתי' : 'סמן כעשיתי'}
        >
          <Ionicons
            name={isDone ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={18}
            color={isDone ? '#fff' : MIDDAH_COLOR}
          />
          <Text style={[styles.doneBtnText, isDone && styles.doneBtnTextActive]}>
            {isDone ? 'עשיתי ✓' : 'עשיתי'}
          </Text>
        </Pressable>

        <Pressable style={styles.readMoreBtn} onPress={onReadMore}>
          <Text style={styles.readMoreText}>קרא עוד ←</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: 12,
    borderWidth: 1.5,
    borderColor: `${MIDDAH_COLOR}30`,
    ...shadow.card,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayName: {
    fontSize: 11,
    color: colors.textFaint,
    fontWeight: '500',
  },
  middahChip: {
    backgroundColor: `${MIDDAH_COLOR}18`,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  middahChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: MIDDAH_COLOR,
  },

  quoteBlock: {
    backgroundColor: `${MIDDAH_COLOR}0E`,
    borderRightWidth: 3,
    borderRightColor: MIDDAH_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    borderRadius: radius.sm,
  },
  quoteText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  quoteRef: {
    fontSize: 11,
    color: MIDDAH_COLOR,
    textAlign: 'right',
    fontWeight: '600',
  },

  ideaBlock: {
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  summary: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'right',
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  practiceBlock: {
    gap: 6,
  },
  practiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  practiceLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: MIDDAH_COLOR,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  practiceText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
    textAlign: 'right',
    fontWeight: '500',
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: MIDDAH_COLOR,
    backgroundColor: 'transparent',
  },
  doneBtnActive: {
    backgroundColor: MIDDAH_COLOR,
    borderColor: MIDDAH_COLOR,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: MIDDAH_COLOR,
  },
  doneBtnTextActive: {
    color: '#fff',
  },
  readMoreBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
