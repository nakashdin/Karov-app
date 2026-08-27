import React from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeStyles, radius, shadow, spacing, useTheme } from '../theme';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const VERSION = '1.0.0';

export function AboutModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useLanguage();

  const categories = [
    { icon: '🍽️', label: t.home.restaurants },
    { icon: '🕍', label: t.home.synagogues },
    { icon: '💧', label: t.home.mikvahs },
    { icon: '🏠', label: t.home.chabadHouses },
    { icon: '🕯️', label: t.home.tzadikGraves },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.about.headerTitle}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Logo + version */}
          <View style={styles.logoBlock}>
            <Text style={styles.appName}>{t.about.appName}</Text>
            <Text style={styles.version}>{t.about.version(VERSION)}</Text>
          </View>

          {/* Mission */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.about.missionTitle}</Text>
            <Text style={styles.body}>{t.about.missionBody}</Text>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.about.categoriesTitle}</Text>
            {categories.map((c) => (
              <View key={c.label} style={styles.categoryRow}>
                <Text style={styles.categoryIcon}>{c.icon}</Text>
                <Text style={styles.categoryLabel}>{c.label}</Text>
              </View>
            ))}
            <View style={styles.categoryRow}>
              <Text style={styles.categoryIcon}>📖</Text>
              <Text style={styles.categoryLabel}>{t.about.dailyBrachot}</Text>
            </View>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryIcon}>🕰️</Text>
              <Text style={styles.categoryLabel}>{t.about.zmanim}</Text>
            </View>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryIcon}>📜</Text>
              <Text style={styles.categoryLabel}>{t.about.parasha}</Text>
            </View>
          </View>

          {/* Community */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.about.communityTitle}</Text>
            <Text style={styles.body}>{t.about.communityBody}</Text>
          </View>

          {/* Attribution — ODbL requires crediting OpenStreetMap wherever its
              data is shown. This is a licence obligation, not a courtesy, and
              the app stores check for it. */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.about.attributionTitle}</Text>
            <Text style={styles.body}>{t.about.attributionBody}</Text>
            <Pressable
              onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
              accessibilityRole="link"
              accessibilityLabel={t.about.osmLinkAccessibilityLabel}
            >
              <Text style={styles.link}>{t.about.osmLinkText}</Text>
            </Pressable>
            <Text style={styles.bodyMuted}>{t.about.sourcesLine}</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t.about.footerText}</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: t.primary,
    writingDirection: 'rtl',
    marginTop: spacing.sm,
  },
  bodyMuted: {
    fontSize: 13,
    lineHeight: 20,
    color: t.textMuted,
    writingDirection: 'rtl',
    marginTop: spacing.md,
  },
  backdrop: {
    flex: 1,
    backgroundColor: t.overlay,
  },
  sheet: {
    backgroundColor: t.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '85%',
    ...shadow.raised,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.surfaceMuted,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: t.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: t.text,
  },
  logoBlock: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: t.primary,
    letterSpacing: -1.5,
  },
  version: {
    fontSize: 12,
    color: t.textMuted,
    marginTop: 4,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: t.text,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: t.textMuted,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  categoryIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  categoryLabel: {
    fontSize: 14,
    color: t.text,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 0.5,
    borderTopColor: t.border,
  },
  footerText: {
    fontSize: 13,
    color: t.textMuted,
  },
}));
