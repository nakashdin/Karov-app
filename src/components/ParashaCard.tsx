import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, shadow, spacing } from '../theme';
import { ParashaData } from '../hooks/useParasha';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  parasha: ParashaData;
}

export function ParashaCard({ parasha }: Props) {
  const navigation = useNavigation<Nav>();
  const openDetail = () => navigation.navigate('ParashaDetail');

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={openDetail}
    >
      <Ionicons name="chevron-back" size={16} color={colors.border} />
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

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
    borderRightWidth: 3,
    borderRightColor: colors.primary,
    ...shadow.card,
  },
  pressed: {
    opacity: 0.85,
  },
  iconBox: {
    width: 44,
    height: 44,
    backgroundColor: colors.primaryLight,
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
    color: colors.textFaint,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.text,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
