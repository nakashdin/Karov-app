import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../../theme';
import { CategoryGroup } from '../../data/jewish-content/types';
import { CATEGORY_GROUPS } from '../../data/jewish-content/category-groups';

interface Props {
  visible: boolean;
  initialSelected: CategoryGroup[];
  onSave: (selected: CategoryGroup[]) => void;
  onSkip: () => void;
}

export function CategoryPreferenceModal({ visible, initialSelected, onSave, onSkip }: Props) {
  const [draft, setDraft] = useState<CategoryGroup[]>(initialSelected);

  const toggle = (id: CategoryGroup) => {
    setDraft(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSave(draft);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onSkip}
    >
      <View style={styles.root}>
        {/* Drag handle */}
        <View style={styles.handle} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>מה תרצה לחזק היום?</Text>
          <Text style={styles.subtitle}>
            בחר תחום אחד או יותר — נציג לך תוכן שמתאים לך
          </Text>

          <View style={styles.cards}>
            {CATEGORY_GROUPS.map(cat => {
              const selected = draft.includes(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [
                    styles.card,
                    selected && { borderColor: cat.color, backgroundColor: cat.backgroundColor },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => toggle(cat.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={cat.label}
                >
                  {/* Checkmark on visual left (RTL: end) */}
                  <View style={styles.checkBox}>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={22} color={cat.color} />
                    )}
                    {!selected && (
                      <View style={styles.checkEmpty} />
                    )}
                  </View>

                  {/* Label + description on visual right (RTL: start) */}
                  <View style={styles.cardText}>
                    <View style={styles.cardLabelRow}>
                      <Text style={[styles.cardLabel, selected && { color: cat.color }]}>
                        {cat.label}
                      </Text>
                      <Text style={styles.cardEmoji}>{cat.emoji}</Text>
                    </View>
                    <Text style={styles.cardDesc}>{cat.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>שמור והמשך</Text>
          </Pressable>
          <Pressable onPress={onSkip} hitSlop={8} style={styles.skipBtn}>
            <Text style={styles.skipText}>דלג כרגע</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 22,
    marginTop: -spacing.sm,
  },
  cards: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  pressed: {
    opacity: 0.85,
  },
  checkBox: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  checkEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardText: {
    flex: 1,
    gap: 3,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  cardEmoji: {
    fontSize: 18,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 18,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  saveBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textInverse,
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
