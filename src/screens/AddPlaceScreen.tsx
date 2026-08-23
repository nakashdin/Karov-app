import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { makeStyles, mix, radius, sizes, spacing, useTheme } from '../theme';
import type { Tokens } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'restaurant' | 'synagogue' | 'mikveh' | 'chabad_house' | 'tzaddik_grave';

interface CategoryDef {
  key: Category;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

function categoriesFor(theme: Tokens): CategoryDef[] {
  return [
  { key: 'restaurant', label: 'מסעדה כשרה', icon: 'restaurant-outline', color: theme.categoryRestaurant, bg: mix(theme.surface, theme.categoryRestaurant, 0.12) },
  { key: 'synagogue', label: 'בית כנסת', icon: 'business-outline', color: theme.categorySynagogue, bg: mix(theme.surface, theme.categorySynagogue, 0.12) },
  { key: 'mikveh', label: 'מקווה', icon: 'water-outline', color: theme.categoryMikveh, bg: mix(theme.surface, theme.categoryMikveh, 0.12) },
  { key: 'chabad_house', label: 'בית חב״ד', icon: 'home-outline', color: theme.chabad, bg: mix(theme.surface, theme.chabad, 0.12) },
  { key: 'tzaddik_grave', label: 'קבר צדיק', icon: 'flower-outline', color: theme.tzaddik, bg: mix(theme.surface, theme.tzaddik, 0.12) },
  ];
}

// Kashrut options for restaurants
const KASHRUT_OPTIONS = ['מהדרין', 'רגיל', 'חלבי', 'בשרי', 'פרווה'];
const NUSACH_OPTIONS = ['אשכנז', 'ספרד', 'עדות המזרח', 'חסידי', 'תימני'];
const MIKVEH_OPTIONS = ['גברים', 'נשים', 'גברים ונשים'];

export interface PlaceSubmission {
  id: string;
  category: Category;
  name: string;
  address: string;
  city: string;
  phone: string;
  hours: string;
  notes: string;
  // restaurant
  kashrut?: string;
  kashrutAuthority?: string;
  // synagogue
  nusach?: string;
  minyanTimes?: string;
  // mikveh
  mikvehType?: string;
  submittedAt: string;
  status: 'pending';
}

const STORAGE_KEY = '@karov_submissions';

async function saveSubmission(sub: PlaceSubmission) {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const existing: PlaceSubmission[] = raw ? JSON.parse(raw) : [];
  existing.unshift(sub);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function AddPlaceScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const navigation = useNavigation();
  const [step, setStep] = useState<'category' | 'details' | 'success'>('category');
  const [category, setCategory] = useState<Category | null>(null);

  // Common fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');

  // Restaurant
  const [kashrut, setKashrut] = useState('');
  const [kashrutAuthority, setKashrutAuthority] = useState('');

  // Synagogue
  const [nusach, setNusach] = useState('');
  const [minyanTimes, setMinyanTimes] = useState('');

  // Mikveh
  const [mikvehType, setMikvehType] = useState('');

  const selectedCat = categoriesFor(theme).find(c => c.key === category);

  const handleSubmit = async () => {
    if (!name.trim() || !address.trim() || !city.trim()) {
      Alert.alert('שדות חסרים', 'אנא מלא שם, כתובת ועיר לפחות');
      return;
    }
    const sub: PlaceSubmission = {
      id: `sub_${Date.now()}`,
      category: category!,
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      hours: hours.trim(),
      notes: notes.trim(),
      kashrut: kashrut || undefined,
      kashrutAuthority: kashrutAuthority || undefined,
      nusach: nusach || undefined,
      minyanTimes: minyanTimes || undefined,
      mikvehType: mikvehType || undefined,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };
    await saveSubmission(sub);
    setStep('success');
  };

  // ── Step: category picker ──
  if (step === 'category') {
    return (
      <Screen padded>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="chevron-forward" size={24} color={theme.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>הוספת מקום</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.stepLabel}>בחר קטגוריה</Text>

        <View style={styles.catGrid}>
          {categoriesFor(theme).map(cat => (
            <Pressable
              key={cat.key}
              style={[styles.catCard, { backgroundColor: cat.bg, borderColor: cat.color }]}
              onPress={() => { setCategory(cat.key); setStep('details'); }}
            >
              <View style={[styles.catIconBox, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon as any} size={28} color={cat.color} />
              </View>
              <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
            </Pressable>
          ))}
        </View>
      </Screen>
    );
  }

  // ── Step: success ──
  if (step === 'success') {
    return (
      <Screen padded>
        <View style={styles.successBox}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color={theme.primary} />
          </View>
          <Text style={styles.successTitle}>תודה רבה!</Text>
          <Text style={styles.successSub}>
            ההגשה שלך נשמרה ותעבור בדיקה לפני שתתווסף לאפליקציה.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>חזור לקהילה</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // ── Step: details form ──
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen padded={false}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg }]}>
          <Pressable onPress={() => setStep('category')} hitSlop={10}>
            <Ionicons name="chevron-forward" size={24} color={theme.primary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={[styles.catBadge, { backgroundColor: selectedCat!.bg }]}>
              <Ionicons name={selectedCat!.icon as any} size={14} color={selectedCat!.color} />
              <Text style={[styles.catBadgeText, { color: selectedCat!.color }]}>{selectedCat!.label}</Text>
            </View>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          {/* Common fields */}
          <Text style={styles.sectionTitle}>פרטים כלליים</Text>

          <Field label="שם המקום *" required>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="למשל: מסעדת הכרמל"
              placeholderTextColor={theme.textMuted}
              textAlign="right"
            />
          </Field>

          <Field label="כתובת *" required>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="רחוב ומספר"
              placeholderTextColor={theme.textMuted}
              textAlign="right"
            />
          </Field>

          <Field label="עיר *" required>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="שם העיר"
              placeholderTextColor={theme.textMuted}
              textAlign="right"
            />
          </Field>

          <Field label="טלפון">
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="05X-XXXXXXX"
              placeholderTextColor={theme.textMuted}
              keyboardType="phone-pad"
              textAlign="right"
            />
          </Field>

          <Field label="שעות פתיחה">
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={hours}
              onChangeText={setHours}
              placeholder={'א׳–ה׳ 08:00–22:00\nו׳ 08:00–15:00\nשבת סגור'}
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
              textAlign="right"
              textAlignVertical="top"
            />
          </Field>

          {/* Category-specific fields */}
          {category === 'restaurant' && (
            <>
              <Text style={styles.sectionTitle}>כשרות</Text>

              <Field label="רמת כשרות">
                <ChipSelector options={KASHRUT_OPTIONS} value={kashrut} onChange={setKashrut} />
              </Field>

              <Field label="גוף מכשיר">
                <TextInput
                  style={styles.input}
                  value={kashrutAuthority}
                  onChangeText={setKashrutAuthority}
                  placeholder="למשל: בד״ץ העדה החרדית"
                  placeholderTextColor={theme.textMuted}
                  textAlign="right"
                />
              </Field>
            </>
          )}

          {category === 'synagogue' && (
            <>
              <Text style={styles.sectionTitle}>פרטי בית הכנסת</Text>

              <Field label="נוסח">
                <ChipSelector options={NUSACH_OPTIONS} value={nusach} onChange={setNusach} />
              </Field>

              <Field label="זמני מניינים">
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={minyanTimes}
                  onChangeText={setMinyanTimes}
                  placeholder={'שחרית: 07:00, 08:00\nמנחה: שקיעה\nערבית: צאת'}
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlign="right"
                  textAlignVertical="top"
                />
              </Field>
            </>
          )}

          {category === 'mikveh' && (
            <>
              <Text style={styles.sectionTitle}>פרטי המקווה</Text>

              <Field label="סוג">
                <ChipSelector options={MIKVEH_OPTIONS} value={mikvehType} onChange={setMikvehType} />
              </Field>
            </>
          )}

          <Field label="הערות נוספות">
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={notes}
              onChangeText={setNotes}
              placeholder="כל מידע נוסף שיעזור לנו..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
              textAlign="right"
              textAlignVertical="top"
            />
          </Field>

          {/* Photos placeholder */}
          <Text style={styles.sectionTitle}>תמונות</Text>
          <View style={styles.photosPlaceholder}>
            <Ionicons name="camera-outline" size={28} color={theme.textMuted} />
            <Text style={styles.photosText}>העלאת תמונות תהיה זמינה בקרוב</Text>
          </View>

          <Pressable style={styles.primaryBtn} onPress={handleSubmit}>
            <Text style={styles.primaryBtnText}>שלח לבדיקה</Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}{required ? <Text style={{ color: theme.danger }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function ChipSelector({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.chips}>
      {options.map(opt => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(active ? '' : opt)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles((t) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: t.text,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  catBadgeText: { fontSize: 13, fontWeight: '700' },

  stepLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: t.text,
    textAlign: 'right',
    marginBottom: spacing.xl,
  },

  // Category grid
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  catCard: {
    width: '47%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 10,
  },
  catIconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Form
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: t.textMuted,
    textAlign: 'right',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  field: {
    marginBottom: spacing.md,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: t.text,
    textAlign: 'right',
  },
  input: {
    backgroundColor: t.surface,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: t.border,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    color: t.text,
    minHeight: sizes.control,
  },
  inputMulti: {
    minHeight: 90,
    paddingTop: 13,
  },

  // Chips
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: t.border,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: t.surface,
  },
  chipActive: {
    backgroundColor: t.primaryLight,
    borderColor: t.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: t.textMuted,
  },
  chipTextActive: {
    color: t.primary,
  },

  // Photos
  photosPlaceholder: {
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xl,
  },
  photosText: {
    fontSize: 13,
    color: t.textMuted,
    textAlign: 'center',
  },

  // Submit
  primaryBtn: {
    backgroundColor: t.primary,
    borderRadius: radius.pill,
    height: sizes.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: t.textInverse,
  },

  // Success
  successBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: t.text,
  },
  successSub: {
    fontSize: 16,
    color: t.textMuted,
    textAlign: 'center',
    lineHeight: 26,
  },
}));
