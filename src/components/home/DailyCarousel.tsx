import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeStyles, radius, shadow, spacing, useTheme } from '../../theme';
import { ParashaData } from '../../hooks/useParasha';
import { useParashaSummary } from '../../hooks/useParashaSummary';
import { useJewishDayInfo } from '../../hooks/useJewishDayInfo';
import { useHalachicDate } from '../../hooks/useHalachicDate';
import { RootStackParamList } from '../../navigation/types';
import { DESKTOP_BREAKPOINT } from '../Screen';
import { TEHILLIM_WEEKLY, numToHebrew } from '../../data/tehillim';
import { RATZON_DAYS, getRatzonDay } from '../../data/selichot';
import { useCategoryPreferences } from '../../hooks/useCategoryPreferences';
import { PLACEHOLDER_CONTENT } from '../../data/jewish-content/placeholder';
import { CATEGORY_GROUPS, getPrimaryCategory } from '../../data/jewish-content/category-groups';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  parasha: ParashaData | null;
}

const GAP = 10;
const CARD_WIDTH = 168;

export function DailyCarousel({ parasha }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const mStyles = useMStyles();
  const navigation = useNavigation<Nav>();
  const jewishDay = useJewishDayInfo();
  const parashaSummary = useParashaSummary(parasha?.topicSlug ?? null);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const [openModal, setOpenModal] = useState<null | 'jewish-day'>(null);
  const { selected: categoryPrefs, hasDecided, isLoading: prefsLoading } = useCategoryPreferences();

  // The daily division belongs to the Jewish day, so it turns over at sunset
  // together with the date beside it — on Thursday night it is already שישי.
  const { weekday: jewishWeekday } = useHalachicDate();
  const todayTehillim = TEHILLIM_WEEKLY[jewishWeekday];

  // Psalm 27 is said every day of the forty days of ratzon. The card appears
  // and disappears on its own — the window comes from the Hebrew date, so it
  // returns every year with nothing to switch on.
  const ratzonDay = jewishDay ? getRatzonDay(jewishDay.hMonth, jewishDay.hDay) : null;

  // Pick the first placeholder item that matches the user's selected categories
  const previewItem = useMemo(() => {
    if (!hasDecided || categoryPrefs.length === 0) return null;
    return PLACEHOLDER_CONTENT.find(
      (item) => getPrimaryCategory(item.topics, categoryPrefs) !== null
    ) ?? null;
  }, [categoryPrefs, hasDecided]);

  const previewCategory = useMemo(() => {
    if (!previewItem) return null;
    return CATEGORY_GROUPS.find((g) => categoryPrefs.includes(g.id)) ?? null;
  }, [previewItem, categoryPrefs]);

  // Teaser categories to display when no preferences set
  const teaserCategories = CATEGORY_GROUPS.slice(0, 4);

  const card1 = (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isDesktop && styles.cardDesktop,
        { backgroundColor: theme.accent.violet.tint },
        pressed && styles.pressed,
      ]}
      onPress={() => navigation.navigate('KarovLev')}
    >
      <Text style={[styles.tag, { color: theme.accent.violet.fg }]}>קרוב ללב</Text>

      {prefsLoading ? (
        <ActivityIndicator color={theme.accent.violet.fg} style={{ flex: 1, alignSelf: 'center', marginVertical: 8 }} />
      ) : previewItem && previewCategory ? (
        /* ── Preferences set: show content preview ── */
        <>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeEmoji}>{previewCategory.emoji}</Text>
            <Text style={[styles.categoryBadgeText, { color: theme.accent[previewCategory.accent].fg }]}>
              {previewCategory.label}
            </Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={isDesktop ? 3 : 2}>
            {previewItem.title}
          </Text>
          <Text style={styles.cardBody} numberOfLines={isDesktop ? 5 : 3}>
            {previewItem.karovSummary}
          </Text>
          <Text style={[styles.cta, { color: theme.accent.violet.fg }]}>קרא עוד ←</Text>
        </>
      ) : (
        /* ── No preferences: teaser ── */
        <>
          <Text style={styles.cardTitle} numberOfLines={2}>
            חיזוק יומי בשבילך
          </Text>
          <Text style={styles.cardBody} numberOfLines={isDesktop ? 4 : 3}>
            בחר מה מעניין אותך ונביא לך תוכן שמחזק אותך כל יום
          </Text>
          <View style={styles.teaserChips}>
            {teaserCategories.map((g) => (
              <View key={g.id} style={[styles.teaserChip, { backgroundColor: theme.accent[g.accent].tint }]}>
                <Text style={styles.teaserChipText}>{g.emoji}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.cta, { color: theme.accent.violet.fg }]}>התחל כאן ←</Text>
        </>
      )}
    </Pressable>
  );

  const card2 = (
    <Pressable
      style={({ pressed }) => [styles.card, isDesktop && styles.cardDesktop, { backgroundColor: theme.accent.orange.tint }, pressed && styles.pressed]}
      onPress={() => setOpenModal('jewish-day')}
    >
      <View style={[styles.iconBadge, { backgroundColor: theme.accent.orange.tintStrong }]}>
        <Text style={styles.badgeIcon}>📅</Text>
      </View>
      <Text style={[styles.tag, { color: theme.categoryRestaurant }]}>היום ביהדות</Text>
      <Text style={styles.cardTitle} numberOfLines={isDesktop ? 3 : 2}>
        {jewishDay ? jewishDay.title : 'טוען...'}
      </Text>
      <Text style={styles.cardBody} numberOfLines={isDesktop ? 6 : 4}>
        {jewishDay
          ? jewishDay.body
          : 'אירועים מיוחדים ותאריכים בלוח העברי'}
      </Text>
      <Text style={[styles.cta, { color: theme.categoryRestaurant }]}>לוח עברי ←</Text>
    </Pressable>
  );

  const card3 = (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isDesktop && styles.cardDesktop,
        { backgroundColor: theme.accent.blue.tint },
        pressed && styles.pressed,
      ]}
      onPress={() => navigation.navigate('ParashaDetail')}
    >
      <View style={[styles.iconBadge, { backgroundColor: theme.accent.blue.tintStrong }]}>
        <Text style={styles.badgeIcon}>📖</Text>
      </View>
      <Text style={[styles.tag, { color: theme.categorySynagogue }]}>פרשת השבוע</Text>
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
      <Text style={[styles.cta, { color: theme.categorySynagogue }]}>המשך לקרוא ←</Text>
    </Pressable>
  );

  const card4 = (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isDesktop && styles.cardDesktop,
        { backgroundColor: theme.accent.indigo.tint },
        pressed && styles.pressed,
      ]}
      onPress={() => navigation.navigate('Tabs', { screen: 'Brachot' })}
    >
      <View style={[styles.iconBadge, { backgroundColor: theme.accent.indigo.tintStrong }]}>
        <Text style={styles.badgeIcon}>{todayTehillim?.emoji ?? '📜'}</Text>
      </View>
      <Text style={[styles.tag, { color: theme.accent.indigo.fg }]}>תהילים היום</Text>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {todayTehillim ? todayTehillim.longDay : 'ספר תהילים'}
      </Text>
      <Text style={styles.cardBody} numberOfLines={isDesktop ? 6 : 4}>
        {todayTehillim
          ? `פרקים ${numToHebrew(todayTehillim.from)}–${numToHebrew(todayTehillim.to)} • ${todayTehillim.to - todayTehillim.from + 1} פרקים להיום`
          : 'קרא את תהילים היום'}
      </Text>
      <Text style={[styles.cta, { color: theme.accent.indigo.fg }]}>לקריאה ←</Text>
    </Pressable>
  );

  const cardRatzon = ratzonDay === null ? null : (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isDesktop && styles.cardDesktop,
        { backgroundColor: theme.accent.sage.tint },
        pressed && styles.pressed,
      ]}
      onPress={() => navigation.navigate('ElulSegula')}
    >
      <View style={[styles.iconBadge, { backgroundColor: theme.accent.sage.tintStrong }]}>
        <Text style={styles.badgeIcon}>🌹</Text>
      </View>
      <Text style={[styles.tag, { color: theme.primary }]}>סגולת אלול</Text>
      <Text style={styles.cardTitle} numberOfLines={1}>לְדָוִד ה׳ אוֹרִי</Text>
      <Text style={styles.cardBody} numberOfLines={isDesktop ? 6 : 3}>
        {`יום ${numToHebrew(ratzonDay)} מתוך שלושים ותשעה • בוקר וערב`}
      </Text>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round((ratzonDay / RATZON_DAYS) * 100)}%` },
          ]}
        />
      </View>
      <Text style={[styles.cta, { color: theme.primary }]}>לסגולה ולפרק ←</Text>
    </Pressable>
  );

  const modal = (
    <Modal
      visible={openModal !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setOpenModal(null)}
    >
      <View style={mStyles.container}>
        {/* Modal header */}
        <View style={mStyles.header}>
          <Pressable onPress={() => setOpenModal(null)} style={mStyles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={theme.text} />
          </Pressable>
          <Text style={mStyles.headerTitle}>היום ביהדות</Text>
          <View style={mStyles.closeBtn} />
        </View>

        {openModal === 'jewish-day' && (
          <ScrollView contentContainerStyle={mStyles.content} showsVerticalScrollIndicator={false}>
            {jewishDay ? (
              <View style={[mStyles.heroCard, { backgroundColor: theme.accent.orange.tint }]}>
                <Text style={[mStyles.cardTag, { color: theme.categoryRestaurant }]}>היום ביהדות</Text>
                <Text style={mStyles.cardTitle}>{jewishDay.title}</Text>
                <Text style={mStyles.cardBody}>{jewishDay.body}</Text>
                {jewishDay.details?.map((block, i) => (
                  <View key={i}>
                    {block.heading ? (
                      <Text style={mStyles.detailHeading}>{block.heading}</Text>
                    ) : null}
                    <Text style={mStyles.detailPara}>{block.text}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  if (isDesktop) {
    return (
      <>
        <View style={styles.desktopRow}>
          {cardRatzon}
          {card1}
          {card2}
          {card3}
          {card4}
        </View>
        {modal}
      </>
    );
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + GAP}
        snapToAlignment="start"
      >
        {cardRatzon}
        {card1}
        {card2}
        {card3}
        {card4}
      </ScrollView>
      {modal}
    </>
  );
}

const useStyles = makeStyles((t) => ({
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

  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  categoryBadgeEmoji: {
    fontSize: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  teaserChips: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  teaserChip: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teaserChipText: {
    fontSize: 14,
  },

  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: t.accent.sage.tintStrong,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: t.primary,
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
    color: t.text,
    textAlign: 'right',
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  cardBody: {
    fontSize: 11,
    color: t.textMuted,
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
}));

const useMStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: t.border,
    backgroundColor: t.surface,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: t.text,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  typeTabs: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  typeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: t.surface,
    gap: 4,
    borderWidth: 1,
    borderColor: t.border,
  },
  typeTabActive: {
    backgroundColor: t.selectionTint,
    borderColor: t.selectionBorder,
  },
  typeTabIcon: {
    fontSize: 20,
  },
  typeTabLabel: {
    fontSize: 10,
    color: t.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
  typeTabLabelActive: {
    color: t.accent.violet.fg,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: 10,
    ...shadow.card,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: t.text,
    textAlign: 'right',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  cardBody: {
    fontSize: 16,
    color: t.text,
    textAlign: 'right',
    lineHeight: 26,
  },
  detailHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: t.text,
    textAlign: 'right',
    marginTop: 14,
    marginBottom: 4,
  },
  detailPara: {
    fontSize: 15,
    color: t.text,
    textAlign: 'right',
    lineHeight: 25,
    opacity: 0.85,
    marginTop: 2,
  },
  source: {
    fontSize: 12,
    textAlign: 'right',
    opacity: 0.7,
    fontWeight: '500',
  },
}));
