import React, { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { colors, radius, shadow, spacing } from '../theme';
import { useParasha } from '../hooks/useParasha';
import { getParashaContent } from '../data/parashaContent';

async function copyToClipboard(text: string) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

export function ParashaDetailScreen() {
  const navigation = useNavigation();
  const { parasha } = useParasha();
  const content = getParashaContent(parasha?.topicSlug);
  const [copied, setCopied] = useState(false);

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
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerLabel}>פרשת השבוע</Text>
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="share-outline" size={20} color={colors.primary} />
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
                    <Ionicons name="book-outline" size={16} color={colors.categorySynagogue} />
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
            <Ionicons name="book-outline" size={18} color={colors.surface} />
            <Text style={styles.sefariaBtnText}>קרא את הפרשה המלאה</Text>
          </Pressable>
        ) : null}

        {/* Share row */}
        <View style={styles.shareCard}>
          <Text style={styles.shareTitle}>שתף את הפרשה</Text>
          <View style={styles.shareRow}>
            <Pressable style={({ pressed }) => [styles.shareBtn, { backgroundColor: '#25D366' }, pressed && styles.pressed]} onPress={handleWhatsApp}>
              <Text style={styles.shareBtnIcon}>💬</Text>
              <Text style={styles.shareBtnLabel}>וואטסאפ</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.shareBtn, { backgroundColor: '#229ED9' }, pressed && styles.pressed]} onPress={handleTelegram}>
              <Text style={styles.shareBtnIcon}>✈️</Text>
              <Text style={styles.shareBtnLabel}>טלגרם</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.shareBtn, { backgroundColor: '#1877F2' }, pressed && styles.pressed]} onPress={handleFacebook}>
              <Text style={styles.shareBtnIcon}>👥</Text>
              <Text style={styles.shareBtnLabel}>פייסבוק</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.shareBtn, { backgroundColor: copied ? colors.success : colors.textMuted }, pressed && styles.pressed]} onPress={handleCopy}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.surface} />
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
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
    color: colors.text,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: '#EBF2FD',
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
    backgroundColor: '#C8DDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroBadgeIcon: { fontSize: 32 },
  heroTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.categorySynagogue,
    letterSpacing: 0.3,
  },
  parashaName: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.text,
    textAlign: 'center',
  },
  datePill: {
    backgroundColor: '#C8DDF8',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: 2,
  },
  hebrewDate: {
    fontSize: 13,
    color: colors.categorySynagogue,
    fontWeight: '600',
  },

  bookInfoCard: {
    backgroundColor: '#F0F5FF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#D0DFFA',
  },
  bookInfoText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
    textAlign: 'right',
    fontWeight: '500',
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.categorySynagogue,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  readBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.categorySynagogue,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'right',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 28,
    color: colors.text,
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
    color: colors.categorySynagogue,
    marginTop: 6,
    flexShrink: 0,
  },
  keyPointText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'right',
    fontWeight: '600',
  },
  keyPointDetail: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'right',
    paddingRight: 16,
  },

  quoteCard: {
    backgroundColor: '#EBF2FD',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.categorySynagogue,
  },
  quoteIcon: {
    fontSize: 28,
    color: colors.categorySynagogue,
    opacity: 0.4,
    alignSelf: 'flex-end',
  },
  quoteText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  quoteSource: {
    fontSize: 12,
    color: colors.categorySynagogue,
    fontWeight: '600',
    textAlign: 'center',
  },

  sefariaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
  },
  sefariaBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },

  shareCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
    gap: spacing.md,
  },
  shareTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
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
    color: colors.surface,
    textAlign: 'center',
  },
  pressed: { opacity: 0.85 },

  attribution: {
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
  },
});
