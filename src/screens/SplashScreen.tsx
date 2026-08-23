import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
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

  useEffect(() => {
    // Logo bounces in
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

    // Text slides up shortly after
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

    // After 2.5s navigate
    const navTimer = setTimeout(async () => {
      // A deep link (e.g. /place/:id) already pushed its destination on top of
      // this screen. Replacing here would throw the user's link away, so the
      // gating below only applies to a plain cold start.
      if ((navigation.getState()?.routes.length ?? 1) > 1) return;

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
    }, 2500);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(navTimer);
    };
  }, []);

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
