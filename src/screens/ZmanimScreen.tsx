import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { useSharedLocation, getCachedLocation } from '../context/LocationContext';

// ─── Cities ───────────────────────────────────────────────────────────────────

interface City { name: string; lat: number; lng: number }

const CITIES: City[] = [
  { name: 'ירושלים',      lat: 31.7683, lng: 35.2137 },
  { name: 'תל אביב',     lat: 32.0853, lng: 34.7818 },
  { name: 'בני ברק',     lat: 32.0841, lng: 34.8337 },
  { name: 'חיפה',        lat: 32.7940, lng: 34.9896 },
  { name: 'אשדוד',       lat: 31.8044, lng: 34.6553 },
  { name: 'פתח תקווה',   lat: 32.0840, lng: 34.8878 },
  { name: 'נתניה',       lat: 32.3215, lng: 34.8532 },
  { name: 'באר שבע',     lat: 31.2518, lng: 34.7913 },
  { name: 'ראשון לציון', lat: 31.9730, lng: 34.7925 },
  { name: 'רמת גן',      lat: 32.0698, lng: 34.8238 },
];

// ─── Zmanim — exactly as the user specified ───────────────────────────────────

interface ZmanDef {
  key: string;
  hebrew: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}

const ZMANIM_DEFS: ZmanDef[] = [
  { key: 'alotHaShachar',  hebrew: 'עלות השחר',           icon: 'time-outline',  iconColor: colors.textMuted },
  { key: 'sunrise',        hebrew: 'הנץ החמה',            icon: 'sunny',         iconColor: '#f59e0b' },
  { key: 'sofZmanShmaMGA', hebrew: 'סוף זמן ק"ש (מג"א)', icon: 'book',          iconColor: colors.danger },
  { key: 'sofZmanShma',    hebrew: 'סוף זמן ק"ש (גר"א)', icon: 'book',          iconColor: colors.danger },
  { key: 'chatzot',        hebrew: 'חצות היום',           icon: 'remove-circle-outline', iconColor: colors.text },
  { key: 'minchaGedola',   hebrew: 'מנחה גדולה',         icon: 'sunny-outline', iconColor: '#d97706' },
  { key: 'sunset',         hebrew: 'שקיעת החמה',         icon: 'sunny',         iconColor: '#ea580c' },
  { key: 'tzeit85deg',     hebrew: 'צאת הכוכבים',        icon: 'moon',          iconColor: '#7c3aed' },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const GREG_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

// ─── API ──────────────────────────────────────────────────────────────────────

interface ZmanimData {
  times: Record<string, string>;
  hebrewDate: string;
  gregDate: string;
}

async function fetchZmanim(lat: number, lng: number, date: Date): Promise<ZmanimData | null> {
  try {
    const iso = dateToISO(date);
    const [gy, gm, gd] = iso.split('-').map(Number);

    const [zmRes, convRes] = await Promise.all([
      fetch(`https://www.hebcal.com/zmanim?cfg=json&latitude=${lat}&longitude=${lng}&date=${iso}&tzid=Asia/Jerusalem`),
      fetch(`https://www.hebcal.com/converter?cfg=json&gd=${gd}&gm=${gm}&gy=${gy}&g2h=1`),
    ]);

    const zmJson = await zmRes.json();
    const convJson = await convRes.json();

    const { d: hebDay, m: hebMonth, y: hebYear } = convJson.heDateParts ?? {};
    const hebrewDate = `${hebDay ?? ''} ב${hebMonth ?? ''} ${hebYear ?? ''}`;
    const gregDate = `${gd} ${GREG_MONTHS[gm - 1]} ${gy}`;

    return { times: zmJson.times ?? {}, hebrewDate, gregDate };
  } catch {
    return null;
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ZmanimScreen() {
  const { location: ctxLoc } = useSharedLocation();
  const gpsLoc = ctxLoc ?? getCachedLocation();

  const defaultCity = gpsLoc
    ? CITIES.reduce((best, c) => {
        const d = Math.abs(c.lat - gpsLoc.latitude) + Math.abs(c.lng - gpsLoc.longitude);
        const bd = Math.abs(best.lat - gpsLoc.latitude) + Math.abs(best.lng - gpsLoc.longitude);
        return d < bd ? c : best;
      }, CITIES[0])
    : CITIES[0];

  const [city, setCity] = useState<City>(defaultCity);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [data, setData] = useState<ZmanimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  const isToday = dateToISO(selectedDate) === dateToISO(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchZmanim(city.lat, city.lng, selectedDate);
    setData(result);
    setLoading(false);
  }, [city, selectedDate]);

  useEffect(() => { void load(); }, [load]);

  const pickCity = (c: City) => { setCity(c); setCityPickerOpen(false); };

  return (
    <Screen padded>
      {/* Title */}
      <Text style={styles.screenTitle}>זמני היום</Text>

      {/* Date row */}
      <View style={styles.dateRow}>
        {/* ← next day */}
        <Pressable
          style={styles.arrowBtn}
          onPress={() => setSelectedDate(d => addDays(d, 1))}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>

        {/* Date display */}
        <View style={styles.dateCenter}>
          {data ? (
            <>
              <Text style={styles.hebrewDate}>{data.hebrewDate}</Text>
              <Text style={styles.gregDate}>{data.gregDate}</Text>
            </>
          ) : (
            <Text style={styles.gregDate}>{dateToISO(selectedDate)}</Text>
          )}
          {!isToday && (
            <Pressable onPress={() => setSelectedDate(new Date())} style={styles.todayPill}>
              <Text style={styles.todayText}>חזור להיום</Text>
            </Pressable>
          )}
        </View>

        {/* → prev day */}
        <Pressable
          style={styles.arrowBtn}
          onPress={() => setSelectedDate(d => addDays(d, -1))}
          hitSlop={10}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* City picker row */}
      <Pressable style={styles.cityRow} onPress={() => setCityPickerOpen(true)}>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        <Text style={styles.cityName}>{city.name}</Text>
        <Ionicons name="location-outline" size={15} color={colors.primary} />
      </Pressable>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Zmanim */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>טוען זמנים...</Text>
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>לא הצלחנו לטעון את הזמנים</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>נסה שוב</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {ZMANIM_DEFS.map((zman) => {
            const rawTime = data.times[zman.key];
            if (!rawTime) return null;
            return (
              <View key={zman.key} style={styles.card}>
                <Ionicons name={zman.icon} size={20} color={zman.iconColor} />
                <Text style={styles.zmanName}>{zman.hebrew}</Text>
                <View style={styles.timePill}>
                  <Text style={styles.timeText}>{formatTime(rawTime)}</Text>
                </View>
              </View>
            );
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* City modal */}
      <Modal visible={cityPickerOpen} transparent animationType="slide" onRequestClose={() => setCityPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCityPickerOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>בחר עיר</Text>
            <Pressable onPress={() => setCityPickerOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView>
            {CITIES.map((c) => (
              <Pressable
                key={c.name}
                style={[styles.cityOption, c.name === city.name && styles.cityOptionActive]}
                onPress={() => pickCity(c)}
              >
                <Text style={[styles.cityOptionText, c.name === city.name && styles.cityOptionTextActive]}>
                  {c.name}
                </Text>
                {c.name === city.name && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  // Date navigation
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  hebrewDate: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  gregDate: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  todayPill: {
    marginTop: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 12,
  },
  todayText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  // City
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  cityName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  divider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginBottom: 12,
  },

  // Cards
  list: { gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  zmanName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  timePill: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 5,
    paddingHorizontal: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // States
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 15, color: colors.textMuted },
  errorText: { fontSize: 15, color: colors.danger, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Modal
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  cityOptionActive: { backgroundColor: colors.primaryLight },
  cityOptionText: { fontSize: 16, color: colors.text, textAlign: 'right' },
  cityOptionTextActive: { fontWeight: '700', color: colors.primary },
});
