import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { alpha, makeStyles, radius, spacing, useTheme } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { MIDDOT, MIDDAH_GROUPS } from '../data/jewish-content/middot';
import { useCategoryPreferences } from '../hooks/useCategoryPreferences';
import { useSelectedMiddot } from '../hooks/useSelectedMiddot';

const MAX_MIDDOT = 3;

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'MiddotSelection'>;

export function MiddotSelectionScreen() {
  const theme = useTheme();
  const styles = useStyles();
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
          <Ionicons name="chevron-forward" size={22} color={theme.text} />
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
                        <Ionicons name="checkmark" size={13} color={theme.middot} />
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: t.text,
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
    color: t.text,
    textAlign: 'right',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: t.textMuted,
    textAlign: 'right',
  },
  group: {
    gap: 10,
    alignItems: 'flex-end',
  },
  groupLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: t.text,
    textAlign: 'right',
  },
  groupDesc: {
    fontSize: 12,
    color: t.textMuted,
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
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  chipSelected: {
    borderColor: t.middot,
    backgroundColor: alpha(t.middot, 0.08),
  },
  chipDisabled: {
    opacity: 0.35,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.textMuted,
  },
  chipTextSelected: {
    color: t.middot,
  },
  chipTextDisabled: {
    color: t.textFaint,
  },
  footer: {
    padding: spacing.lg,
    gap: 10,
    backgroundColor: t.surface,
    borderTopWidth: 0.5,
    borderTopColor: t.border,
  },
  selectedPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  selectedPill: {
    backgroundColor: alpha(t.middot, 0.09),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: alpha(t.middot, 0.25),
  },
  selectedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: t.middot,
  },
  confirmBtn: {
    backgroundColor: t.middot,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: t.border,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: t.textInverse,
  },
}));
