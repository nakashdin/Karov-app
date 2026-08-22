import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing } from '../theme';
import { BIRKAT_HAMAZON } from '../data/birkatHamazon';
import { useNusach } from '../hooks/useNusach';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const NUSACH_LABEL = { ashkenaz: 'נוסח אשכנז', sfarad: 'נוסח ספרד', edot_hamizrach: 'נוסח עדות המזרח' } as const;

export function BirkatHamazonModal({ visible, onClose }: Props) {
  const { nusach } = useNusach();
  const resolvedKey = nusach === 'edot_hamizrach' ? 'sfarad' : (nusach ?? 'sfarad');
  const paragraphs = BIRKAT_HAMAZON[resolvedKey];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <View />
          <Text style={styles.headerTitle}>ברכת המזון</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.textScroll}
          contentContainerStyle={styles.textContent}
          showsVerticalScrollIndicator={false}
        >
          {nusach ? (
            <Text style={styles.nusachLabel}>{NUSACH_LABEL[nusach]}</Text>
          ) : null}
          {paragraphs.map((para, i) => (
            <View key={i} style={styles.para}>
              {para.title ? (
                <Text style={styles.paraTitle}>{para.title}</Text>
              ) : null}
              <Text style={styles.paraText}>{para.text}</Text>
            </View>
          ))}
          <View style={styles.bottomPad} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // Nusach selector
  selectorBody: {
    padding: spacing.lg,
    gap: 12,
  },
  selectorHint: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
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
  nusachEmoji: {
    fontSize: 22,
  },
  nusachText: {
    flex: 1,
  },
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

  // Text content
  textScroll: {
    flex: 1,
  },
  textContent: {
    padding: spacing.lg,
  },
  nusachLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    letterSpacing: 0.3,
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
    fontSize: 17,
    lineHeight: 30,
    color: colors.text,
    textAlign: 'right',
    fontFamily: 'System',
  },
  bottomPad: {
    height: 40,
  },
});
