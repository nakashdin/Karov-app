import React, { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeStyles, radius, shadow, spacing, useTheme } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SuggestEditPayload {
  placeId: string;
  placeName: string;
  fieldType: FieldType;
  content: string;
  submitterName?: string;
}

type FieldType =
  | 'hours'
  | 'phone'
  | 'kosher'
  | 'address'
  | 'website'
  | 'other';

const FIELD_OPTIONS: { key: FieldType; label: string; icon: string }[] = [
  { key: 'hours',   label: 'שעות פתיחה',  icon: 'time-outline' },
  { key: 'phone',   label: 'טלפון',        icon: 'call-outline' },
  { key: 'kosher',  label: 'כשרות',        icon: 'shield-checkmark-outline' },
  { key: 'address', label: 'כתובת',        icon: 'location-outline' },
  { key: 'website', label: 'אתר אינטרנט', icon: 'globe-outline' },
  { key: 'other',   label: 'אחר',          icon: 'create-outline' },
];

// ─── Submit (swap this out when Supabase is ready) ────────────────────────────

const ADMIN_EMAIL = 'nakashdin@gmail.com';

async function submitSuggestion(payload: SuggestEditPayload): Promise<void> {
  const subject = encodeURIComponent(
    `[קרוב] עדכון מהקהילה — ${payload.placeName}`,
  );
  const fieldLabel = FIELD_OPTIONS.find((f) => f.key === payload.fieldType)?.label ?? payload.fieldType;
  const body = encodeURIComponent(
    [
      `מקום: ${payload.placeName}`,
      `מזהה: ${payload.placeId}`,
      `סוג שדה: ${fieldLabel}`,
      `תוכן: ${payload.content}`,
      payload.submitterName ? `שם המגיש: ${payload.submitterName}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  await Linking.openURL(`mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  placeId: string;
  placeName: string;
  onClose: () => void;
}

export function SuggestEditModal({ visible, placeId, placeName, onClose }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [fieldType, setFieldType] = useState<FieldType>('hours');
  const [content, setContent] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');

  const reset = () => {
    setFieldType('hours');
    setContent('');
    setSubmitterName('');
    setStatus('idle');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setStatus('sending');
    try {
      await submitSuggestion({ placeId, placeName, fieldType, content: content.trim(), submitterName: submitterName.trim() || undefined });
      setStatus('done');
    } catch {
      setStatus('idle');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>עדכון מהקהילה</Text>
          <Pressable onPress={handleClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          עוזרים לנו לשפר את הכרטיסייה של{' '}
          <Text style={styles.placeName}>{placeName}</Text>
        </Text>

        {status === 'done' ? (
          <View style={styles.doneBox}>
            <Text style={styles.doneEmoji}>🙏</Text>
            <Text style={styles.doneTitle}>תודה!</Text>
            <Text style={styles.doneSub}>הצעתך התקבלה ותיבדק בהקדם.</Text>
            <Pressable style={styles.doneBtn} onPress={handleClose}>
              <Text style={styles.doneBtnText}>סגור</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Field type selector */}
            <Text style={styles.sectionLabel}>מה תרצה לעדכן?</Text>
            <View style={styles.chips}>
              {FIELD_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[styles.chip, fieldType === opt.key && styles.chipActive]}
                  onPress={() => setFieldType(opt.key)}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={14}
                    color={fieldType === opt.key ? theme.textInverse : theme.textMuted}
                  />
                  <Text style={[styles.chipText, fieldType === opt.key && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Content */}
            <Text style={styles.sectionLabel}>הפרטים</Text>
            <TextInput
              style={styles.textarea}
              placeholder="לדוגמה: א׳-ה׳ 08:00–22:00, שישי עד 14:00"
              placeholderTextColor={theme.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
              textAlign="right"
            />

            {/* Name (optional) */}
            <Text style={styles.sectionLabel}>שמך (אופציונלי)</Text>
            <TextInput
              style={styles.input}
              placeholder="ישראל ישראלי"
              placeholderTextColor={theme.textMuted}
              value={submitterName}
              onChangeText={setSubmitterName}
              textAlign="right"
            />

            {/* Submit */}
            <Pressable
              style={[styles.submitBtn, (!content.trim() || status === 'sending') && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!content.trim() || status === 'sending'}
            >
              <Ionicons name="paper-plane-outline" size={18} color={theme.textInverse} />
              <Text style={styles.submitText}>
                {status === 'sending' ? 'שולח...' : 'שלח לאישור'}
              </Text>
            </Pressable>

            <Text style={styles.disclaimer}>
              ההגשה נשלחת לבדיקת הצוות לפני פרסום
            </Text>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: t.overlay,
  },
  sheet: {
    backgroundColor: t.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '85%',
    ...shadow.raised,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.border,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: t.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: t.textMuted,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  placeName: {
    fontWeight: '700',
    color: t.text,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: t.textMuted,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },

  // ── Field type chips ──────────────────────────────────────
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    justifyContent: 'flex-end',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: t.surface,
    borderWidth: 1.5,
    borderColor: t.border,
  },
  chipActive: {
    backgroundColor: t.primary,
    borderColor: t.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: t.textMuted,
  },
  chipTextActive: {
    color: t.textInverse,
  },

  // ── Inputs ───────────────────────────────────────────────
  textarea: {
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: t.border,
    padding: spacing.md,
    fontSize: 15,
    color: t.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: t.border,
    padding: spacing.md,
    fontSize: 15,
    color: t.text,
    height: 48,
    marginBottom: spacing.lg,
  },

  // ── Submit ───────────────────────────────────────────────
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: t.primary,
    borderRadius: radius.pill,
    height: 52,
    marginBottom: spacing.md,
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: t.textInverse,
  },
  disclaimer: {
    fontSize: 12,
    color: t.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  // ── Done state ───────────────────────────────────────────
  doneBox: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  doneEmoji: { fontSize: 48 },
  doneTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: t.text,
  },
  doneSub: {
    fontSize: 15,
    color: t.textMuted,
    textAlign: 'center',
  },
  doneBtn: {
    marginTop: spacing.md,
    backgroundColor: t.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: t.textInverse,
  },
}));
