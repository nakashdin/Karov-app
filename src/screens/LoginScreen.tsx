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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Logo } from '../components/Logo';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { AUTH_KEY } from './SplashScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    // TODO: replace with Supabase auth when configured
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ email: email.trim(), type: 'user' }));
    navigation.replace('Tabs', { screen: 'Home' });
  };

  const handleGuest = async () => {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ type: 'guest' }));
    navigation.replace('Tabs', { screen: 'Home' });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top green hero */}
        <View style={styles.hero}>
          <Logo size={64} variant="dark" />
          <Text style={styles.heroName}>קרוב</Text>
        </View>

        {/* White card */}
        <View style={styles.card}>
          <Text style={styles.greeting}>שלום 👋</Text>
          <Text style={styles.sub}>היכנס לחשבון שלך</Text>

          <View style={styles.fields}>
            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused]}
              placeholder="כתובת אימייל"
              placeholderTextColor={colors.textFaint}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="right"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, passwordFocused && styles.inputFocused]}
              placeholder="סיסמה"
              placeholderTextColor={colors.textFaint}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry
              textAlign="right"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
            onPress={handleLogin}
          >
            <Text style={styles.btnPrimaryText}>כניסה</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>או</Text>
            <View style={styles.divLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.btnGuest, pressed && styles.pressed]}
            onPress={handleGuest}
          >
            <Text style={styles.btnGuestText}>המשך כאורח</Text>
          </Pressable>

          <Text style={styles.terms}>
            בכניסה אתה מסכים לתנאי השימוש ומדיניות הפרטיות
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F3D22',
  },
  scroll: {
    flexGrow: 1,
  },

  // ── Hero ─────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 32,
    gap: 12,
  },
  heroName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },

  // ── Card ─────────────────────────────────────────────────
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 14,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    marginBottom: 0,
  },
  sub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: -6,
  },

  // ── Fields ───────────────────────────────────────────────
  fields: {
    gap: 10,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#F0F5F1',
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },

  // ── Buttons ──────────────────────────────────────────────
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnPrimaryText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.82,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  divText: {
    fontSize: 12,
    color: colors.textFaint,
  },

  btnGuest: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnGuestText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },

  terms: {
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
  },
});
