import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { BIRKAT_HAMAZON, Nusach } from '../data/birkatHamazon';

export function BrachotScreen() {
  const [nusach, setNusach] = useState<Nusach | null>(null);

  if (nusach) {
    const paragraphs = BIRKAT_HAMAZON[nusach];
    return (
      <Screen padded>
        <View style={styles.header}>
          <Pressable onPress={() => setNusach(null)} style={styles.back} hitSlop={10}>
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
            <Text style={styles.backText}>ברכות</Text>
          </Pressable>
          <Text style={styles.headerTitle}>ברכת המזון</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.nusachLabel}>
          {nusach === 'ashkenaz' ? '🕍 נוסח אשכנז' : '🕌 נוסח ספרד'}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.textContent}>
          {paragraphs.map((para, i) => (
            <View key={i} style={styles.para}>
              {para.title ? (
                <Text style={styles.paraTitle}>{para.title}</Text>
              ) : null}
              <Text style={styles.paraText}>{para.text}</Text>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen padded>
      <Text style={styles.screenTitle}>ברכות</Text>

      {/* ברכת המזון card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ברכת המזון</Text>

        <Pressable style={styles.nusachCard} onPress={() => setNusach('ashkenaz')}>
          <View style={styles.nusachIcon}><Text style={styles.emoji}>🕍</Text></View>
          <View style={styles.nusachText}>
            <Text style={styles.nusachTitle}>נוסח אשכנז</Text>
            <Text style={styles.nusachSub}>מנהג אשכנז</Text>
          </View>
          <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
        </Pressable>

        <Pressable style={styles.nusachCard} onPress={() => setNusach('sfarad')}>
          <View style={styles.nusachIcon}><Text style={styles.emoji}>🕌</Text></View>
          <View style={styles.nusachText}>
            <Text style={styles.nusachTitle}>נוסח ספרד</Text>
            <Text style={styles.nusachSub}>מנהג ספרד ועדות המזרח</Text>
          </View>
          <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: 4,
  },
  nusachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  nusachIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  nusachText: { flex: 1 },
  nusachTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  nusachSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },

  // Text view
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  nusachLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  textContent: {
    paddingBottom: 20,
  },
  para: {
    marginBottom: spacing.xl,
  },
  paraTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    marginBottom: 8,
    borderRightWidth: 3,
    borderRightColor: colors.primary,
    paddingRight: 8,
  },
  paraText: {
    fontSize: 18,
    lineHeight: 32,
    color: colors.text,
    textAlign: 'right',
  },
});
