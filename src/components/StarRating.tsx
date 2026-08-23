import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeStyles, spacing, useTheme } from '../theme';

/** Compact star + numeric rating, e.g. ★ 4.5 */
export function StarRating({ value }: { value: number }) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Ionicons name="star" size={13} color={theme.star} />
      <Text style={styles.text}>{value.toFixed(1)}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: t.textMuted,
  },
}));
