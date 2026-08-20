import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';

interface Props {
  text: string;
  label?: string;
}

export function DailyTakeawayCard({ text, label = 'לקחת איתך היום' }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{label}</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#EBF2FD',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 8,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderRightColor: '#2A6CA8',
  },
  heading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#2A6CA8',
    textAlign: 'right',
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'right',
    fontWeight: '500',
  },
});
