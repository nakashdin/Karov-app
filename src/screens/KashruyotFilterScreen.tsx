import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { makeStyles, radius, shadow, spacing, useTheme } from '../theme';
import { useFilters } from '../context/FiltersContext';
import { emptyFilters, KosherCategory } from '../types';
import { categoryLabel } from '../utils/kosher';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = NativeStackScreenProps<RootStackParamList, 'KashruyotFilter'>['route'];
type FoodPlaceType = 'restaurant' | 'fast_food' | 'cafe' | 'coffee_cart';

const CATEGORIES: Array<{ key: KosherCategory | null; label: string; emoji: string }> = [
  { key: null,    label: 'הכל',   emoji: '🍽️' },
  { key: 'meat',  label: categoryLabel.meat,  emoji: '🥩' },
  { key: 'dairy', label: categoryLabel.dairy, emoji: '🧀' },
  { key: 'parve', label: categoryLabel.parve, emoji: '🥗' },
];

const KASHRUYOT_OPTIONS: Array<{ key: string; label: string; emoji: string; mehadrinOnly: boolean; kosherAuthorityGroup: string | null }> = [
  { key: 'all',                     label: 'הכל',                 emoji: '🍽️', mehadrinOnly: false, kosherAuthorityGroup: null },
  { key: 'mehadrin',                label: 'מהדרין בלבד',         emoji: '✡️',  mehadrinOnly: true,  kosherAuthorityGroup: null },
  { key: 'rabbinate',               label: 'רבנות',               emoji: '🏛️', mehadrinOnly: false, kosherAuthorityGroup: 'rabbinate' },
  { key: 'badatz_beit_yosef',       label: 'בד״ץ בית יוסף',       emoji: '📜', mehadrinOnly: false, kosherAuthorityGroup: 'badatz_beit_yosef' },
  { key: 'badatz_edah_hachareidis', label: 'בד״ץ העדה החרדית',    emoji: '📜', mehadrinOnly: false, kosherAuthorityGroup: 'badatz_edah_hachareidis' },
  { key: 'yoreh_deah_mahfoud',      label: 'הרב מחפוד',           emoji: '📋', mehadrinOnly: false, kosherAuthorityGroup: 'yoreh_deah_mahfoud' },
  { key: 'chatam_sofer',            label: 'חוג חתם סופר',         emoji: '📋', mehadrinOnly: false, kosherAuthorityGroup: 'chatam_sofer' },
  { key: 'badatz_kehilot',          label: 'קהילות',              emoji: '📋', mehadrinOnly: false, kosherAuthorityGroup: 'badatz_kehilot' },
  { key: 'badatz_rubin',            label: 'הרב רובין',           emoji: '📋', mehadrinOnly: false, kosherAuthorityGroup: 'badatz_rubin' },
  { key: 'tzohar',                  label: 'צהר',                 emoji: '🌅', mehadrinOnly: false, kosherAuthorityGroup: 'tzohar' },
  { key: 'unknown',                 label: 'גוף כשרות לא ידוע',   emoji: '❓', mehadrinOnly: false, kosherAuthorityGroup: 'unknown' },
];

const STEPS = ['קטגוריה', 'כשרות', 'תוצאות'];

