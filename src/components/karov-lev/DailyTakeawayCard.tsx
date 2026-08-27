import React from 'react';
import { Text, View } from 'react-native';
import { makeStyles, radius, spacing } from '../../theme';

interface Props {
  text: string;
  label?: string;
}

export function DailyTakeawayCard({ text, label = 'לקחת איתך היום' }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{label}</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.accent.blue.tint,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 8,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderRightColor: t.accent.blue.fg,
  },
  heading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: t.accent.blue.fg,
    textAlign: 'right',
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: t.text,
    textAlign: 'right',
    fontWeight: '500',
  },
}));
