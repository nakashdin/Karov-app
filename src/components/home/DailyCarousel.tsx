import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, shadow, spacing } from '../../theme';
import { ParashaData } from '../../hooks/useParasha';
import { useParashaSummary } from '../../hooks/useParashaSummary';
import { useJewishDayInfo } from '../../hooks/useJewishDayInfo';
import { useDailyContent, ContentType, TYPE_ICONS, TYPE_NAMES } from '../../hooks/useDailyContent';
import { RootStackParamList } from '../../navigation/types';
import { DESKTOP_BREAKPOINT } from '../Screen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  parasha: ParashaData | null;
}

const CONTENT_TYPES: ContentType[] = ['halacha', 'mussar', 'thought', 'blessing'];
const GAP = 10;
const CARD_WIDTH = 168;

export function DailyCarousel({ parasha }: Props) {
  const navigation = useNavigation<Nav>();
  const content = useDailyContent();
  const jewishDay = useJewishDayInfo();
  const parashaSummary = useParashaSummary(parasha?.topicSlug ?? null);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  const card1 = (
    <View style={[styles.card, isDesktop && styles.cardDesktop, { backgroundColor: '#F2EEFA' }]}>
      <View style={styles.typeTabs}>
        {CONTENT_TYPES.map((t) => (
          <Pressable
            key={t}
            style={[styles.typeTab, content.type === t && styles.typeTabActive]}
            onPress={() => content.setType(t)}
            hitSlop={4}
          >
            <Text style={styles.typeTabIcon}>{TYPE_ICONS[t]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.tag, { color: '#7B5EA7' }]}>קרוב ללב</Text>
      <Text style={styles.cardTitle} numberOfLines={isDesktop ? 3 : 2}>{content.item.title}</Text>
      <Text style={styles.cardBody} numberOfLines={isDesktop ? 6 : 4}>{content.item.body}</Text>
      {content.item.source ? (
        <Text style={[styles.source, { color: '#9B7EC8' }]}>{content.item.source}</Text>
      ) : null}
      <Text style={styles.contentTypePill}>{TYPE_NAMES[content.type]}</Text>
    </View>
  );

  const card2 = (
    <View style={[styles.card, isDesktop && styles.cardDesktop, { backgroundColor: '#FFF5EC' }]}>
      <View style={[styles.iconBadge, { backgroundColor: '#FFE4C4' }]}>
        <Text style={styles.badgeIcon}>📅</Text>
      </View>
      <Text style={[styles.tag, { color: colors.categoryRestaurant }]}>היום ביהדות</Text>
      <Text style={styles.cardTitle} numberOfLines={isDesktop ? 3 : 2}>
        {jewishDay ? jewishDay.title : 'טוען...'}
      </Text>
      <Text style={styles.cardBody} numberOfLines={isDesktop ? 6 : 4}>
        {jewishDay
          ? jewishDay.body
          : 'אירועים מיוחדים ותאריכים בלוח העברי'}
      </Text>
      <Text style={[styles.cta, { color: colors.categoryRestaurant }]}>לוח עברי ←</Text>
    </View>
  );

  const card3 = (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isDesktop && styles.cardDesktop,
        { backgroundColor: '#EBF2FD' },
        pressed && styles.pressed,
      ]}
      onPress={() => navigation.navigate('ParashaDetail')}
    >
      <View style={[styles.iconBadge, { backgroundColor: '#C8DDF8' }]}>
        <Text style={styles.badgeIcon}>📖</Text>
      </View>
      <Text style={[styles.tag, { color: colors.categorySynagogue }]}>פרשת השבוע</Text>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {parasha?.hebrewName ?? 'טוען...'}
      </Text>
      <Text style={styles.cardBody} numberOfLines={isDesktop ? 6 : 4}>
        {parashaSummary
          ? parashaSummary
          : parasha?.hebrewDate
          ? `שבת ${parasha.hebrewDate}`
          : 'לחץ לקרוא את פרשת השבוע'}
      </Text>
      <Text style={[styles.cta, { color: colors.categorySynagogue }]}>המשך לקרוא ←</Text>
    </Pressable>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopRow}>
        {card1}
        {card2}
        {card3}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      decelerationRate="fast"
      snapToInterval={CARD_WIDTH + GAP}
      snapToAlignment="start"
    >
      {card1}
      {card2}
      {card3}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    gap: GAP,
    paddingBottom: 4,
  },
  desktopRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.lg,
    padding: 14,
    gap: 5,
    ...shadow.card,
  },
  cardDesktop: {
    width: undefined,
    flex: 1,
    padding: 18,
  },
  pressed: {
    opacity: 0.88,
  },

  typeTabs: {
    flexDirection: 'row',
    gap: 4,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  typeTab: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  typeTabActive: {
    backgroundColor: '#E0D0F5',
  },
  typeTabIcon: {
    fontSize: 14,
  },
  contentTypePill: {
    fontSize: 9,
    color: '#7B5EA7',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 2,
    opacity: 0.7,
  },
  source: {
    fontSize: 9,
    textAlign: 'right',
    opacity: 0.6,
    marginTop: 1,
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
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  cardBody: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 17,
    flex: 1,
  },
  cta: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 2,
  },
});
