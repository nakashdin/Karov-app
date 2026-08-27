import React from 'react';
import { Pressable, Text } from 'react-native';
import { makeStyles, radius, spacing } from '../theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

/** Selectable pill used in filter rows. */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: t.surfaceMuted,
    borderWidth: 0,
  },
  chipSelected: {
    backgroundColor: t.primaryLight,
    borderWidth: 1.5,
    borderColor: t.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: t.textMuted,
  },
  labelSelected: {
    color: t.primary,
  },
}));
