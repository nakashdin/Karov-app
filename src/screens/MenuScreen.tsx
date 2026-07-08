import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguagePicker } from '../components/LanguagePicker';
import { colors, radius, shadow, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';

const CONTACT_EMAIL = 'karov.app@gmail.com';
const DONATION_URL = 'https://karov.app/donate';
const SHARE_URL = 'https://karov.app';

export function MenuScreen() {
  const { t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);

  const rows = [
    {
      key: 'contact',
      icon: 'mail-outline' as const,
      label: t.menu.contact,
      onPress: () => Linking.openURL(`mailto:${CONTACT_EMAIL}`),
    },
    {
      key: 'donate',
      icon: 'heart-outline' as const,
      label: t.menu.donate,
      onPress: () => Linking.openURL(DONATION_URL),
    },
    {
      key: 'share',
      icon: 'share-social-outline' as const,
      label: t.menu.share,
      onPress: () =>
        Share.share({ message: `${t.menu.shareMessage} ${SHARE_URL}` }),
    },
    {
      key: 'about',
      icon: 'information-circle-outline' as const,
      label: t.menu.about,
      onPress: () =>
        Alert.alert('קרוב', 'גרסה 1.0\nכל מה שיהודי צריך, קרוב אליך.'),
    },
    {
      key: 'language',
      icon: 'globe-outline' as const,
      label: t.menu.language,
      onPress: () => setLangOpen(true),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{t.menu.title}</Text>

        {rows.map((row, idx) => (
          <Pressable
            key={row.key}
            style={({ pressed }) => [
              styles.row,
              pressed && styles.pressed,
              idx < rows.length - 1 && styles.rowBorder,
            ]}
            onPress={row.onPress}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={row.icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.label}>{row.label}</Text>
            <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>

      <LanguagePicker visible={langOpen} onClose={() => setLangOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sheet: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    ...shadow.card,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceMuted,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
