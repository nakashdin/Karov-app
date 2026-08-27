import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Logo } from '../components/Logo';
import { makeStyles } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { resolveLocationSilently } from '../utils/locationPermission';
import { setCachedLocation } from '../context/locationCache';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const AUTH_KEY = '@karov/auth';

export function SplashScreen() {
  const styles = useStyles();
  const navigation = useNavigation<Nav>();

  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(14)).current;

  // Purely presentational — plays once on mount regardless of how Splash was
  // reached. Routing (below) is a separate concern with its own timing.
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start();

    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(textY, {
          toValue: 0,
          tension: 120,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, 340);

    return () => clearTimeout(textTimer);
  }, []);

  const decideAndNavigate = useCallback(async () => {
    let auth: string | null = null;
    try {
      auth = await AsyncStorage.getItem(AUTH_KEY);
    } catch {
      // treat as unauthenticated
    }
    if (!auth) {
      navigation.replace('Login');
      return;
    }
    // Skip the permission screen if location is already available. Safari
    // cannot report the permission state, so this actually reads a position
    // rather than asking — on a short leash, since the splash waits on it.
    try {
      const loc = await resolveLocationSilently(2500);
      if (loc) {
        setCachedLocation(loc);
        navigation.replace('Tabs', { screen: 'Home' });
        return;
      }
    } catch {}
    navigation.replace('LocationPermission');
  }, [navigation]);

  // A deep link resolves to [Splash, target] (see linking.ts) so Back from the
  // target has somewhere to land — but that means Splash can regain focus
  // long after it first mounted, with the intro animation already finished.
  // Re-running the decision on every focus (not just once on mount) is what
  // makes that landing spot work instead of dead-ending on a splash that will
  // never move again — but a plain focus-count check would make EVERY return
  // trip replay the full 2.5s wait, which reads as a fresh hang each time.
  // What actually matters is wall-clock time since mount: once the intro has
  // had its full run, there is nothing left to wait for.
  // A lazy initializer, not a plain `Date.now()` call in the render body: the
  // latter is impure and runs on every re-render, not just mount.
  const [mountedAt] = useState(() => Date.now());
  const hasRunOnceRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // Something is pushed above Splash (the deep-link target) — stay put,
      // there is nothing to decide yet.
      if ((navigation.getState()?.routes.length ?? 1) > 1) return;

      const elapsedSinceMount = Date.now() - mountedAt;
      const delay = hasRunOnceRef.current ? 0 : Math.max(0, 2500 - elapsedSinceMount);
      const timer = setTimeout(() => {
        hasRunOnceRef.current = true;
        void decideAndNavigate();
      }, delay);

      return () => clearTimeout(timer);
    }, [navigation, decideAndNavigate, mountedAt]),
  );

  return (
    <View style={styles.container}>
      <Animated.View
        style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}
      >
        <Logo size={88} variant="dark" />
      </Animated.View>

      <Animated.View
        style={[
          styles.textGroup,
          { opacity: textOpacity, transform: [{ translateY: textY }] },
        ]}
      >
        <Text style={styles.appName}>קרוב</Text>
        <Text style={styles.tagline}>כל מה שיהודי צריך, קרוב אליך</Text>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.primaryDeep,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  textGroup: {
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontSize: 38,
    fontWeight: '800',
    color: t.textInverse,
    letterSpacing: -1,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 13,
    color: t.overlayLight,
    textAlign: 'center',
    lineHeight: 20,
  },
}));
