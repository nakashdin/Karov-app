import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { colors, radius, shadow, spacing } from '../theme';
import { useFilters } from '../context/FiltersContext';
import { emptyFilters, KosherCategory, KosherType } from '../types';
import { KASHRUYOT_FILTER_TYPES, categoryLabel, kosherTypeLabel } from '../utils/kosher';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES: Array<{ key: KosherCategory | null; label: string; emoji: string }> = [
  { key: null,    label: 'הכל',   emoji: '🍽️' },
  { key: 'meat',  label: categoryLabel.meat,  emoji: '🥩' },
  { key: 'dairy', label: categoryLabel.dairy, emoji: '🧀' },
  { key: 'parve', label: categoryLabel.parve, emoji: '🥗' },
];

const STEPS = ['קטגוריה', 'כשרות', 'תוצאות'];

export function KashruyotFilterScreen() {
  const navigation = useNavigation<Nav>();
  const { setFilters } = useFilters();

  const [step, setStep] = useState<0 | 1>(0);
  const [selectedCategory, setSelectedCategory] = useState<KosherCategory | null | '__unset__'>('__unset__');
  const [selectedKosher, setSelectedKosher] = useState<KosherType | null | '__unset__'>('__unset__');

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
    setFilters({
      ...emptyFilters,
      placeType: 'restaurant',
      category: selectedCategory === '__unset__' ? null : selectedCategory,
      kosherType: selectedKosher === '__unset__' ? null : selectedKosher,
    });
    navigation.navigate('List', undefined);
  };

  const categoryReady = selectedCategory !== '__unset__';
  const kosherReady = selectedKosher !== '__unset__';

  return (
    <Screen style={styles.screen}>
      {/* Back + Stepper */}
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={handleBack}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
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
                      <Ionicons name="checkmark" size={10} color="#fff" />
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
          {step === 0 ? 'בחר סוג מזון' : 'בחר גוף הכשר'}
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
                color={categoryReady ? '#fff' : colors.textMuted}
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
            {/* הכל */}
            <Pressable
              style={({ pressed }) => [
                styles.card,
                styles.cardAll,
                selectedKosher === null && styles.cardSelected,
                pressed && styles.pressed,
              ]}
              onPress={() => setSelectedKosher(null)}
            >
              <Ionicons name="apps-outline" size={20} color={selectedKosher === null ? colors.primary : colors.textMuted} />
              <Text style={[styles.cardLabel, selectedKosher === null && styles.cardLabelSelected]}>
                הכל
              </Text>
              <View style={[styles.radio, selectedKosher === null && styles.radioSelected]}>
                {selectedKosher === null && <View style={styles.radioDot} />}
              </View>
            </Pressable>

            <View style={styles.sectionGap} />

            {KASHRUYOT_FILTER_TYPES.map((type) => {
              const selected = selectedKosher === type;
              return (
                <Pressable
                  key={type}
                  style={({ pressed }) => [
                    styles.card,
                    selected && styles.cardSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setSelectedKosher(type)}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={selected ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.cardLabel, selected && styles.cardLabelSelected]}>
                    {kosherTypeLabel[type]}
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
                color={kosherReady ? '#fff' : colors.textMuted}
              />
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotDone: {
    backgroundColor: colors.primary,
  },
  stepNum: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  stepNumActive: {
    color: '#fff',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: colors.primary,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepLabelDone: {
    color: colors.primary,
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
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
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
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadow.card,
  },
  cardAll: {
    borderColor: colors.border,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'right',
  },
  cardLabelSelected: {
    fontWeight: '700',
    color: colors.primary,
  },

  // ── Radio ────────────────────────────────────────────────
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },

  sectionGap: {
    height: 4,
  },

  // ── Footer ───────────────────────────────────────────────
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 16,
  },
  continueBtnDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  continueBtnTextDisabled: {
    color: colors.textMuted,
  },

  pressed: {
    opacity: 0.8,
  },
});
