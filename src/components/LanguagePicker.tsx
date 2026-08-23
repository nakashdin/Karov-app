import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeStyles, radius, shadow, spacing, useTheme } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import type { Locale } from '../i18n';

interface Option {
  locale: Locale;
  flag: string;
  label: string;
  native: string;
}

const OPTIONS: Option[] = [
  { locale: 'he', flag: '🇮🇱', label: 'Hebrew',   native: 'עברית'   },
  { locale: 'en', flag: '🇺🇸', label: 'English',  native: 'English'  },
  { locale: 'es', flag: '🇪🇸', label: 'Spanish',  native: 'Español'  },
  { locale: 'ru', flag: '🇷🇺', label: 'Russian',  native: 'Русский'  },
  { locale: 'fr', flag: '🇫🇷', label: 'French',   native: 'Français' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LanguagePicker({ visible, onClose }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const { locale, setLocale } = useLanguage();

  const pick = async (l: Locale) => {
    onClose();
    if (l !== locale) {
      await setLocale(l);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>🌐 Language / שפה</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.text} />
          </Pressable>
        </View>

        {OPTIONS.map((opt) => {
          const active = opt.locale === locale;
          return (
            <Pressable
              key={opt.locale}
              style={({ pressed }) => [
                styles.row,
                active && styles.rowActive,
                pressed && styles.pressed,
              ]}
              onPress={() => pick(opt.locale)}
            >
              <Text style={styles.flag}>{opt.flag}</Text>
              <View style={styles.labelBlock}>
                <Text style={[styles.native, active && styles.nativeActive]}>
                  {opt.native}
                </Text>
                <Text style={styles.label}>{opt.label}</Text>
              </View>
              {active && (
                <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
              )}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: t.overlay,
  },
  sheet: {
    backgroundColor: t.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    ...shadow.card,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.surfaceMuted,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: t.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: t.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginVertical: 2,
  },
  rowActive: {
    backgroundColor: t.primaryLight,
  },
  pressed: {
    opacity: 0.75,
  },
  flag: {
    fontSize: 26,
  },
  labelBlock: {
    flex: 1,
  },
  native: {
    fontSize: 16,
    fontWeight: '700',
    color: t.text,
  },
  nativeActive: {
    color: t.primary,
  },
  label: {
    fontSize: 12,
    color: t.textMuted,
    marginTop: 1,
  },
}));
