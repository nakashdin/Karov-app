import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeStyles, radius, spacing, useTheme } from '../theme';
import { BIRKAT_HAMAZON } from '../data/birkatHamazon';
import { useNusach } from '../hooks/useNusach';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const NUSACH_LABEL = { ashkenaz: 'נוסח אשכנז', sfarad: 'נוסח ספרד', edot_hamizrach: 'נוסח עדות המזרח' } as const;

export function BirkatHamazonModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const styles = useStyles();
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
            <Ionicons name="close" size={22} color={theme.textMuted} />
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

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: t.overlay,
  },
  sheet: {
    backgroundColor: t.background,
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
    borderBottomColor: t.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: t.text,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.primary,
  },

  // Nusach selector
  selectorBody: {
    padding: spacing.lg,
    gap: 12,
  },
  selectorHint: {
    fontSize: 14,
    color: t.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  nusachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 0.5,
    borderColor: t.border,
  },
  nusachIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.primaryLight,
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
    color: t.text,
    textAlign: 'right',
  },
  nusachSub: {
    fontSize: 12,
    color: t.textMuted,
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
    color: t.primary,
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
    color: t.text,
    textAlign: 'right',
    marginBottom: 8,
    borderRightWidth: 3,
    borderRightColor: t.primary,
    paddingRight: 8,
  },
  paraText: {
    fontSize: 17,
    lineHeight: 30,
    color: t.text,
    textAlign: 'right',
    fontFamily: 'System',
  },
  bottomPad: {
    height: 40,
  },
}));
