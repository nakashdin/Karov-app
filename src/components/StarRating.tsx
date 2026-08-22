import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing } from '../theme';

/** Compact star + numeric rating, e.g. ★ 4.5 */
export function StarRating({ value }: { value: number }) {
  return (
    <View style={styles.row}>
      <Ionicons name="star" size={13} color={colors.star} />
      <Text style={styles.text}>{value.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
