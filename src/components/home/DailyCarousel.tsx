import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, shadow, spacing } from '../../theme';
import { ParashaData } from '../../hooks/useParasha';
import { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  parasha: ParashaData | null;
}

export function DailyCarousel({ parasha }: Props) {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      decelerationRate="fast"
      snapToInterval={CARD_WIDTH + GAP}
      snapToAlignment="start"
    >
      {/* קרוב ללב */}
      <View style={[styles.card, { backgroundColor: '#F2EEFA' }]}>
        <View style={[styles.iconBadge, { backgroundColor: '#E0D0F5' }]}>
          <Text style={styles.badgeIcon}>💜</Text>
        </View>
        <Text style={[styles.tag, { color: '#7B5EA7' }]}>קרוב ללב</Text>
        <Text style={styles.cardTitle}>הלכה יומית</Text>
        <Text style={styles.cardBody} numberOfLines={3}>
          האם מותר לדבר בין הנטילה לברכת המוציא?
        </Text>
        <Text style={[styles.cta, { color: '#7B5EA7' }]}>קרא עוד ←</Text>
      </View>

      {/* היום ביהדות */}
      <View style={[styles.card, { backgroundColor: '#FFF5EC' }]}>
        <View style={[styles.iconBadge, { backgroundColor: '#FFE4C4' }]}>
          <Text style={styles.badgeIcon}>📅</Text>
        </View>
        <Text style={[styles.tag, { color: colors.categoryRestaurant }]}>היום ביהדות</Text>
        <Text style={styles.cardTitle}>
          {parasha?.hebrewDate ? parasha.hebrewDate.split(' ')[0] + ' ' + parasha.hebrewDate.split(' ')[1] : 'היום המיוחד'}
        </Text>
        <Text style={styles.cardBody} numberOfLines={3}>
          אירועים, חגים ומשמעויות ליום זה בלוח העברי
        </Text>
        <Text style={[styles.cta, { color: colors.categoryRestaurant }]}>קרא עוד ←</Text>
      </View>

      {/* פרשת השבוע */}
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: '#EBF2FD' },
          pressed && styles.pressed,
        ]}
        onPress={() => navigation.navigate('ParashaDetail')}
      >
        <View style={[styles.iconBadge, { backgroundColor: '#C8DDF8' }]}>
          <Text style={styles.badgeIcon}>📖</Text>
        </View>
        <Text style={[styles.tag, { color: colors.categorySynagogue }]}>פרשת השבוע</Text>
        <Text style={styles.cardTitle}>{parasha?.hebrewName ?? 'טוען...'}</Text>
        <Text style={styles.cardBody} numberOfLines={3}>
          {parasha?.hebrewDate ?? 'פרשת השבוע מחכה לך'}
        </Text>
        <Text style={[styles.cta, { color: colors.categorySynagogue }]}>המשך לקרוא ←</Text>
      </Pressable>
    </ScrollView>
  );
}

const GAP = 10;
const CARD_WIDTH = 158;

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    gap: GAP,
    paddingBottom: 4,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.lg,
    padding: 14,
    gap: 5,
    ...shadow.card,
  },
  pressed: {
    opacity: 0.88,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    alignSelf: 'flex-end',
  },
  badgeIcon: {
    fontSize: 18,
  },
  tag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'right',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  cardBody: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 18,
    flex: 1,
  },
  cta: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 4,
  },
});