export function KashruyotFilterScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const placeType: FoodPlaceType = route.params?.placeType ?? 'restaurant';
  const { setFilters } = useFilters();

  const [step, setStep] = useState<0 | 1>(0);
  const [selectedCategory, setSelectedCategory] = useState<KosherCategory | null | '__unset__'>('__unset__');
  const [selectedKosherKey, setSelectedKosherKey] = useState<string | '__unset__'>('__unset__');

  const handleBack = () => {
    if (step === 1) {
      setStep(0);
    } else {
      navigation.goBack();
    }
  };

  const handleContinue = () => {
    setStep(1);
  };

  const handleShowResults = () => {
    const opt = KASHRUYOT_OPTIONS.find(o => o.key === selectedKosherKey);
    setFilters({
      ...emptyFilters,
      placeType,
      category: selectedCategory === '__unset__' ? null : selectedCategory,
      mehadrinOnly: opt?.mehadrinOnly ?? false,
      kosherAuthorityGroup: opt?.kosherAuthorityGroup ?? null,
    });
    navigation.navigate('List', undefined);
  };

  const categoryReady = selectedCategory !== '__unset__';
  const kosherReady = selectedKosherKey !== '__unset__';

  return (
    <Screen style={styles.screen}>
      {/* Back + Stepper */}
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={handleBack}
        >
          <Ionicons name="chevron-forward" size={22} color={theme.text} />
        </Pressable>

        <View style={styles.stepper}>
          {STEPS.map((label, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <React.Fragment key={label}>
                {i > 0 && (
                  <View style={[styles.stepLine, done && styles.stepLineDone]} />
                )}
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepDot,
                    active && styles.stepDotActive,
                    done && styles.stepDotDone,
                  ]}>
                    {done ? (
                      <Ionicons name="checkmark" size={10} color={theme.textInverse} />
                    ) : (
                      <Text style={[styles.stepNum, active && styles.stepNumActive]}>
                        {i + 1}
                      </Text>
                    )}
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    active && styles.stepLabelActive,
                    done && styles.stepLabelDone,
                  ]}>
                    {label}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>
          {step === 0 ? 'איזו קטגוריה?' : 'איזו כשרות?'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 0 ? 'בחר סוג מזון' : 'סינון כשרות'}
        </Text>
      </View>

      {/* Step 0 — Category */}
      {step === 0 && (
        <>
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {CATEGORIES.map((cat) => {
              const selected = selectedCategory === cat.key;
              return (
                <Pressable
                  key={String(cat.key)}
                  style={({ pressed }) => [
                    styles.card,
                    selected && styles.cardSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setSelectedCategory(cat.key)}
                >
                  <Text style={styles.cardEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>
                    {cat.label}
                  </Text>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.continueBtn,
                !categoryReady && styles.continueBtnDisabled,
                pressed && categoryReady && styles.pressed,
              ]}
              onPress={handleContinue}
              disabled={!categoryReady}
            >
              <Text style={[styles.continueBtnText, !categoryReady && styles.continueBtnTextDisabled]}>
                המשך
              </Text>
              <Ionicons
                name="chevron-back"
                size={18}
                color={categoryReady ? theme.textInverse : theme.textMuted}
              />
            </Pressable>
          </View>
        </>
      )}

      {/* Step 1 — Kashruyot */}
      {step === 1 && (
        <>
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {KASHRUYOT_OPTIONS.map((opt) => {
              const selected = selectedKosherKey === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [
                    styles.card,
                    selected && styles.cardSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setSelectedKosherKey(opt.key)}
                >
                  <Text style={styles.cardEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>
                    {opt.label}
                  </Text>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.continueBtn,
                !kosherReady && styles.continueBtnDisabled,
                pressed && kosherReady && styles.pressed,
              ]}
              onPress={handleShowResults}
              disabled={!kosherReady}
            >
              <Text style={[styles.continueBtnText, !kosherReady && styles.continueBtnTextDisabled]}>
                הצג תוצאות
              </Text>
              <Ionicons
                name="search-outline"
                size={18}
                color={kosherReady ? theme.textInverse : theme.textMuted}
              />
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: t.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },

  // ── Stepper ──────────────────────────────────────────────
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: t.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: t.primary,
  },
  stepDotDone: {
    backgroundColor: t.primary,
  },
  stepNum: {
    fontSize: 10,
    fontWeight: '700',
    color: t.textMuted,
  },
  stepNumActive: {
    color: t.textInverse,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: t.border,
    marginBottom: 14,
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: t.primary,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: t.textMuted,
  },
  stepLabelActive: {
    color: t.primary,
    fontWeight: '700',
  },
  stepLabelDone: {
    color: t.primary,
  },

  // ── Title ────────────────────────────────────────────────
  titleBlock: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: t.text,
  },
  subtitle: {
    fontSize: 13,
    color: t.textMuted,
    marginTop: 3,
  },

  // ── Cards ────────────────────────────────────────────────
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: t.surface,
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadow.card,
  },
  cardAll: {
    borderColor: t.border,
  },
  cardSelected: {
    borderColor: t.primary,
    backgroundColor: t.primaryLight,
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: t.text,
    textAlign: 'right',
  },
  cardLabelSelected: {
    fontWeight: '700',
    color: t.primary,
  },

  // ── Radio ────────────────────────────────────────────────
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: t.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: t.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: t.primary,
  },

  sectionGap: {
    height: 4,
  },

  // ── Footer ───────────────────────────────────────────────
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: t.background,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: t.primary,
    borderRadius: radius.pill,
    paddingVertical: 16,
  },
  continueBtnDisabled: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: t.textInverse,
    letterSpacing: -0.2,
  },
  continueBtnTextDisabled: {
    color: t.textMuted,
  },

  pressed: {
    opacity: 0.8,
  },
}));
