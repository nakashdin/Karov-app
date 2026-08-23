import React from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GeoPoint } from '../types';
import { makeStyles, radius, shadow, spacing, useTheme } from '../theme';
import { openAppleMaps, openGoogleMaps, openWaze } from '../utils/navigation';

const isIOS =
  Platform.OS === 'ios' ||
  (Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent));

interface Props {
  visible: boolean;
  point: GeoPoint;
  label?: string;
  address?: string;
  onClose: () => void;
}

export function NavPickerModal({ visible, point, label, address, onClose }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const go = async (fn: () => Promise<void>) => {
    onClose();
    await fn();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>פתח ניווט ב…</Text>

          <Pressable style={styles.option} onPress={() => go(() => openWaze(point, label, address))}>
            <View style={[styles.appIcon, { backgroundColor: theme.brand.waze }]}>
              <Ionicons name="navigate" size={22} color={theme.textInverse} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionName}>Waze</Text>
              <Text style={styles.optionSub}>ניווט חי עם תנועה בזמן אמת</Text>
            </View>
            <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
          </Pressable>

          <Pressable style={styles.option} onPress={() => go(() => openGoogleMaps(point, label, address))}>
            <View style={[styles.appIcon, { backgroundColor: theme.brand.googleMaps }]}>
              <Ionicons name="map" size={22} color={theme.textInverse} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionName}>Google Maps</Text>
              <Text style={styles.optionSub}>מפות גוגל עם ניווט מפורט</Text>
            </View>
            <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
          </Pressable>

          {isIOS && (
            <Pressable style={styles.option} onPress={() => go(() => openAppleMaps(point, label, address))}>
              <View style={[styles.appIcon, { backgroundColor: theme.brand.appleMaps }]}>
                <Ionicons name="map-outline" size={22} color={theme.textInverse} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionName}>מפות Apple</Text>
                <Text style={styles.optionSub}>אפליקציית המפות המובנית של iPhone</Text>
              </View>
              <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
            </Pressable>
          )}

          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>ביטול</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  overlay: {
    flex: 1,
    backgroundColor: t.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: t.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 36,
    paddingTop: 10,
    paddingHorizontal: spacing.lg,
    ...shadow.card,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.border,
    alignSelf: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: t.text,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: t.border,
  },
  appIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionText: { flex: 1, alignItems: 'flex-end' },
  optionName: {
    fontSize: 16,
    fontWeight: '700',
    color: t.text,
    textAlign: 'right',
  },
  optionSub: {
    fontSize: 12,
    color: t.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: t.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: t.text,
  },
}));
