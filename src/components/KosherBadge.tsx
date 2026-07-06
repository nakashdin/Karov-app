import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KosherCategory } from '../types';
import { categoryColor, categoryLabel } from '../utils/kosher';
import { colors, radius, spacing } from '../theme';

/** Small colored pill showing the food category (בשרי / חלבי / פרווה). */
export function KosherBadge({ category }: { category: KosherCategory }) {
  const accent = categoryColor[category];
  return (
    <View style={[styles.badge, { borderColor: accent }]}>
      <Text style={[styles.text, { color: accent }]}>{categoryLabel[category]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
