import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Chip } from '../components/Chip';
import { colors, radius, sizes, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { usePlace } from '../hooks/usePlace';
import { placesRepository } from '../data/placesRepository';
import { IssueType } from '../types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ReportRoute = RouteProp<RootStackParamList, 'Report'>;

const ISSUE_TYPES: IssueType[] = [
  'closed',
  'wrong_kosher',
  'wrong_details',
  'other',
];

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export function ReportScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<ReportRoute>();
  const { place } = usePlace(params.placeId);

  const [type, setType] = useState<IssueType>('closed');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<SubmitState>('idle');

  const submit = async () => {
    setState('submitting');
    try {
      await placesRepository.submitReport({
        placeId: params.placeId,
        type,
        details: details.trim() || undefined,
      });
      setState('success');
    } catch {
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <Screen padded>
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <Text style={styles.successTitle}>{t.report.successTitle}</Text>
          <Text style={styles.successBody}>{t.report.successBody}</Text>
          <Pressable
            style={styles.submitBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.submitText}>{t.report.back}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>{t.report.intro}</Text>

          <Field label={t.report.placeLabel}>
            <View style={styles.placeBox}>
              <Text style={styles.placeName}>{place?.name ?? '—'}</Text>
            </View>
          </Field>

          <Field label={t.report.typeLabel}>
            <View style={styles.chipsWrap}>
              {ISSUE_TYPES.map((it) => (
                <Chip
                  key={it}
                  label={t.report.types[it]}
                  selected={type === it}
                  onPress={() => setType(it)}
                />
              ))}
            </View>
          </Field>

          <Field label={t.report.detailsLabel}>
            <TextInput
              style={styles.textarea}
              placeholder={t.report.detailsPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={4}
              textAlign="right"
              textAlignVertical="top"
            />
          </Field>

          {state === 'error' && (
            <Text style={styles.errorText}>{t.report.errorBody}</Text>
          )}

          <Pressable
            style={[
              styles.submitBtn,
              state === 'submitting' && styles.submitDisabled,
            ]}
            onPress={submit}
            disabled={state === 'submitting'}
          >
            <Text style={styles.submitText}>
              {state === 'submitting' ? t.report.submitting : t.report.submit}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  intro: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.lg,
    lineHeight: 21,
  },
  field: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  placeBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  textarea: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    minHeight: 110,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    minHeight: sizes.button,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  successBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  successBody: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
