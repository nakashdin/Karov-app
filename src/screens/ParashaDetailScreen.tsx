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

interface SefariaDescription {
  he?: string;
  en?: string;
}

export function ParashaDetailScreen() {
  const navigation = useNavigation();
  const { parasha } = useParasha();
  const [description, setDescription] = useState<SefariaDescription | null>(null);
  const [loadingDesc, setLoadingDesc] = useState(true);

  useEffect(() => {
    if (!parasha?.hebrewName) return;
    let cancelled = false;

    // Wikipedia Hebrew REST API — free, reliable, one paragraph per parasha.
    // For combined parashiyot (e.g. "פרשת מטות-מסעי") fall back to the first name.
    const baseName = parasha.hebrewName.replace(/^פרשת\s+/, '');
    const firstName = baseName.split(/[-־]/)[0].trim();
    const candidates = baseName !== firstName
      ? [`פרשת ${baseName}`, `פרשת ${firstName}`]
      : [`פרשת ${baseName}`];

    const tryNext = (index: number) => {
      if (index >= candidates.length || cancelled) { setLoadingDesc(false); return; }
      const title = candidates[index].replace(/\s+/g, '_');
      fetch(`https://he.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
        .then((r) => r.json())
        .then((json) => {
          if (cancelled) return;
          if (json.extract) { setDescription({ he: json.extract }); setLoadingDesc(false); }
          else tryNext(index + 1);
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
        {/* Title block */}
        <View style={styles.titleBlock}>
          <Text style={styles.emoji}>📖</Text>
          <Text style={styles.parashaName}>{parasha?.hebrewName ?? ''}</Text>
          {parasha?.hebrewDate ? (
            <Text style={styles.hebrewDate}>{parasha.hebrewDate}</Text>
          ) : null}
        </View>

        {/* Explanation */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>על הפרשה</Text>
          {loadingDesc ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
          ) : description?.he ? (
            <Text style={styles.descriptionText}>{description.he}</Text>
          ) : (
            <Text style={styles.noDesc}>ההסבר אינו זמין כרגע</Text>
          )}
        </View>

        {/* Read full parasha */}
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
          תוכן מסופק על ידי Sefaria בשיתוף Creative Commons
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
  titleBlock: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  parashaName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.primary,
    textAlign: 'center',
  },
  hebrewDate: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm,
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
