import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSharedLocation } from '../context/LocationContext';
import { colors, radius, spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LocationPermissionScreen() {
  const navigation = useNavigation<Nav>();
  const { setGranted } = useSharedLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // This function is called ONLY from a direct button tap — required by iOS Safari
  const handleAllow = () => {
    if (!navigator.geolocation) {
      navigation.replace('Tabs', { screen: 'Home' });
      return;
    }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setGranted(loc);
        // Small delay so React state update propagates before navigation
        setTimeout(() => {
          navigation.replace('Tabs', { screen: 'Home' });
        }, 80);
      },
      () => {
        setLoading(false);
        setError('לא הצלחנו לקבל מיקום. בדוק הגדרות → פרטיות → שירותי מיקום → Safari');
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const handleSkip = () => {
    navigation.replace('Tabs', { screen: 'Home' });
  };

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <Ionicons name="location" size={52} color={colors.primary} />
        </View>

        <Text style={styles.title}>מה יש סביבך?</Text>
        <Text style={styles.subtitle}>
          קרוב משתמש במיקומך כדי להציג לך בתי כנסת, מסעדות כשרות, מקוואות ועוד — הכי קרוב אליך ראשון.
        </Text>

        <View style={styles.featureList}>
          <Feature icon="navigate-outline" text="מיון לפי מרחק" />
          <Feature icon="restaurant-outline" text="מסעדות כשרות בקרבתך" />
          <Feature icon="business-outline" text="בתי כנסת קרובים" />
        </View>
      </View>

      <View style={styles.buttons}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Native HTML button — iOS Safari requires direct user gesture for geolocation */}
        <button
          onClick={handleAllow}
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: loading ? '#5a9e72' : '#1E7A46',
            border: 'none',
            borderRadius: 50,
            padding: '16px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          } as any}
        >
          <Text style={styles.btnAllowText}>
            {loading ? '⏳ מאשר...' : '📍 אפשר גישה למיקום'}
          </Text>
        </button>

        <Pressable
          style={({ pressed }) => [styles.btnSkip, pressed && { opacity: 0.7 }]}
          onPress={handleSkip}
        >
          <Text style={styles.btnSkipText}>אולי אחר כך</Text>
        </Pressable>

        <Text style={styles.note}>ניתן לשנות בכל עת בהגדרות הטלפון</Text>
      </View>
    </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
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
  buttons: {
    gap: 12,
    alignItems: 'center',
  },
  btnAllowText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
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
});
