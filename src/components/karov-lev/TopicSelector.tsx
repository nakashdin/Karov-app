import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { makeStyles, radius, spacing, useTheme } from '../../theme';
import { UI_TOPIC_GROUPS } from './topics';

interface Props {
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function TopicSelector({ selectedIds, onToggle }: Props) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.wrap}>
      {UI_TOPIC_GROUPS.map(group => {
        const selected = selectedIds.includes(group.id);
        const accent = theme.accent[group.accent];
        return (
          <Pressable
            key={group.id}
            onPress={() => onToggle(group.id)}
            style={({ pressed }) => [
              styles.chip,
              selected ? { backgroundColor: accent.tint, borderColor: accent.fg } : styles.chipIdle,
              pressed && styles.pressed,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
          >
            <Text style={styles.emoji}>{group.emoji}</Text>
            <Text
              style={[
                styles.label,
                selected ? { color: accent.fg, fontWeight: '700' } : styles.labelIdle,
              ]}
            >
              {group.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Compact read-only chips shown in the "הנושאים שלי" row. */
export function SelectedTopicChips({
  selectedIds,
}: {
  selectedIds: string[];
}) {
  const styles = useStyles();
  const theme = useTheme();
  const groups = UI_TOPIC_GROUPS.filter(g => selectedIds.includes(g.id));
  if (groups.length === 0) return null;

  return (
    <View style={styles.compactRow}>
      {groups.map(g => (
        <View key={g.id} style={[styles.compactChip, { backgroundColor: theme.accent[g.accent].tint }]}>
          <Text style={[styles.compactLabel, { color: theme.accent[g.accent].fg }]}>{g.label}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  chipIdle: {
    backgroundColor: t.surface,
    borderColor: t.border,
  },
  pressed: {
    opacity: 0.78,
  },
  emoji: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
  labelIdle: {
    color: t.textMuted,
    fontWeight: '500',
  },
  compactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  compactChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
}));
