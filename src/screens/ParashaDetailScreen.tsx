import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { colors, radius, shadow, spacing } from '../theme';
import { useParasha } from '../hooks/useParasha';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function ParashaDetailScreen() {
  const navigation = useNavigation();
  const { parasha } = useParasha();
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingDesc, setLoadingDesc] = useState(true);

  useEffect(() => {
    if (!parasha?.hebrewName) return;
    let cancelled = false;

    const baseName = parasha.hebrewName.replace(/^פרשת\s+/, '');
    const firstName = baseName.split(/[-־]/)[0].trim();
    const candidates = baseName !== firstName
      ? [`פרשת ${baseName}`, `פרשת ${firstName}`]
      : [`פרשת ${baseName}`];

    const tryNext = (index: number) => {
      if (index >= candidates.length || cancelled) { setLoadingDesc(false); return; }
      const title = encodeURIComponent(candidates[index]);
      // Use Wikipedia's extracts API to get the full article text (multiple sections)
      fetch(
        `https://he.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${title}&format=json&origin=*&exsectionformat=plain`,
      )
        .then((r) => r.json())
        .then((json) => {
          if (cancelled) return;
          const pages = json?.query?.pages ?? {};
          const page = Object.values(pages)[0] as any;
          if (page?.extract) {
            setExplanation(stripHtml(page.extract));
            setLoadingDesc(false);
          } else {
            tryNext(index + 1);
          }
        })
        .catch(() => tryNext(index + 1));
    };
    tryNext(0);

    return () => { cancelled = true; };
  }, [parasha?.hebrewName]);

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
        <View style={styles.backBtn} />
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

        {/* Explanation */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>על הפרשה</Text>
          {loadingDesc ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
          ) : explanation ? (
            <Text style={styles.descriptionText}>{explanation}</Text>
          ) : (
            <Text style={styles.noDesc}>ההסבר אינו זמין כרגע</Text>
          )}
        </View>

        {/* Read full parasha on Sefaria */}
        {parasha?.sefariaUrl ? (
          <Pressable
            style={({ pressed }) => [styles.sefariaBtn, pressed && { opacity: 0.8 }]}
            onPress={() => Linking.openURL(parasha.sefariaUrl)}
          >
            <Text style={styles.sefariaBtnText}>קרא את הפרשה המלאה ב-Sefaria</Text>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </Pressable>
        ) : null}

        <Text style={styles.attribution}>
          הסבר מתוך ויקיפדיה העברית · טקסט מ-Sefaria (Creative Commons)
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
  },
  heroCard: {
    backgroundColor: '#EBF2FD',
    borderRadius: radius.xl,
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
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
  heroBadgeIcon: {
    fontSize: 32,
  },
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.md,
    letterSpacing: 0.3,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 28,
    color: colors.text,
    textAlign: 'right',
  },
  noDesc: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  sefariaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: spacing.lg,
  },
  sefariaBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  attribution: {
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
  },
});
