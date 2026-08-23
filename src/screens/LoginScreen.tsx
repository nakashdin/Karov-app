import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Logo } from '../components/Logo';
import { makeStyles, radius, shadowColor, spacing, useTheme } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { AUTH_KEY } from './SplashScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Mode = 'login' | 'register';

export function LoginScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<Nav>();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [error, setError] = useState('');

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('יש למלא אימייל וסיסמה');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('יש למלא שם');
      return;
    }
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    // TODO: replace with Supabase auth
    await AsyncStorage.setItem(
      AUTH_KEY,
      JSON.stringify({ email: email.trim(), name: name.trim() || email.split('@')[0], type: 'user' }),
    );
    navigation.replace('LocationPermission');
  };

  const handleGoogle = () => {
    // TODO: expo-auth-session Google OAuth
    setError('כניסה עם גוגל תהיה זמינה בקרוב');
  };

  const handleApple = () => {
    // TODO: expo-apple-authentication
    setError('כניסה עם אפל תהיה זמינה בקרוב');
  };

  const handleGuest = async () => {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ type: 'guest', name: 'אורח' }));
    navigation.replace('LocationPermission');
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
        {/* Hero */}
        <View style={styles.hero}>
          <Logo size={64} variant="dark" />
          <Text style={styles.heroName}>קרוב</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* Mode tabs */}
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => switchMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>כניסה</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => switchMode('register')}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>הרשמה</Text>
            </Pressable>
          </View>

          {/* Social buttons */}
          <View style={styles.socialRow}>
            <Pressable
              style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
              onPress={handleGoogle}
            >
              <Ionicons name="logo-google" size={18} color={theme.brand.google} />
              <Text style={styles.socialText}>Google</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
              onPress={handleApple}
            >
              <Ionicons name="logo-apple" size={20} color={theme.text} />
              <Text style={styles.socialText}>Apple</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>או עם אימייל</Text>
            <View style={styles.divLine} />
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            {mode === 'register' && (
              <TextInput
                style={[styles.input, focused === 'name' && styles.inputFocused]}
                placeholder="שם מלא"
                placeholderTextColor={theme.textFaint}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
                textAlign="right"
                returnKeyType="next"
              />
            )}
            <TextInput
              style={[styles.input, focused === 'email' && styles.inputFocused]}
              placeholder="כתובת אימייל"
              placeholderTextColor={theme.textFaint}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="right"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, focused === 'password' && styles.inputFocused]}
              placeholder="סיסמה (לפחות 6 תווים)"
              placeholderTextColor={theme.textFaint}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              secureTextEntry
              textAlign="right"
              textContentType={mode === 'register' ? 'newPassword' : 'password'}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {/* Error */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
            onPress={handleSubmit}
          >
            <Text style={styles.btnPrimaryText}>
              {mode === 'login' ? 'כניסה' : 'יצירת חשבון'}
            </Text>
          </Pressable>

          {/* Guest */}
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

const useStyles = makeStyles((t) => ({
  root: {
    flex: 1,
    backgroundColor: t.primaryDeep,
  },
  scroll: {
    flexGrow: 1,
  },

  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingBottom: 28,
    gap: 12,
  },
  heroName: {
    fontSize: 30,
    fontWeight: '800',
    color: t.textInverse,
    letterSpacing: -0.8,
  },

  card: {
    flex: 1,
    backgroundColor: t.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 14,
  },

  // ── Tabs ─────────────────────────────────────────────────
  tabs: {
    flexDirection: 'row',
    backgroundColor: t.background,
    borderRadius: radius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md - 2,
  },
  tabActive: {
    backgroundColor: t.surface,
    shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.textMuted,
  },
  tabTextActive: {
    color: t.text,
  },

  // ── Social ───────────────────────────────────────────────
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: t.border,
    borderRadius: radius.md,
    paddingVertical: 13,
    backgroundColor: t.surface,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.text,
  },

  // ── Divider ──────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  divLine: {
    flex: 1,
    height: 1,
    backgroundColor: t.border,
  },
  divText: {
    fontSize: 11,
    color: t.textFaint,
  },

  // ── Fields ───────────────────────────────────────────────
  fields: {
    gap: 10,
  },
  input: {
    backgroundColor: t.primaryLight,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: t.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: t.primary,
    backgroundColor: t.surface,
  },

  errorText: {
    fontSize: 13,
    color: t.danger,
    textAlign: 'center',
    marginTop: -4,
  },

  // ── Buttons ──────────────────────────────────────────────
  btnPrimary: {
    backgroundColor: t.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: t.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.82,
  },
  btnGuest: {
    borderWidth: 1.5,
    borderColor: t.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnGuestText: {
    fontSize: 15,
    fontWeight: '600',
    color: t.textMuted,
  },

  terms: {
    fontSize: 11,
    color: t.textFaint,
    textAlign: 'center',
    lineHeight: 17,
  },
}));
