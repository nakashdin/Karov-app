import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSharedLocation } from '../../context/LocationContext';
import { zmanim as calcZmanim } from '../../utils/zmanim';
import { colors, radius, shadow, spacing } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { Place } from '../../types/place';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  cityName: string | null;
  onSynagoguePress: () => void;
  favoriteSynagogue: Place | null;
}

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

export function TodayCard({ cityName, onSynagoguePress, favoriteSynagogue }: Props) {
  const { location } = useSharedLocation();
  const navigation = useNavigation<Nav>();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const day = now.getDay();
  const hour = now.getHours();
  const nowMins = hour * 60 + now.getMinutes();

  let countdownLabel = 'שקיעה בעוד';
  let countdownValue = '--:--';
  let timesLine = 'הפעל מיקום לזמנים מדויקים';
  let isNight = hour >= 20 || hour < 6;

  let prayerName = 'מנחה';
  let prayerTime = '--:--';
  let prayerTimes: { shacharit: string; mincha: string; arvit: string } | null = null;

  if (location) {
    const z = calcZmanim(now, location);
    const zTomorrow = calcZmanim(tomorrow, location);

    if (z) {
      const sunsetStr = minsToHHMM(z.sunset);
      const nightfallStr = minsToHHMM(z.nightfall);
      isNight = minsLeft(z.sunset) <= 0;

      const chatzot = (z.sunrise + z.sunset) / 2;

      if (day === 6) {
        if (nowMins < chatzot + 30) {
          prayerName = 'מוסף';
          prayerTime = minsToHHMM(Math.round(chatzot + 30));
        } else {
          prayerName = 'מנחה';
          prayerTime = minsToHHMM(Math.round(z.sunset - 25));
        }
      } else if (nowMins < z.sunrise) {
        // Before sunrise — show when shacharit starts
        prayerName = 'שחרית';
        prayerTime = minsToHHMM(Math.round(z.sunrise));
      } else if (nowMins < chatzot) {
        // After sunrise — show latest time to still daven shacharit
        prayerName = 'סוף שחרית';
        prayerTime = minsToHHMM(Math.round(chatzot));
      } else if (nowMins < z.sunset) {
        prayerName = 'מנחה';
        prayerTime = minsToHHMM(Math.round(z.sunset - 25));
      } else {
        prayerName = 'ערבית';
        prayerTime = minsToHHMM(z.nightfall);
      }

      prayerTimes = {
        shacharit: minsToHHMM(Math.round(z.sunrise)),
        mincha: minsToHHMM(Math.round(z.sunset - 25)),
        arvit: minsToHHMM(Math.round(z.nightfall)),
      };

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
        } else if (zTomorrow) {
          const minsUntilSunrise = 24 * 60 - nowMins + zTomorrow.sunrise;
          countdownLabel = 'זריחה בעוד';
          countdownValue = fmtCountdown(minsUntilSunrise);
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

  const locationLabel = cityName ?? (location ? '...' : 'הפעל מיקום');

  const handlePrayerPress = () => {
    if (!favoriteSynagogue) {
      Alert.alert(
        'זמני תפילה',
        'לא נבחר בית כנסת.\nבחר בית כנסת קרוב לקבלת מידע נוסף.',
        [
          { text: 'בחר בית כנסת', onPress: onSynagoguePress },
          { text: 'סגור', style: 'cancel' },
        ],
      );
    }
  };

  const handleSynagoguePress = () => {
    if (favoriteSynagogue) {
      Alert.alert(
        favoriteSynagogue.name,
        favoriteSynagogue.address ?? '',
        [
          { text: 'פרטים', onPress: () => navigation.navigate('PlaceDetail', { id: favoriteSynagogue.id }) },
          { text: 'שנה', onPress: onSynagoguePress },
          { text: 'סגור', style: 'cancel' },
        ],
      );
    } else {
      onSynagoguePress();
    }
  };

  const synName = favoriteSynagogue ? favoriteSynagogue.name : null;

  return (
    <View style={styles.card}>
      {/* Main row: pressable → Zmanim tab */}
      <Pressable
        style={({ pressed }) => [styles.mainRow, pressed && styles.mainPressed]}
        onPress={() => navigation.navigate('Tabs', { screen: 'Zmanim' })}
      >
        {/* Left side — illustration */}
        <View style={[styles.illustration, { backgroundColor: illustBg }]}>
          <Text style={styles.illustEmoji}>{illustEmoji}</Text>
        </View>

        {/* Right side — countdown info */}
        <View style={styles.textContent}>
          <View style={styles.labelRow}>
            <Text style={styles.cardLabel}>היום שלך</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.textFaint} />
          </View>
          <Text style={styles.countdownLabel}>{countdownLabel}</Text>
          <Text style={styles.countdown}>{countdownValue}</Text>
          <Text style={styles.timesLine} numberOfLines={1}>{timesLine}</Text>
          {prayerTimes && (
            <View style={styles.prayerTimesRow}>
              <View style={styles.prayerItem}>
                <Text style={styles.prayerItemLabel}>שחרית</Text>
                <Text style={styles.prayerItemTime}>{prayerTimes.shacharit}</Text>
              </View>
              <View style={styles.prayerItem}>
                <Text style={styles.prayerItemLabel}>מנחה</Text>
                <Text style={styles.prayerItemTime}>{prayerTimes.mincha}</Text>
              </View>
              <View style={styles.prayerItem}>
                <Text style={styles.prayerItemLabel}>ערבית</Text>
                <Text style={styles.prayerItemTime}>{prayerTimes.arvit}</Text>
              </View>
            </View>
          )}
        </View>
      </Pressable>

      {/* Bottom chips */}
      <View style={styles.chipsRow}>
        {/* Prayer chip */}
        <Pressable
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
          onPress={handlePrayerPress}
        >
          <Ionicons name="people-outline" size={12} color={colors.categorySynagogue} />
          <View style={styles.chipTexts}>
            <Text style={styles.chipLabel}>{prayerName}</Text>
            {favoriteSynagogue ? (
              <Text style={[styles.chipValue, { color: colors.textMuted, fontSize: 9 }]}>
                יש לבדוק
              </Text>
            ) : (
              <Text style={styles.chipValue}>{prayerTime}</Text>
            )}
          </View>
        </Pressable>

        <View style={styles.chipDivider} />

        {/* Location chip — display only, no navigation */}
        <View style={styles.chip}>
          <Ionicons name="navigate-outline" size={12} color={colors.primary} />
          <View style={styles.chipTexts}>
            <Text style={[styles.chipLabel, { color: colors.primary }]}>נמצא כעת</Text>
            <Text
              style={[styles.chipValue, { color: colors.primary }]}
              numberOfLines={1}
            >
              {locationLabel}
            </Text>
          </View>
        </View>

        <View style={styles.chipDivider} />

        {/* Synagogue chip */}
        <View style={styles.chip}>
          <Ionicons name="business-outline" size={12} color={colors.categorySynagogue} />
          <View style={styles.chipTexts}>
            <Text style={styles.chipLabel}>בית כנסת</Text>
            {synName ? (
              <Pressable
                onPress={() => navigation.navigate('PlaceDetail', { id: favoriteSynagogue!.id })}
                hitSlop={4}
              >
                <Text style={[styles.chipValue, { fontSize: 10 }]} numberOfLines={1}>
                  {synName}
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={onSynagoguePress} hitSlop={4}>
                <Text style={[styles.chipValue, { color: colors.primary, fontSize: 10 }]}>
                  בחר עכשיו
                </Text>
              </Pressable>
            )}
            {synName ? (
              <Pressable onPress={onSynagoguePress} hitSlop={6}>
                <Text style={styles.changeBtn}>שנה ←</Text>
              </Pressable>
            ) : null}
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
  mainPressed: {
    opacity: 0.88,
  },
  chipPressed: {
    opacity: 0.7,
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
    gap: 4,
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
  prayerTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 7,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  prayerItem: {
    flex: 1,
    alignItems: 'center',
  },
  prayerItemLabel: {
    fontSize: 9,
    color: colors.textFaint,
    fontWeight: '500',
    marginBottom: 1,
  },
  prayerItemTime: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    minHeight: 52,
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
    minWidth: 0,
    flexShrink: 1,
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
  changeBtn: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 1,
  },
});
