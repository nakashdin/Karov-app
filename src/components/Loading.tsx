import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { makeStyles, spacing, useTheme } from '../theme';
import { useLanguage } from '../context/LanguageContext';

/** Full-area loading indicator. */
export function Loading({ label }: { label?: string }) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={styles.label}>{label ?? t.common.loading}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: t.textMuted,
  },
}));
