import React from 'react';
import { Text, View } from 'react-native';
import { KosherCategory } from '../types';
import { categoryColorFor, categoryLabel } from '../utils/kosher';
import { makeStyles, radius, spacing, useTheme } from '../theme';

/** Small colored pill showing the food category (בשרי / חלבי / פרווה). */
export function KosherBadge({ category }: { category: KosherCategory }) {
  const theme = useTheme();
  const styles = useStyles();
  const accent = categoryColorFor(theme)[category];
  return (
    <View style={[styles.badge, { borderColor: accent }]}>
      <Text style={[styles.text, { color: accent }]}>{categoryLabel[category]}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    backgroundColor: t.surfaceMuted,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
}));
