import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { makeStyles, mix, radius, sizes, spacing, useTheme } from '../theme';
import type { Tokens } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'restaurant' | 'synagogue' | 'mikveh' | 'chabad_house' | 'tzaddik_grave';
type Step = 'category' | 'details' | 'success';

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

const KASHRUT_OPTIONS  = ['מהדרין', 'רגיל', 'חלבי', 'בשרי', 'פרווה'];
const NUSACH_OPTIONS   = ['אשכנז', 'ספרד', 'עדות המזרח', 'חסידי', 'תימני'];
const MIKVEH_OPTIONS   = ['גברים', 'נשים', 'גברים ונשים'];

interface Submission {
  id: string;
  category: Category;
  name: string;
  address: string;
  city: string;
  phone: string;
  hours: string;
  notes: string;
  kashrut?: string;
  kashrutAuthority?: string;
  nusach?: string;
  minyanTimes?: string;
  mikvehType?: string;
  submittedAt: string;
  status: 'pending';
}

const STORAGE_KEY = '@karov_submissions';

const CATEGORY_LABELS: Record<Category, string> = {
  restaurant:    'מסעדה כשרה',
  synagogue:     'בית כנסת',
  mikveh:        'מקווה',
  chabad_house:  'בית חב״ד',
  tzaddik_grave: 'קבר צדיק',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `לפני ${mins} דקות`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  return `לפני ${Math.floor(hours / 24)} ימים`;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function CommunityScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const [modalOpen, setModalOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY).then(raw => {
        setSubmissions(raw ? JSON.parse(raw) : []);
      });
    }, [])
  );

  const handleSubmitted = (sub: Submission) => {
    setSubmissions(prev => [sub, ...prev]);
  };

  const openModal = () => { setFormKey(k => k + 1); setModalOpen(true); };

  return (
    <View style={{ flex: 1 }}><Screen padded>
      <Text style={styles.title}>קהילה</Text>

      {/* Hero */}
      <View style={styles.heroCard}>
        <Text style={styles.heroEmoji}>🤝</Text>
        <Text style={styles.heroTitle}>ביחד שומרים על המידע מדויק</Text>
        <Text style={styles.heroSub}>
          כל משתמש יכול להוסיף מקום, לעדכן זמנים ולשתף פרטים.{'\n'}
          כך קרוב נשאר מעודכן ואמין.
        </Text>
      </View>

      {/* CTA */}
      <Pressable style={styles.addBtn} onPress={openModal}>
        <Ionicons name="add-circle" size={22} color={theme.textInverse} />
        <Text style={styles.addBtnText}>הוסף מקום חדש</Text>
      </Pressable>

      <View style={styles.divider} />

      {/* Submissions list */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {submissions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={44} color={theme.border} />
            <Text style={styles.emptyTitle}>עדיין אין הגשות</Text>
            <Text style={styles.emptySub}>היה הראשון להוסיף מקום לקהילה</Text>
          </View>
        ) : (
          <>
            <Text style={styles.listLabel}>ממתינות לאישור ({submissions.length})</Text>
            {submissions.map(sub => {
              const cat = categoriesFor(theme).find(c => c.key === sub.category)!;
              return (
                <View key={sub.id} style={styles.card}>
                  <View style={[styles.cardIcon, { backgroundColor: cat.bg }]}>
                    <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName}>{sub.name}</Text>
                    <Text style={styles.cardMeta}>{CATEGORY_LABELS[sub.category]} · {sub.city}</Text>
                    <Text style={styles.cardTime}>{timeAgo(sub.submittedAt)}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>ממתין</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

    </Screen>

      {/* Add place overlay (avoids RN Modal web issues) */}
      {modalOpen && (
        <AddPlaceModal
          key={formKey}
          onClose={() => setModalOpen(false)}
          onSubmitted={handleSubmitted}
        />
      )}
    </View>
  );
}

// ─── Add Place Modal ──────────────────────────────────────────────────────────

function AddPlaceModal({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: (sub: Submission) => void;
}) {
  const theme = useTheme();
  const styles = useStyles();
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<Category | null>(null);

  const [name, setName]                   = useState('');
  const [address, setAddress]             = useState('');
  const [city, setCity]                   = useState('');
  const [phone, setPhone]                 = useState('');
  const [hours, setHours]                 = useState('');
  const [notes, setNotes]                 = useState('');
  const [kashrut, setKashrut]             = useState('');
  const [kashrutAuth, setKashrutAuth]     = useState('');
  const [nusach, setNusach]               = useState('');
  const [minyanTimes, setMinyanTimes]     = useState('');
  const [mikvehType, setMikvehType]       = useState('');

  const resetAndClose = () => {
    setStep('category'); setCategory(null);
    setName(''); setAddress(''); setCity(''); setPhone('');
    setHours(''); setNotes(''); setKashrut(''); setKashrutAuth('');
    setNusach(''); setMinyanTimes(''); setMikvehType('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || !address.trim() || !city.trim()) {
      Alert.alert('שדות חסרים', 'אנא מלא שם, כתובת ועיר');
      return;
    }
    const sub: Submission = {
      id: `sub_${Date.now()}`,
      category: category!,
      name: name.trim(), address: address.trim(), city: city.trim(),
      phone: phone.trim(), hours: hours.trim(), notes: notes.trim(),
      kashrut: kashrut || undefined,
      kashrutAuthority: kashrutAuth || undefined,
      nusach: nusach || undefined,
      minyanTimes: minyanTimes || undefined,
      mikvehType: mikvehType || undefined,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing: Submission[] = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([sub, ...existing]));
    onSubmitted(sub);
    setStep('success');
  };

  const selectedCat = categoriesFor(theme).find(c => c.key === category);

  return (
    <View style={styles.modalBackdrop}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalSheet}
      >
        <View>
          {/* ── Success ── */}
          {step === 'success' && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={72} color={theme.primary} />
              <Text style={styles.successTitle}>תודה רבה!</Text>
              <Text style={styles.successSub}>
                ההגשה נשמרה ותעבור בדיקה לפני שתתווסף לאפליקציה.
              </Text>
              <Pressable style={styles.primaryBtn} onPress={resetAndClose}>
                <Text style={styles.primaryBtnText}>סגור</Text>
              </Pressable>
            </View>
          )}

          {/* ── Category picker ── */}
          {step === 'category' && (
            <>
              <ModalHeader title="הוספת מקום" onClose={resetAndClose} />
              <ScrollView contentContainerStyle={styles.modalBody}>
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
              </ScrollView>
            </>
          )}

          {/* ── Details form ── */}
          {step === 'details' && selectedCat && (
            <>
              <ModalHeader
                title={selectedCat.label}
                onClose={resetAndClose}
                onBack={() => setStep('category')}
                color={selectedCat.color}
                icon={selectedCat.icon}
              />
              <ScrollView
                contentContainerStyle={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Common fields */}
                <SectionTitle>פרטים כלליים</SectionTitle>

                <Field label="שם המקום" required>
                  <TextInput style={styles.input} value={name} onChangeText={setName}
                    placeholder="למשל: מסעדת הכרמל" placeholderTextColor={theme.textMuted} textAlign="right" />
                </Field>

                <Field label="כתובת" required>
                  <TextInput style={styles.input} value={address} onChangeText={setAddress}
                    placeholder="רחוב ומספר" placeholderTextColor={theme.textMuted} textAlign="right" />
                </Field>

                <Field label="עיר" required>
                  <TextInput style={styles.input} value={city} onChangeText={setCity}
                    placeholder="שם העיר" placeholderTextColor={theme.textMuted} textAlign="right" />
                </Field>

                <Field label="טלפון">
                  <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                    placeholder="05X-XXXXXXX" placeholderTextColor={theme.textMuted}
                    keyboardType="phone-pad" textAlign="right" />
                </Field>

                <Field label="שעות פתיחה">
                  <TextInput style={[styles.input, styles.inputMulti]} value={hours} onChangeText={setHours}
                    placeholder={'א׳–ה׳ 08:00–22:00\nו׳ 08:00–15:00'} placeholderTextColor={theme.textMuted}
                    multiline numberOfLines={3} textAlign="right" textAlignVertical="top" />
                </Field>

                {/* Restaurant */}
                {category === 'restaurant' && (
                  <>
                    <SectionTitle>כשרות</SectionTitle>
                    <Field label="רמת כשרות">
                      <ChipSelector options={KASHRUT_OPTIONS} value={kashrut} onChange={setKashrut} />
                    </Field>
                    <Field label="גוף מכשיר">
                      <TextInput style={styles.input} value={kashrutAuth} onChangeText={setKashrutAuth}
                        placeholder="למשל: בד״ץ העדה החרדית" placeholderTextColor={theme.textMuted} textAlign="right" />
                    </Field>
                  </>
                )}

                {/* Synagogue */}
                {category === 'synagogue' && (
                  <>
                    <SectionTitle>פרטי בית הכנסת</SectionTitle>
                    <Field label="נוסח">
                      <ChipSelector options={NUSACH_OPTIONS} value={nusach} onChange={setNusach} />
                    </Field>
                    <Field label="זמני מניינים">
                      <TextInput style={[styles.input, styles.inputMulti]} value={minyanTimes} onChangeText={setMinyanTimes}
                        placeholder={'שחרית: 07:00, 08:00\nמנחה: שקיעה\nערבית: צאת'} placeholderTextColor={theme.textMuted}
                        multiline numberOfLines={3} textAlign="right" textAlignVertical="top" />
                    </Field>
                  </>
                )}

                {/* Mikveh */}
                {category === 'mikveh' && (
                  <>
                    <SectionTitle>פרטי המקווה</SectionTitle>
                    <Field label="סוג">
                      <ChipSelector options={MIKVEH_OPTIONS} value={mikvehType} onChange={setMikvehType} />
                    </Field>
                  </>
                )}

                <Field label="הערות נוספות">
                  <TextInput style={[styles.input, styles.inputMulti]} value={notes} onChangeText={setNotes}
                    placeholder="כל מידע נוסף שיעזור לנו..." placeholderTextColor={theme.textMuted}
                    multiline numberOfLines={3} textAlign="right" textAlignVertical="top" />
                </Field>

                {/* Photos placeholder */}
                <SectionTitle>תמונות</SectionTitle>
                <View style={styles.photosPlaceholder}>
                  <Ionicons name="camera-outline" size={26} color={theme.textMuted} />
                  <Text style={styles.photosText}>העלאת תמונות — בקרוב</Text>
                </View>

                <Pressable style={styles.primaryBtn} onPress={handleSubmit}>
                  <Text style={styles.primaryBtnText}>שלח לבדיקה</Text>
                </Pressable>
                <View style={{ height: 40 }} />
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function ModalHeader({ title, onClose, onBack, color, icon }: {
  title: string; onClose: () => void; onBack?: () => void;
  color?: string; icon?: string;
}) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.modalHeader}>
      <Pressable onPress={onClose} hitSlop={10}>
        <Ionicons name="close" size={22} color={theme.textMuted} />
      </Pressable>
      <View style={styles.modalHeaderCenter}>
        {icon && color && (
          <Ionicons name={icon as any} size={16} color={color} style={{ marginRight: 5 }} />
        )}
        <Text style={[styles.modalHeaderTitle, color ? { color } : {}]}>{title}</Text>
      </View>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10}>
          <Ionicons name="chevron-forward" size={22} color={theme.primary} />
        </Pressable>
      ) : (
        <View style={{ width: 22 }} />
      )}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const styles = useStyles();
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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
          <Pressable key={opt} style={[styles.chip, active && styles.chipActive]} onPress={() => onChange(active ? '' : opt)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles((t) => ({
  // Screen
  title: {
    fontSize: 30, fontWeight: '800', color: t.text,
    textAlign: 'right', paddingTop: spacing.md, paddingBottom: spacing.lg,
  },
  heroCard: {
    backgroundColor: t.primaryLight, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center', gap: 6,
    marginBottom: spacing.lg, borderWidth: 0.5, borderColor: t.primary + '30',
  },
  heroEmoji: { fontSize: 36, marginBottom: 4 },
  heroTitle: { fontSize: 17, fontWeight: '800', color: t.primary, textAlign: 'center' },
  heroSub: { fontSize: 13, color: t.primary + 'CC', textAlign: 'center', lineHeight: 20 },
  addBtn: {
    backgroundColor: t.primary, borderRadius: radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, marginBottom: spacing.lg,
  },
  addBtnText: { fontSize: 16, fontWeight: '800', color: t.textInverse },
  divider: { height: 0.5, backgroundColor: t.border, marginBottom: spacing.lg },

  // List
  listLabel: { fontSize: 13, fontWeight: '700', color: t.textMuted, textAlign: 'right', marginBottom: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 0.5, borderColor: t.border, marginBottom: 10,
  },
  cardIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: t.text, textAlign: 'right' },
  cardMeta: { fontSize: 12, color: t.textMuted, textAlign: 'right', marginTop: 2 },
  cardTime: { fontSize: 11, color: t.textFaint, textAlign: 'right', marginTop: 2 },
  pendingBadge: { backgroundColor: t.warningSurface, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  pendingText: { fontSize: 11, fontWeight: '700', color: t.warningText },

  // Empty
  empty: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: t.textMuted },
  emptySub: { fontSize: 13, color: t.textFaint, textAlign: 'center' },

  // Modal overlay
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: t.overlay,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  modalSheet: {
    backgroundColor: t.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%', minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 0.5, borderBottomColor: t.border,
  },
  modalHeaderCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  modalHeaderTitle: { fontSize: 17, fontWeight: '800', color: t.text },
  modalBody: { padding: spacing.lg },

  // Category grid
  stepLabel: { fontSize: 18, fontWeight: '800', color: t.text, textAlign: 'right', marginBottom: spacing.lg },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  catCard: {
    width: '47%', borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.lg, alignItems: 'center', gap: 10,
  },
  catIconBox: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center' },

  // Form
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: t.textMuted, textAlign: 'right',
    marginTop: spacing.xl, marginBottom: spacing.sm, letterSpacing: 0.5,
  },
  field: { marginBottom: spacing.md, gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: t.text, textAlign: 'right' },
  input: {
    backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 0.5,
    borderColor: t.border, paddingVertical: 13, paddingHorizontal: 14,
    fontSize: 15, color: t.text, minHeight: sizes.control,
  },
  inputMulti: { minHeight: 88, paddingTop: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  chip: {
    borderRadius: radius.pill, borderWidth: 1, borderColor: t.border,
    paddingVertical: 7, paddingHorizontal: 14, backgroundColor: t.surface,
  },
  chipActive: { backgroundColor: t.primaryLight, borderColor: t.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: t.textMuted },
  chipTextActive: { color: t.primary },
  photosPlaceholder: {
    backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: t.border, borderStyle: 'dashed', padding: spacing.xl,
    alignItems: 'center', gap: 8, marginBottom: spacing.xl,
  },
  photosText: { fontSize: 13, color: t.textMuted },
  primaryBtn: {
    backgroundColor: t.primary, borderRadius: radius.pill,
    height: sizes.button, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: t.textInverse },

  // Success
  successBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: spacing.xl, minHeight: 400 },
  successTitle: { fontSize: 28, fontWeight: '800', color: t.text },
  successSub: { fontSize: 15, color: t.textMuted, textAlign: 'center', lineHeight: 24 },
}));
