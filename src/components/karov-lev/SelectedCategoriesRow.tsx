import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing } from '../../theme';
import { CategoryGroup } from '../../data/jewish-content/types';
import { CATEGORY_GROUPS } from '../../data/jewish-content/category-groups';

interface Props {
  selected: CategoryGroup[];
  onEdit: () => void;
}

export function SelectedCategoriesRow({ selected, onEdit }: Props) {
  const selectedMeta = CATEGORY_GROUPS.filter(g => selected.includes(g.id));

  return (
    <View style={styles.row}>
      {/* Edit button — visual left (RTL end) */}
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
        hitSlop={8}
        accessibilityLabel="ערוך העדפות"
      >
        <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
        <Text style={styles.editText}>עריכה</Text>
      </Pressable>

      {/* Category chips + label — visual right (RTL start) */}
      <View style={styles.right}>
        <Text style={styles.label}>התוכן שלי</Text>
        <View style={styles.chips}>
          {selectedMeta.map(cat => (
            <View key={cat.id} style={[styles.chip, { backgroundColor: cat.backgroundColor }]}>
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text style={[styles.chipText, { color: cat.color }]} numberOfLines={1}>
                {cat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  right: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'right',
    letterSpacing: 0.2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  chipEmoji: {
    fontSize: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  editText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
