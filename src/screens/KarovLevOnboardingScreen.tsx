import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeStyles, radius, spacing, useTheme } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { CATEGORY_GROUPS } from '../data/jewish-content/category-groups';
import { CategoryGroup } from '../data/jewish-content/types';
import { useCategoryPreferences } from '../hooks/useCategoryPreferences';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'KarovLevOnboarding'>;

export function KarovLevOnboardingScreen() {
  const theme = useTheme();
  const styles = useStyles();
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
            <Ionicons name="chevron-forward" size={22} color={theme.text} />
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
            const accent = theme.accent[group.accent];
            return (
              <Pressable
                key={group.id}
                style={[
                  styles.card,
                  isSelected && {
                    borderColor: accent.fg,
                    borderWidth: 2,
                    backgroundColor: accent.tint,
                  },
                ]}
                onPress={() => toggleCategory(group.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={group.label}
              >
                <View style={styles.cardCheckRow}>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={20} color={accent.fg} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color={theme.border} />
                  )}
                </View>
                <Text style={styles.cardEmoji}>{group.emoji}</Text>
                <Text style={[styles.cardLabel, isSelected && { color: accent.fg }]}>
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
    fontSize: 24,
    fontWeight: '800',
    color: t.text,
    textAlign: 'right',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: t.textMuted,
    textAlign: 'right',
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: t.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: t.border,
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
    color: t.text,
    textAlign: 'right',
  },
  cardDesc: {
    fontSize: 13,
    color: t.textMuted,
    textAlign: 'right',
    lineHeight: 19,
  },
  footer: {
    padding: spacing.lg,
    gap: 8,
    backgroundColor: t.surface,
    borderTopWidth: 0.5,
    borderTopColor: t.border,
  },
  selectedCount: {
    fontSize: 12,
    color: t.textMuted,
    textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: t.text,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: t.border,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: t.surface,
  },
}));
