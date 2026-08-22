import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, shadow, spacing } from '../theme';
import { RATZON_DAYS, getRatzonDay } from '../data/selichot';
import { numToHebrew } from '../data/tehillim';
import { TEHILLIM_TEXT } from '../data/tehillimText';
import { useJewishDayInfo } from '../hooks/useJewishDayInfo';

const CHAPTER = 27;

/** The explanation, in the order it should be read. */
const BLOCKS: { heading?: string; text: string }[] = [
  {
    text: 'בראש חודש אלול הקדוש ברוך הוא מושיט לך שושנה — ״דּוֹדִי לִי וַאֲנִי לוֹ הָרֹעֶה בַּשּׁוֹשַׁנִּים״ (שיר השירים ב, טז).',
  },
  {
    text: 'לכל שושנה יש בדיוק שלושה עשר עלים, והשושנה היא שלוש עשרה מידות הרחמים. בחודש אלול נפתחים מעליך שלושה עשר צינורות של רחמים, והם המעניקים לאדם את היכולת להשתנות.',
  },
  {
    heading: 'מתי הצינורות נפתחים?',
    text: 'כשאומרים את מזמור ״לְדָוִד ה׳ אוֹרִי וְיִשְׁעִי״. המזמור מכיל את שם ה׳ שלוש עשרה פעמים, כמספר עלי השושנה. בכל פעם שאומרים את שם ה׳ — צינור של רחמים נפתח מעלינו.',
  },
  {
    heading: 'למה לקרוא ארבעים יום?',
    text: 'ארבעים יום מסמלים בריאה חדשה, התחדשות טוטאלית ולידה מחדש.',
  },
  {
    heading: 'מתי אומרים',
    text: 'פעמיים בכל יום — בבוקר ובערב — מראש חודש אלול ועד יום הכיפורים. יש הממשיכים באמירתו עד שמיני עצרת.',
  },
];

const SOURCES: string[] = [
  'זוהר, הקדמה, דף א ע״א — השושנה שיש בה שלושה עשר עלים, כנגד שלוש עשרה מידות הרחמים.',
  'מדרש תהילים כ״ז, ג — ״אוֹרִי בראש השנה, וְיִשְׁעִי ביום הכיפורים״.',
  'מטה אפרים תקפ״א, ו — המנהג לומר את המזמור בוקר וערב מראש חודש אלול.',
  'נוסח הפרק על פי המסורה, מתוך Sefaria.',
];

export function ElulSegulaScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const jewishDay = useJewishDayInfo();

  const ratzonDay = jewishDay ? getRatzonDay(jewishDay.hMonth, jewishDay.hDay) : null;
  const verses = TEHILLIM_TEXT.find((c) => c.num === CHAPTER)?.verses ?? [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>סגולת אלול</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={8}
          accessibilityLabel="חזור"
        >
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🌹</Text>
          <Text style={styles.heroTitle}>לְדָוִד ה׳ אוֹרִי וְיִשְׁעִי</Text>
          <Text style={styles.heroSub}>תהילים פרק כ״ז</Text>

          {ratzonDay !== null && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {`יום ${numToHebrew(ratzonDay)} מתוך שלושים ותשעה`}
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round((ratzonDay / RATZON_DAYS) * 100)}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.attribution}>מסביר האר״י הקדוש:</Text>
          {BLOCKS.map((b, i) => (
            <View key={i}>
              {b.heading ? <Text style={styles.blockHeading}>{b.heading}</Text> : null}
              <Text style={styles.blockText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>הפרק</Text>
        <View style={styles.card}>
          {verses.map((v, i) => (
            <View key={i} style={styles.verseRow}>
              <Text style={styles.verseNum}>{numToHebrew(i + 1)}</Text>
              <Text style={styles.verseText}>{v}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>מקורות</Text>
        <View style={styles.sourcesCard}>
          {SOURCES.map((line, i) => (
            <Text key={i} style={styles.sourceLine}>
              {line}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerSpacer: {
    width: 30,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  backBtn: {
    width: 30,
    alignItems: 'flex-end',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  hero: {
    backgroundColor: '#E9F3ED',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  heroEmoji: {
    fontSize: 30,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.primaryDark,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 13,
    color: colors.textMuted,
  },
  counter: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    gap: 6,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CFE5D8',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  attribution: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'right',
    marginBottom: -6,
  },
  blockHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    textAlign: 'right',
    marginBottom: 4,
  },
  blockText: {
    fontSize: 15,
    lineHeight: 26,
    color: colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.sm,
    marginBottom: -4,
  },

  verseRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
  },
  verseNum: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    minWidth: 26,
    textAlign: 'left',
    paddingTop: 3,
  },
  verseText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 32,
    color: colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  sourcesCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
  },
  sourceLine: {
    fontSize: 12,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
