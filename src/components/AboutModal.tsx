import React from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, shadow, spacing } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const VERSION = '1.0.0';

const CATEGORIES = [
  { icon: '🍽️', label: 'מסעדות כשרות' },
  { icon: '🕍', label: 'בתי כנסת' },
  { icon: '💧', label: 'מקוואות' },
  { icon: '🏠', label: 'בתי חב״ד' },
  { icon: '🕯️', label: 'קברי צדיקים' },
];

export function AboutModal({ visible, onClose }: Props) {
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
          <Text style={styles.headerTitle}>אודות קרוב</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Logo + version */}
          <View style={styles.logoBlock}>
            <Text style={styles.appName}>קרוב</Text>
            <Text style={styles.version}>גרסה {VERSION}</Text>
          </View>

          {/* Mission */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>המטרה שלנו</Text>
            <Text style={styles.body}>
              קרוב נוצרה מתוך רצון לתרום למען הקהילה היהודית — לרכז את כל המקומות,
              השירותים והמידע היהודי במקום אחד נגיש, בכל מקום בעולם.
            </Text>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>מה תמצאו באפליקציה</Text>
            {CATEGORIES.map((c) => (
              <View key={c.label} style={styles.categoryRow}>
                <Text style={styles.categoryIcon}>{c.icon}</Text>
                <Text style={styles.categoryLabel}>{c.label}</Text>
              </View>
            ))}
            <View style={styles.categoryRow}>
              <Text style={styles.categoryIcon}>📖</Text>
              <Text style={styles.categoryLabel}>ברכות יומיות נבחרות</Text>
            </View>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryIcon}>🕰️</Text>
              <Text style={styles.categoryLabel}>זמני היום (זמנים הלכתיים)</Text>
            </View>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryIcon}>📜</Text>
              <Text style={styles.categoryLabel}>פרשת השבוע</Text>
            </View>
          </View>

          {/* Community */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>קהילה שבונה יחד</Text>
            <Text style={styles.body}>
              קרוב מונעת על ידי הקהילה. כל אחד יכול להוסיף מיקום חדש או לדווח על
              מידע שגוי — כך אנחנו יחד ממקסמים את השירות ליהודים בכל רחבי העולם.
            </Text>
          </View>

          {/* Attribution — ODbL requires crediting OpenStreetMap wherever its
              data is shown. This is a licence obligation, not a courtesy, and
              the app stores check for it. */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>מקורות ורישוי</Text>
            <Text style={styles.body}>
              חלק מנתוני המקומות והמפה מגיעים מ‑OpenStreetMap, ומופצים תחת רישיון
              ODbL. תודה לאלפי המתנדבים שממפים את ישראל.
            </Text>
            <Pressable
              onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
              accessibilityRole="link"
              accessibilityLabel="רישיון OpenStreetMap"
            >
              <Text style={styles.link}>© OpenStreetMap contributors — ODbL</Text>
            </Pressable>
            <Text style={styles.bodyMuted}>
              זמנים הלכתיים ולוח עברי: Hebcal · תוכן תורני: Sefaria · מקוואות:
              data.gov.il · בתי חב״ד: Chabad.org
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>עשוי באהבה לעם ישראל 🇮🇱</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    writingDirection: 'rtl',
    marginTop: spacing.sm,
  },
  bodyMuted: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    writingDirection: 'rtl',
    marginTop: spacing.md,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surfaceMuted,
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
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  logoBlock: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1.5,
  },
  version: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
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
    color: colors.text,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
