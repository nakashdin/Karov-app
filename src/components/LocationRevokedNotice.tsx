import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedLocation } from '../context/LocationContext';
import { navigationRef } from '../navigation/navigationRef';
import { colors, radius } from '../theme';

/** Onboarding routes already explain the permission — no banner on top of them. */
const SILENT_ROUTES = ['Splash', 'Login', 'LocationPermission'];

/**
 * Tells the user that location access stopped working — typically because they
 * switched it off in the settings app while the app was open, which no platform
 * notifies us about.
 */
export function LocationRevokedNotice() {
  const { status } = useSharedLocation();
  const insets = useSafeAreaInsets();
  const [route, setRoute] = useState<string | undefined>(undefined);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const sync = () => setRoute(navigationRef.getCurrentRoute()?.name);
    sync();
    const unsub = navigationRef.addListener('state', sync);
    return unsub;
  }, []);

  // A fresh revocation deserves to be seen again even if it was dismissed once.
  useEffect(() => {
    if (status === 'denied') setDismissed(false);
  }, [status]);

  if (status !== 'denied' || dismissed) return null;
  if (!route || SILENT_ROUTES.includes(route)) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [styles.banner, pressed && { opacity: 0.85 }]}
        onPress={() => navigationRef.navigate('LocationPermission')}
      >
        <Ionicons name="location-outline" size={18} color="#92400e" />
        <View style={styles.textWrap}>
          <Text style={styles.title}>שירותי המיקום כבויים</Text>
          <Text style={styles.body}>המרחקים לא מתעדכנים. הקש כדי להפעיל מחדש</Text>
        </View>
        <Pressable hitSlop={10} onPress={() => setDismissed(true)}>
          <Ionicons name="close" size={18} color="#92400e" />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 999,
    ...Platform.select({ web: { position: 'fixed' as any } }),
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e',
    textAlign: 'right',
  },
  body: {
    fontSize: 12,
    color: '#b45309',
    textAlign: 'right',
    marginTop: 1,
  },
});
