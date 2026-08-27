import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, radius, spacing, useTheme } from '../../theme';
import { MIDDAH_GROUPS, MIDDOT } from '../../data/jewish-content/middot';

interface Props {
  visible: boolean;
  selected: string[];
  onToggle: (topic: string) => void;
  onClose: () => void;
}

export function MiddahPickerModal({ visible, selected, onToggle, onClose }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingBottom: insets.bottom + 16 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={theme.text} />
          </Pressable>
          <Text style={styles.headerTitle}>בחר מידה לשבוע</Text>
          <View style={styles.closeBtn} />
        </View>

        <Text style={styles.subtitle}>
          בחר מידה אחת או יותר לעבוד עליהן השבוע. כל יום תקבל כרטיסייה אחרת.
        </Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {MIDDAH_GROUPS.map((group) => {
            const groupMiddot = MIDDOT.filter((m) => m.group === group.id);
            return (
              <View key={group.id} style={styles.groupSection}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <Text style={styles.groupDesc}>{group.description}</Text>

                <View style={styles.chipsRow}>
                  {groupMiddot.map((middah) => {
                    const isSelected = selected.includes(middah.topic);
                    return (
                      <Pressable
                        key={middah.topic}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => onToggle(middah.topic)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={12} color={theme.textInverse} />
                        )}
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                          {middah.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Done button */}
        <Pressable style={styles.doneBtn} onPress={onClose}>
          <Text style={styles.doneBtnText}>
            {selected.length === 0
              ? 'סגור'
              : `עובד על ${selected.length} מידה${selected.length > 1 ? 'ות' : ''} ✓`}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: t.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: t.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: t.text,
  },
  subtitle: {
    fontSize: 13,
    color: t.textMuted,
    textAlign: 'right',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  groupSection: {
    gap: spacing.sm,
  },
  groupLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: t.text,
    textAlign: 'right',
  },
  groupDesc: {
    fontSize: 12,
    color: t.textFaint,
    textAlign: 'right',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  chipSelected: {
    borderColor: t.middot,
    backgroundColor: t.middot,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.text,
  },
  chipTextSelected: {
    color: t.textInverse,
  },
  doneBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: t.middot,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: t.textInverse,
  },
}));
