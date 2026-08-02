import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSharedLocation } from '../../context/LocationContext';
import { zmanim as calcZmanim } from '../../utils/zmanim';
import { colors, radius, shadow, spacing } from '../../theme';
import { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function minsToHHMM(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = Math.round(m % 60);
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function minsLeft(targetMins: number): number {
  const n = new Date();
  return targetMins - (n.getHours() * 60 + n.getMinutes());
}

function fmtCountdown(totalMins: number): string {
  if (totalMins <= 0) return '00:00';
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}`;
}

export function TodayCard() {
  const { location } = useSharedLocation();
  const navigation = useNavigation<Nav>();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  let countdownLabel = 'שקיעה בעוד';
  let countdownValue = '--:--';
  let timesLine = 'הפעל מיקום לזמנים מדויקים';
  let minchaStr = '--:--';
  let isNight = hour >= 20 || hour < 6;

  if (location) {
    const z = calcZmanim(now, location);
    if (z) {
      const sunsetStr = minsToHHMM(z.sunset);
      const nightfallStr = minsToHHMM(z.nightfall);
      minchaStr = minsToHHMM(Math.round(z.sunset - 30));
      isNight = minsLeft(z.sunset) <= 0;

      if (day === 6) {
        const left = minsLeft(z.nightfall);
        countdownLabel = 'צאת שבת בעוד';
        countdownValue = left > 0 ? fmtCountdown(left) : '✓';
        timesLine = `שקיעה: ${sunsetStr} • צאת הכוכבים: ${nightfallStr}`;
      } else if (day === 5) {
        const left = minsLeft(z.candleLighting);
        countdownLabel = left > 0 ? 'כניסת שבת בעוד' : 'שבת נכנסת';
        countdownValue = left > 0 ? fmtCountdown(left) : '--';
        timesLine = `הדלקת נרות: ${minsToHHMM(z.candleLighting)} • צאת שבת: ${nightfallStr}`;
      } else {
        const leftSunset = minsLeft(z.sunset);
        const leftNightfall = minsLeft(z.nightfall);
        if (leftSunset > 0) {
          countdownLabel = 'שקיעה בעוד';
          countdownValue = fmtCountdown(leftSunset);
        } else if (leftNightfall > 0) {
          countdownLabel = 'צאת הכוכבים בעוד';
          countdownValue = fmtCountdown(leftNightfall);
        } else {
          countdownLabel = 'לילה טוב';
          countdownValue = '🌙';
        }
        timesLine = `שקיעה: ${sunsetStr} • צאת הכוכבים: ${nightfallStr}`;
      }
    }
  }

  const illustBg = day === 6 ? '#F5F0E8' : isNight ? '#1E2A4A' : '#FFF8E6';
  const illustEmoji = day === 6 ? '🕯' : isNight ? '🌙' : '☀️';

  return (
    <View style={styles.card}>
      {/* Main row: illustration (left) | text (right) */}
      <View style={styles.mainRow}>
        {/* Left side — illustration */}
        <View style={[styles.illustration, { backgroundColor: illustBg }]}>
          <Text style={styles.illustEmoji}>{illustEmoji}</Text>
        </View>

        {/* Right side — countdown info */}
        <View style={styles.textContent}>
          <View style={styles.labelRow}>
            <Text style={styles.cardLabel}>היום שלך</Text>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          </View>
          <Text style={styles.countdownLabel}>{countdownLabel}</Text>
          <Text style={styles.countdown}>{countdownValue}</Text>
          <Text style={styles.timesLine} numberOfLines={1}>{timesLine}</Text>
        </View>
      </View>

      {/* Bottom chips */}
      <View style={styles.chipsRow}>
        {/* Mincha — rightmost in RTL */}
        <View style={styles.chip}>
          <Ionicons name="people-outline" size={12} color={colors.categorySynagogue} />
          <View style={styles.chipTexts}>
            <Text style={styles.chipLabel}>מנחה</Text>
            <Text style={styles.chipValue}>{minchaStr}</Text>
          </View>
        </View>

        <View style={styles.chipDivider} />

        {/* WhatsAround navigation */}
        <Pressable
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          onPress={() => navigation.navigate('WhatsAround')}
        >
          <Ionicons name="navigate-outline" size={12} color={colors.primary} />
          <Text style={[styles.chipLabel, { color: colors.primary, fontWeight: '600' }]}>
            מה יש סביבי?
          </Text>
        </Pressable>

        <View style={styles.chipDivider} />

        {/* Synagogue placeholder */}
        <View style={styles.chip}>
          <Ionicons name="business-outline" size={12} color={colors.categorySynagogue} />
          <View style={styles.chipTexts}>
            <Text style={styles.chipLabel}>בית כנסת</Text>
            <Text style={[styles.chipValue, { color: colors.textFaint }]}>טרם נבחר</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadow.raised,
  },
  mainRow: {
    flexDirection: 'row',
  },
  illustration: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    flexShrink: 0,
  },
  illustEmoji: {
    fontSize: 44,
  },
  textContent: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'flex-end',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  countdownLabel: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: 2,
  },
  countdown: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1.5,
    textAlign: 'right',
    lineHeight: 42,
  },
  timesLine: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    minHeight: 48,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  chipDivider: {
    width: 0.5,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
  chipTexts: {
    alignItems: 'center',
    gap: 1,
  },
  chipLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
  },
  chipValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
