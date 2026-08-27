import React, { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, Text, View, LayoutAnimation, UIManager } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { makeStyles, radius, shadow, spacing, useTheme } from '../theme';
import { useParasha } from '../hooks/useParasha';
import { getParashaContent } from '../data/parashaContent';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

async function copyToClipboard(text: string) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

export function ParashaDetailScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const navigation = useNavigation();
  const { parasha } = useParasha();
  const content = getParashaContent(parasha?.topicSlug);
  const [copied, setCopied] = useState(false);
  const [showCommentary, setShowCommentary] = useState(false);

  const toggleCommentary = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCommentary(v => !v);
  };

  const shareText = content
    ? `פרשת ${content.hebrewName}\n\n${content.summary}\n\nלקריאה: ${parasha?.sefariaUrl ?? ''}`
    : `פרשת השבוע — ${parasha?.hebrewName ?? ''}`;

  const handleShare = async () => {
    try {
      await Share.share({ message: shareText, url: parasha?.sefariaUrl });
    } catch {}
  };

  const handleWhatsApp = () => {
    Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`);
  };

  const handleTelegram = () => {
    Linking.openURL(`https://t.me/share/url?url=${encodeURIComponent(parasha?.sefariaUrl ?? '')}&text=${encodeURIComponent(`פרשת ${content?.hebrewName ?? parasha?.hebrewName ?? ''}`)}`);
  };

  const handleFacebook = () => {
    Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(parasha?.sefariaUrl ?? '')}`);
  };

  const handleCopy = async () => {
    await copyToClipboard(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-forward" size={22} color={theme.primary} />
        </Pressable>
        <Text style={styles.headerLabel}>פרשת השבוע</Text>
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="share-outline" size={20} color={theme.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeIcon}>📖</Text>
          </View>
          <Text style={styles.heroTag}>פרשת השבוע</Text>
          <Text style={styles.parashaName}>{parasha?.hebrewName ?? ''}</Text>
          {parasha?.hebrewDate ? (
            <View style={styles.datePill}>
              <Text style={styles.hebrewDate}>שבת {parasha.hebrewDate}</Text>
            </View>
          ) : null}
        </View>

        {content ? (
          <>
            {/* Book info + read link */}
            {content.bookInfo ? (
              <View style={styles.bookInfoCard}>
                <Text style={styles.bookInfoText}>{content.bookInfo}</Text>
                {parasha?.sefariaUrl ? (
                  <Pressable
                    style={({ pressed }) => [styles.readBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => Linking.openURL(parasha.sefariaUrl)}
                  >
                    <Ionicons name="book-outline" size={16} color={theme.categorySynagogue} />
                    <Text style={styles.readBtnText}>קרא את הפרשה המלאה בספריא</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Overview */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>תוכן הפרשה</Text>
              <Text style={styles.summaryText}>{content.overview ?? content.summary}</Text>
            </View>

            {/* Key points */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>נושאים מרכזיים</Text>
              <View style={styles.keyPointsList}>
                {content.keyPoints.map((point, i) => (
                  <View key={i} style={styles.keyPointItem}>
                    <View style={styles.keyPointRow}>
                      <Text style={styles.keyPointBullet}>◆</Text>
                      <Text style={styles.keyPointText}>{point}</Text>
                    </View>
                    {content.keyPointDetails?.[i] ? (
                      <Text style={styles.keyPointDetail}>{content.keyPointDetails[i]}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>

            {/* Commentary expandable */}
            {content.commentary && content.commentary.length > 0 ? (
              <View style={styles.commentaryContainer}>
                <Pressable
                  style={({ pressed }) => [styles.commentaryToggle, pressed && { opacity: 0.75 }]}
                  onPress={toggleCommentary}
                >
                  <Ionicons
                    name={showCommentary ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.categorySynagogue}
                  />
                  <Text style={styles.commentaryToggleText}>
                    {showCommentary ? 'סגור פירוש ולימוד' : 'פירוש ולימוד — מדרש, חסידות וחב"ד'}
                  </Text>
                </Pressable>

                {showCommentary ? (
                  <View style={styles.commentarySections}>
                    {content.commentary.map((section, i) => (
                      <View key={i} style={styles.commentarySection}>
                        <Text style={styles.commentaryTitle}>{section.title}</Text>
                        <Text style={styles.commentarySource}>{section.source}</Text>
                        <Text style={styles.commentaryText}>{section.text}</Text>
                      </View>
                    ))}
                    <Text style={styles.commentaryAttribution}>
                      הפירושים מבוססים על מדרשים ומקורות תורניים ראשוניים
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Quote */}
            <View style={styles.quoteCard}>
              <Text style={styles.quoteIcon}>❝</Text>
              <Text style={styles.quoteText}>{content.quote}</Text>
              <Text style={styles.quoteSource}>{content.source}</Text>
            </View>
          </>
        ) : parasha?.hebrewName ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>על הפרשה</Text>
            <Text style={styles.summaryText}>תוכן הפרשה יתעדכן בקרוב.</Text>
          </View>
        ) : null}

        {/* Read full parasha — fallback when no bookInfo */}
        {parasha?.sefariaUrl && !content?.bookInfo ? (
          <Pressable
            style={({ pressed }) => [styles.sefariaBtn, pressed && { opacity: 0.8 }]}
            onPress={() => Linking.openURL(parasha.sefariaUrl)}
          >
            <Ionicons name="book-outline" size={18} color={theme.surface} />
            <Text style={styles.sefariaBtnText}>קרא את הפרשה המלאה</Text>
          </Pressable>
        ) : null}

        {/* Share row */}
        <View style={styles.shareCard}>
          <Text style={styles.shareTitle}>שתף את הפרשה</Text>
          <View style={styles.shareRow}>
            <Pressable style={({ pressed }) => [styles.shareBtn, { backgroundColor: theme.brand.whatsapp }, pressed && styles.pressed]} onPress={handleWhatsApp}>
              <Text style={styles.shareBtnIcon}>💬</Text>
              <Text style={styles.shareBtnLabel}>וואטסאפ</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.shareBtn, { backgroundColor: theme.brand.telegram }, pressed && styles.pressed]} onPress={handleTelegram}>
              <Text style={styles.shareBtnIcon}>✈️</Text>
              <Text style={styles.shareBtnLabel}>טלגרם</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.shareBtn, { backgroundColor: theme.brand.facebook }, pressed && styles.pressed]} onPress={handleFacebook}>
              <Text style={styles.shareBtnIcon}>👥</Text>
              <Text style={styles.shareBtnLabel}>פייסבוק</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.shareBtn, { backgroundColor: copied ? theme.success : theme.textMuted }, pressed && styles.pressed]} onPress={handleCopy}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={theme.surface} />
              <Text style={styles.shareBtnLabel}>{copied ? 'הועתק!' : 'העתק'}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.attribution}>
          תוכן ממקורות מהימנים · לקריאת הטקסט המלא: Sefaria
        </Text>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
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
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: t.text,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: t.accent.blue.tint,
    borderRadius: radius.xl,
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: 6,
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: t.accent.blue.tintStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroBadgeIcon: { fontSize: 32 },
  heroTag: {
    fontSize: 11,
    fontWeight: '700',
    color: t.categorySynagogue,
    letterSpacing: 0.3,
  },
  parashaName: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
    color: t.text,
    textAlign: 'center',
  },
  datePill: {
    backgroundColor: t.accent.blue.tintStrong,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: 2,
  },
  hebrewDate: {
    fontSize: 13,
    color: t.categorySynagogue,
    fontWeight: '600',
  },

  bookInfoCard: {
    backgroundColor: t.accent.blue.tint,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: t.accent.blue.border,
  },
  bookInfoText: {
    fontSize: 13,
    lineHeight: 20,
    color: t.text,
    textAlign: 'right',
    fontWeight: '500',
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: t.categorySynagogue,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  readBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: t.categorySynagogue,
  },

  card: {
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: t.textMuted,
    textAlign: 'right',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 28,
    color: t.text,
    textAlign: 'right',
  },

  keyPointsList: { gap: 14 },
  keyPointItem: { gap: 6 },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  keyPointBullet: {
    fontSize: 8,
    color: t.categorySynagogue,
    marginTop: 6,
    flexShrink: 0,
  },
  keyPointText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: t.text,
    textAlign: 'right',
    fontWeight: '600',
  },
  keyPointDetail: {
    fontSize: 14,
    lineHeight: 22,
    color: t.textMuted,
    textAlign: 'right',
    paddingRight: 16,
  },

  quoteCard: {
    backgroundColor: t.accent.blue.tint,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: t.categorySynagogue,
  },
  quoteIcon: {
    fontSize: 28,
    color: t.categorySynagogue,
    opacity: 0.4,
    alignSelf: 'flex-end',
  },
  quoteText: {
    fontSize: 18,
    fontWeight: '700',
    color: t.text,
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  quoteSource: {
    fontSize: 12,
    color: t.categorySynagogue,
    fontWeight: '600',
    textAlign: 'center',
  },

  commentaryContainer: {
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  commentaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    padding: spacing.lg,
    borderBottomWidth: 0,
  },
  commentaryToggleText: {
    fontSize: 15,
    fontWeight: '700',
    color: t.categorySynagogue,
    textAlign: 'right',
  },
  commentarySections: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    borderTopWidth: 0.5,
    borderTopColor: t.border,
  },
  commentarySection: {
    gap: 6,
    paddingTop: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: t.border,
    paddingBottom: spacing.md,
  },
  commentaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: t.text,
    textAlign: 'right',
  },
  commentarySource: {
    fontSize: 11,
    fontWeight: '600',
    color: t.categorySynagogue,
    textAlign: 'right',
    letterSpacing: 0.2,
  },
  commentaryText: {
    fontSize: 14,
    lineHeight: 24,
    color: t.text,
    textAlign: 'right',
  },
  commentaryAttribution: {
    fontSize: 11,
    color: t.textMuted,
    textAlign: 'center',
    paddingTop: spacing.sm,
  },

  sefariaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: t.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
  },
  sefariaBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: t.surface,
  },

  shareCard: {
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
    gap: spacing.md,
  },
  shareTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: t.textMuted,
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  shareBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 4,
  },
  shareBtnIcon: { fontSize: 18 },
  shareBtnLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: t.surface,
    textAlign: 'center',
  },
  pressed: { opacity: 0.85 },

  attribution: {
    fontSize: 11,
    color: t.textFaint,
    textAlign: 'center',
  },
}));
