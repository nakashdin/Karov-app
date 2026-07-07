import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { PlaceSubmission } from './AddPlaceScreen';

const STORAGE_KEY = '@karov_submissions';

const CATEGORY_LABELS: Record<string, string> = {
  restaurant:    'מסעדה כשרה',
  synagogue:     'בית כנסת',
  mikveh:        'מקווה',
  chabad_house:  'בית חב״ד',
  tzaddik_grave: 'קבר צדיק',
};
const CATEGORY_ICONS: Record<string, string> = {
  restaurant:    'restaurant-outline',
  synagogue:     'business-outline',
  mikveh:        'water-outline',
  chabad_house:  'home-outline',
  tzaddik_grave: 'flower-outline',
};
const CATEGORY_COLOR: Record<string, string> = {
  restaurant:    colors.categoryRestaurant,
  synagogue:     colors.categorySynagogue,
  mikveh:        colors.categoryMikveh,
  chabad_house:  colors.chabad,
  tzaddik_grave: colors.tzaddik,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `לפני ${mins} דקות`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
}

export function CommunityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [submissions, setSubmissions] = useState<PlaceSubmission[]>([]);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY).then(raw => {
        setSubmissions(raw ? JSON.parse(raw) : []);
      });
    }, [])
  );

  return (
    <Screen padded>
      {/* Title */}
      <Text style={styles.title}>קהילה</Text>

      {/* Hero card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroEmoji}>🤝</Text>
        <Text style={styles.heroTitle}>ביחד שומרים על המידע מדויק</Text>
        <Text style={styles.heroSub}>
          כל משתמש יכול להוסיף מקום, לעדכן זמנים ולשתף פרטים.{'\n'}
          כך קרוב נשאר מעודכן ואמין.
        </Text>
      </View>

      {/* Add button */}
      <Pressable style={styles.addBtn} onPress={() => navigation.navigate('AddPlace')}>
        <Ionicons name="add-circle" size={22} color="#fff" />
        <Text style={styles.addBtnText}>הוסף מקום חדש</Text>
      </Pressable>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Submissions list */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {submissions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={44} color={colors.border} />
            <Text style={styles.emptyTitle}>עדיין אין הגשות</Text>
            <Text style={styles.emptySub}>היה הראשון להוסיף מקום לקהילה</Text>
          </View>
        ) : (
          <>
            <Text style={styles.listTitle}>ממתינות לאישור ({submissions.length})</Text>
            {submissions.map(sub => (
              <View key={sub.id} style={styles.card}>
                {/* Icon */}
                <View style={[styles.cardIcon, { backgroundColor: CATEGORY_COLOR[sub.category] + '18' }]}>
                  <Ionicons
                    name={CATEGORY_ICONS[sub.category] as any}
                    size={20}
                    color={CATEGORY_COLOR[sub.category]}
                  />
                </View>

                {/* Info */}
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>{sub.name}</Text>
                  <Text style={styles.cardMeta}>
                    {CATEGORY_LABELS[sub.category]} · {sub.city}
                  </Text>
                  <Text style={styles.cardTime}>{timeAgo(sub.submittedAt)}</Text>
                </View>

                {/* Status badge */}
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>ממתין</Text>
                </View>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  // Hero
  heroCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.primary + '30',
  },
  heroEmoji: { fontSize: 36, marginBottom: 4 },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 13,
    color: colors.primary + 'CC',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Add button
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginBottom: spacing.lg,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },

  divider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },

  // List
  listTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginBottom: 10,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },
  cardTime: {
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'right',
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textMuted,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textFaint,
    textAlign: 'center',
  },
});
