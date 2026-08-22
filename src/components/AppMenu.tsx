import React, { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LanguagePicker } from './LanguagePicker';
import { AboutModal } from './AboutModal';
import { colors, radius, shadow, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';

const CONTACT_EMAIL = 'karov.app@gmail.com';

// karov.app is a different product on Firebase — sharing it sent users to
// someone else's app. This is ours; change it here if a custom domain lands.
const APP_URL = 'https://karov-eta.vercel.app';
const DONATION_URL = `${APP_URL}/donate`;
const SHARE_URL = APP_URL;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AppMenu({ visible, onClose }: Props) {
  const { t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const openLang = () => {
    onClose();
    setTimeout(() => setLangOpen(true), 300);
  };

  const openAbout = () => {
    onClose();
    setTimeout(() => setAboutOpen(true), 300);
  };

  const rows = [
    {
      key: 'contact',
      icon: 'mail-outline' as const,
      label: t.menu.contact,
      onPress: () => { onClose(); Linking.openURL(`mailto:${CONTACT_EMAIL}`); },
    },
    {
      key: 'donate',
      icon: 'heart-outline' as const,
      label: t.menu.donate,
      onPress: () => { onClose(); Linking.openURL(DONATION_URL); },
    },
    {
      key: 'share',
      icon: 'share-social-outline' as const,
      label: t.menu.share,
      onPress: () => { onClose(); Share.share({ message: `${t.menu.shareMessage} ${SHARE_URL}` }); },
    },
    {
      key: 'about',
      icon: 'information-circle-outline' as const,
      label: t.menu.about,
      onPress: openAbout,
    },
    {
      key: 'language',
      icon: 'globe-outline' as const,
      label: t.menu.language,
      onPress: openLang,
    },
  ];

  return (
    <>
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
            <Text style={styles.title}>{t.menu.title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

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
      </Modal>

      <LanguagePicker visible={langOpen} onClose={() => setLangOpen(false)} />
      <AboutModal visible={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surfaceMuted,
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
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
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
