import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { makeStyles, radius, shadow, spacing, useTheme } from '../theme';
import { ParashaData } from '../hooks/useParasha';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  parasha: ParashaData;
}

export function ParashaCard({ parasha }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<Nav>();
  const openDetail = () => navigation.navigate('ParashaDetail');

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={openDetail}
    >
      <Ionicons name="chevron-back" size={16} color={theme.border} />
      <View style={styles.textBlock}>
        <Text style={styles.label}>פרשת השבוע</Text>
        <Text style={styles.name}>{parasha.hebrewName}</Text>
        {parasha.hebrewDate ? (
          <Text style={styles.date}>{parasha.hebrewDate}</Text>
        ) : null}
      </View>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>📖</Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
    borderRightWidth: 3,
    borderRightColor: t.primary,
    ...shadow.card,
  },
  pressed: {
    opacity: 0.85,
  },
  iconBox: {
    width: 44,
    height: 44,
    backgroundColor: t.primaryLight,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  textBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: t.textFaint,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: t.text,
  },
  date: {
    fontSize: 12,
    color: t.textMuted,
    marginTop: 2,
  },
}));
