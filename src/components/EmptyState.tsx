import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeStyles, spacing, useTheme } from '../theme';

interface EmptyStateProps {
  title: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Centered placeholder for empty/no-results states. */
export function EmptyState({
  title,
  hint,
  icon = 'search-outline',
}: EmptyStateProps) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={32} color={theme.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: t.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: t.text,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    color: t.textMuted,
    textAlign: 'center',
  },
}));
