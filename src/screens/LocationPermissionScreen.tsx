import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSharedLocation } from '../context/LocationContext';
import { GeoPoint } from '../types';
import {
  canOpenLocationSettings,
  checkLocationPermission,
  getHostInfo,
  clearReloadState,
  getSettingsGuide,
  needsReloadAfterSettingsChange,
  openLocationSettings,
  reloadForSettingsChange,
  requestLocation,
  resolveLocationSilently,
  wasBlockedBeforeReload,
} from '../utils/locationPermission';
import { colors, radius, spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Phase = 'idle' | 'loading' | 'blocked' | 'retryable';

export function LocationPermissionScreen() {
  const navigation = useNavigation<Nav>();
  const { setGranted } = useSharedLocation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');

  const host = useMemo(() => getHostInfo(), []);
  const guide = useMemo(() => getSettingsGuide(host), [host]);
  const canJumpToSettings = useMemo(() => canOpenLocationSettings(host), [host]);
  const done = useRef(false);
  const hiddenAt = useRef(0);

  // Listeners outlive the render that created them, so keep a live copy.
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  // A reload we triggered ourselves lands back here; go straight to the guide
  // instead of making the user tap through the intro a second time.
  useEffect(() => {
    if (wasBlockedBeforeReload()) setPhase('blocked');
  }, []);

  const proceed = useCallback(
    (loc: GeoPoint) => {
      if (done.current) return;
      done.current = true;
      clearReloadState();
      setGranted(loc);
      // Small delay so the context update propagates before navigating.
      setTimeout(() => navigation.replace('Tabs', { screen: 'Home' }), 80);
    },
    [navigation, setGranted],
  );

  const skip = useCallback(() => {
    if (done.current) return;
    done.current = true;
    clearReloadState();
    navigation.replace('Tabs', { screen: 'Home' });
  }, [navigation]);

  /**
   * Not `async` on purpose: on iOS Safari the geolocation call has to fire
   * inside the tap handler itself, so any `await` before it loses the gesture.
   */
  const ask = useCallback(
    (opts?: { jumpToSettingsOnDenial?: boolean }) => {
      setPhase('loading');
      setMessage('');
      requestLocation().then((result) => {
        if (result.ok) {
          proceed(result.location);
          return;
        }
        if (result.reason === 'unsupported') {
          skip();
          return;
        }
        if (result.canAskAgain) {
          setPhase('retryable');
          setMessage(
            result.reason === 'timeout'
              ? 'לא הצלחנו לאתר את המיקום. ודא שהמיקום דלוק ונסה שוב.'
              : 'המיקום לא זמין כרגע. נסה שוב בעוד רגע.',
          );
          return;
        }
        // Dismissing the browser popup also reports "denied", but the decision
        // is still open — asking again re-opens the popup, so don't send
        // someone to the settings guide who never actually blocked us.
        checkLocationPermission().then((state) => {
          if (state === 'prompt') {
            setPhase('retryable');
            setMessage('הבקשה נסגרה בלי אישור. הקש שוב כדי לפתוח אותה מחדש.');
            return;
          }
          setPhase('blocked');
          setMessage('');
          // Genuinely blocked — hand the user straight to the right screen.
          if (opts?.jumpToSettingsOnDenial !== false) void openLocationSettings(host);
        });
      });
    },
    [host, proceed, skip],
  );

  const handleAllow = useCallback(() => ask(), [ask]);

  /**
   * "I changed it, check again". On iPhone asking in place is guaranteed to
   * fail — the page holds the old denial — so reload, which is the only thing
   * that makes iOS re-evaluate the permission.
   */
  const handleRetry = useCallback(() => {
    setPhase('loading');
    setMessage('');
    requestLocation().then((result) => {
      if (result.ok) {
        proceed(result.location);
        return;
      }
      if (needsReloadAfterSettingsChange(host) && reloadForSettingsChange()) return;
      setPhase('blocked');
      setMessage('המיקום עדיין חסום. ודא שההרשאה אושרה ונסה שוב.');
    });
  }, [host, proceed]);

  const handleOpenSettings = useCallback(() => {
    void openLocationSettings(host);
  }, [host]);

  /**
   * After returning from the settings app, continue automatically.
   *
   * `allowReload` is set only when the user really was away, because on iPhone
   * the page cannot see the new setting until it reloads — checking in place
   * would report the stale denial forever.
   */
  const recheck = useCallback(
    (opts?: { allowReload?: boolean }) => {
      if (done.current) return;
      resolveLocationSilently().then((loc) => {
        if (loc) {
          proceed(loc);
          return;
        }
        if (!opts?.allowReload || phaseRef.current !== 'blocked') return;
        if (!needsReloadAfterSettingsChange(host)) return;
        reloadForSettingsChange();
      });
    },
    [host, proceed],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recheck({ allowReload: true });
    });

    const cleanups: Array<() => void> = [() => sub.remove()];

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Coming back from the settings app surfaces differently per browser:
      // a visibility change, a bfcache restore, or nothing but a window focus.
      const onReturn = () => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        // A brief blur is not a trip to the settings app; only a real absence
        // justifies reloading the page out from under the user.
        const awayFor = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
        hiddenAt.current = 0;
        recheck({ allowReload: awayFor > 2000 });
      };
      const onHide = () => {
        if (document.visibilityState === 'hidden' && !hiddenAt.current) {
          hiddenAt.current = Date.now();
        }
      };
      document.addEventListener('visibilitychange', onHide);
      document.addEventListener('visibilitychange', onReturn);
      window.addEventListener('pageshow', onReturn);
      window.addEventListener('focus', onReturn);
      cleanups.push(() => {
        document.removeEventListener('visibilitychange', onHide);
        document.removeEventListener('visibilitychange', onReturn);
        window.removeEventListener('pageshow', onReturn);
        window.removeEventListener('focus', onReturn);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [recheck]);

  // Safety net: a browser can restore the page without firing any of the
  // events above, so while the guide is up we also poll quietly.
  useEffect(() => {
    if (phase !== 'blocked') return;
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      recheck();
    }, 4000);
    return () => clearInterval(id);
  }, [phase, recheck]);

  const loading = phase === 'loading';
  const primaryLabel = loading
    ? '⏳ מאתר אותך...'
    : phase === 'blocked'
      ? canJumpToSettings
        ? '⚙️ פתח הגדרות מיקום'
        : '📋 איך מפעילים מיקום'
      : phase === 'retryable'
        ? '🔄 נסה שוב'
        : '📍 אפשר גישה למיקום';

  const onPrimary =
    phase === 'blocked' && canJumpToSettings ? handleOpenSettings : handleAllow;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconBox}>
          <Ionicons
            name={phase === 'blocked' ? 'settings' : 'location'}
            size={52}
            color={colors.primary}
          />
        </View>

        <Text style={styles.title}>{phase === 'blocked' ? guide.title : 'מה יש סביבך?'}</Text>

        {phase === 'blocked' ? (
          <>
            <Text style={styles.subtitle}>
              {canJumpToSettings
                ? 'העברנו אותך להגדרות. אם המסך לא נפתח, בצע את השלבים הבאים:'
                : 'הדפדפן חוסם את המיקום. כך מפעילים אותו במכשיר שלך:'}
            </Text>
            <View style={styles.featureList}>
              {guide.steps.map((step, i) => (
                <View key={i} style={styles.step}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.guideNote}>{guide.footer}</Text>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              קרוב משתמש במיקומך כדי להציג לך בתי כנסת, מסעדות כשרות, מקוואות ועוד — הכי קרוב אליך
              ראשון.
            </Text>
            <View style={styles.featureList}>
              <Feature icon="navigate-outline" text="מיון לפי מרחק" />
              <Feature icon="restaurant-outline" text="מסעדות כשרות בקרבתך" />
              <Feature icon="business-outline" text="בתי כנסת קרובים" />
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.buttons}>
        {message ? <Text style={styles.errorText}>{message}</Text> : null}

        <PrimaryButton label={primaryLabel} onPress={onPrimary} disabled={loading} />

        {phase === 'blocked' && (
          <Pressable
            style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.7 }]}
            onPress={handleRetry}
          >
            <Text style={styles.btnSecondaryText}>ניסיתי — בדוק שוב</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.btnSkip, pressed && { opacity: 0.7 }]}
          onPress={skip}
        >
          <Text style={styles.btnSkipText}>אולי אחר כך</Text>
        </Pressable>

        <Text style={styles.note}>ניתן לשנות בכל עת בהגדרות הטלפון</Text>
      </View>
    </View>
  );
}

/**
 * On web this must be a real DOM button: iOS Safari only honours a
 * geolocation request that originates from a native click event.
 */
function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  if (Platform.OS === 'web') {
    return (
      <button
        onClick={onPress}
        disabled={disabled}
        style={
          {
            width: '100%',
            backgroundColor: disabled ? '#5a9e72' : '#1E7A46',
            border: 'none',
            borderRadius: 50,
            padding: '16px',
            cursor: disabled ? 'default' : 'pointer',
            fontFamily: 'inherit',
          } as any
        }
      >
        <Text style={styles.btnAllowText}>{label}</Text>
      </button>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.btnAllow, pressed && { opacity: 0.85 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.btnAllowText}>{label}</Text>
    </Pressable>
  );
}

function Feature({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 20,
  },
  iconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  featureList: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  buttons: {
    gap: 12,
    alignItems: 'center',
  },
  btnAllow: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnAllowText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  btnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  btnSkip: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  btnSkipText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    lineHeight: 20,
  },
  note: {
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
  },
  guideNote: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
});
