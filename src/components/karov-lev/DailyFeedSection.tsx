import React from 'react';
import { Text, View } from 'react-native';
import { makeStyles, spacing } from '../../theme';
import { JewishContentItem } from '../../data/jewish-content/types';
import { KarovContentCard } from './KarovContentCard';

interface Props {
  items: JewishContentItem[];
  onPress: (id: string) => void;
}

export function DailyFeedSection({ items, onPress }: Props) {
  const styles = useStyles();
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>תוכן קצר שנבחר לפי מה שמעניין אותך</Text>
        <Text style={styles.title}>בשבילך היום</Text>
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

const useStyles = makeStyles((t) => ({
  section: {
    gap: spacing.md,
  },
  header: {
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: t.text,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: t.textMuted,
    textAlign: 'right',
  },
}));
