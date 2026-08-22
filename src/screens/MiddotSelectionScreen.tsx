import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { MIDDOT, MIDDAH_GROUPS } from '../data/jewish-content/middot';
import { useCategoryPreferences } from '../hooks/useCategoryPreferences';
import { useSelectedMiddot } from '../hooks/useSelectedMiddot';

const MAX_MIDDOT = 3;
const MIDDAH_COLOR = '#5D8A6F';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'MiddotSelection'>;

export function MiddotSelectionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const isEditing = route.params?.isEditing ?? false;
  const insets = useSafeAreaInsets();
  const { markDecided } = useCategoryPreferences();
  const { selected: savedSelected, setSelected } = useSelectedMiddot();

  const [draft, setDraft] = useState<string[]>(savedSelected);

  const toggleMiddah = (topic: string) => {
    setDraft((prev) => {
      if (prev.includes(topic)) return prev.filter((t) => t !== topic);
      if (prev.length >= MAX_MIDDOT) return prev;
      return [...prev, topic];
    });
  };

  const handleConfirm = async () => {
    await setSelected(draft);
    await markDecided();
    navigation.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'KarovLev' }] });
  };

  const atLimit = draft.length >= MAX_MIDDOT;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>בחר מידה לעבוד עליה</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>באיזו מידה תרצה לעבוד?</Text>
          <Text style={styles.subtitle}>
            {atLimit
              ? `בחרת ${MAX_MIDDOT}/${MAX_MIDDOT} מידות — בטל סימון כדי לשנות`
              : `ניתן לבחור עד ${MAX_MIDDOT} מידות · ${draft.length} נבחרו`}
          </Text>
        </View>

        {MIDDAH_GROUPS.map((group) => {
          const groupMiddot = MIDDOT.filter((m) => m.group === group.id);
          return (
            <View key={group.id} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <Text style={styles.groupDesc}>{group.description}</Text>
              <View style={styles.chipsRow}>
                {groupMiddot.map((m) => {
                  const isSelected = draft.includes(m.topic);
                  const isDisabled = !isSelected && atLimit;
                  return (
                    <Pressable
                      key={m.topic}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                        isDisabled && styles.chipDisabled,
                      ]}
                      onPress={() => toggleMiddah(m.topic)}
                      disabled={isDisabled}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected, disabled: isDisabled }}
                      accessibilityLabel={m.label}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={13} color={MIDDAH_COLOR} />
                      )}
                      <Text style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                        isDisabled && styles.chipTextDisabled,
                      ]}>
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {draft.length > 0 && (
          <View style={styles.selectedPills}>
            {draft.map((topic) => {
              const m = MIDDOT.find((x) => x.topic === topic);
              return (
                <View key={topic} style={styles.selectedPill}>
                  <Text style={styles.selectedPillText}>{m?.label ?? topic}</Text>
                </View>
              );
            })}
          </View>
        )}
        <Pressable
          style={[styles.confirmBtn, draft.length === 0 && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={draft.length === 0}
        >
          <Text style={styles.confirmBtnText}>
            {draft.length === 0
              ? 'בחר לפחות מידה אחת'
              : `התחל ←`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  headerSpacer: { width: 36 },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  titleBlock: {
    gap: 6,
    alignItems: 'flex-end',
    paddingTop: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
  },
  group: {
    gap: 10,
    alignItems: 'flex-end',
  },
  groupLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  groupDesc: {
    fontSize: 12,
    color: colors.textMuted,
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
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: MIDDAH_COLOR,
    backgroundColor: `${MIDDAH_COLOR}14`,
  },
  chipDisabled: {
    opacity: 0.35,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: MIDDAH_COLOR,
  },
  chipTextDisabled: {
    color: colors.textFaint,
  },
  footer: {
    padding: spacing.lg,
    gap: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  selectedPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  selectedPill: {
    backgroundColor: `${MIDDAH_COLOR}18`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: `${MIDDAH_COLOR}40`,
  },
  selectedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: MIDDAH_COLOR,
  },
  confirmBtn: {
    backgroundColor: MIDDAH_COLOR,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: colors.border,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
