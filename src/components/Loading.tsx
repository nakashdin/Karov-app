import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';

/** Full-area loading indicator. */
export function Loading({ label }: { label?: string }) {
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.label}>{label ?? t.common.loading}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
});
