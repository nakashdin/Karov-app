import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { JewishContentItem } from '../../data/jewish-content/types';
import { KarovContentCard } from './KarovContentCard';

interface Props {
  items: JewishContentItem[];
  onPress: (id: string) => void;
}

export function DiscoverySection({ items, onPress }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>תוכן שאולי לא חיפשת, אבל שווה לפגוש</Text>
        <Text style={styles.title}>גלה משהו חדש</Text>
      </View>

      {items.map(item => (
        <KarovContentCard
          key={item.id}
          item={item}
          onPress={() => onPress(item.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  header: {
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
});
