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
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { CATEGORY_GROUPS } from '../data/jewish-content/category-groups';
import { CategoryGroup } from '../data/jewish-content/types';
import { useCategoryPreferences } from '../hooks/useCategoryPreferences';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'KarovLevOnboarding'>;

export function KarovLevOnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const isEditing = route.params?.isEditing ?? false;
  const insets = useSafeAreaInsets();
  const { selected: savedSelected, setSelected, markDecided } = useCategoryPreferences();

  const [draft, setDraft] = useState<CategoryGroup[]>(savedSelected);

  const toggleCategory = (id: CategoryGroup) => {
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    await setSelected(draft);

    if (draft.includes('mussar_middot')) {
      navigation.navigate('MiddotSelection', { isEditing });
    } else {
      await markDecided();
      navigation.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'KarovLev' }] });
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>
          {isEditing ? 'עריכת העדפות' : 'קרוב ללב'}
        </Text>
        {isEditing ? (
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>מה תרצה לחזק היום?</Text>
          <Text style={styles.subtitle}>בחר תחום אחד או יותר</Text>
        </View>

        <View style={styles.grid}>
          {CATEGORY_GROUPS.map((group) => {
            const isSelected = draft.includes(group.id);
            return (
              <Pressable
                key={group.id}
                style={[
                  styles.card,
                  isSelected && {
                    borderColor: group.color,
                    borderWidth: 2,
                    backgroundColor: group.backgroundColor,
                  },
                ]}
                onPress={() => toggleCategory(group.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={group.label}
              >
                <View style={styles.cardCheckRow}>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={20} color={group.color} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color={colors.border} />
                  )}
                </View>
                <Text style={styles.cardEmoji}>{group.emoji}</Text>
                <Text style={[styles.cardLabel, isSelected && { color: group.color }]}>
                  {group.label}
                </Text>
                <Text style={styles.cardDesc}>{group.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {draft.length > 0 && (
          <Text style={styles.selectedCount}>
            {draft.length} תחום{draft.length > 1 ? 'ים' : ''} נבחר{draft.length > 1 ? 'ו' : ''}
          </Text>
        )}
        <Pressable
          style={[styles.continueBtn, draft.length === 0 && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={draft.length === 0}
        >
          <Text style={styles.continueBtnText}>
            {draft.includes('mussar_middot') ? 'בחר מידות ←' : 'אישור ←'}
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
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'right',
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-end',
    gap: 6,
  },
  cardCheckRow: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 19,
  },
  footer: {
    padding: spacing.lg,
    gap: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  selectedCount: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: colors.text,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: colors.border,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
});
