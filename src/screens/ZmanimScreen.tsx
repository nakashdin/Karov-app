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

// ─── City presets ────────────────────────────────────────────────────────────

interface City {
  name: string;
  lat: number;
  lng: number;
}

const CITIES: City[] = [
  { name: 'ירושלים',    lat: 31.7683, lng: 35.2137 },
  { name: 'תל אביב',   lat: 32.0853, lng: 34.7818 },
  { name: 'בני ברק',   lat: 32.0841, lng: 34.8337 },
  { name: 'חיפה',      lat: 32.7940, lng: 34.9896 },
  { name: 'אשדוד',     lat: 31.8044, lng: 34.6553 },
  { name: 'פתח תקווה', lat: 32.0840, lng: 34.8878 },
  { name: 'נתניה',     lat: 32.3215, lng: 34.8532 },
  { name: 'באר שבע',   lat: 31.2518, lng: 34.7913 },
  { name: 'ראשון לציון', lat: 31.9730, lng: 34.7925 },
  { name: 'רמת גן',    lat: 32.0698, lng: 34.8238 },
];

// ─── Zman definition ──────────────────────────────────────────────────────────

interface ZmanDef {
  key: string;
  hebrew: string;
  english: string;
  icon: string;
  iconColor: string;
  iconBg: string;
}

const ZMANIM_DEFS: ZmanDef[] = [
  { key: 'alotHaShachar',  hebrew: 'עלות השחר',           english: 'Alot HaShachar',    icon: 'time-outline',    iconColor: '#6366f1', iconBg: '#ede9fe' },
  { key: 'sunrise',        hebrew: 'הנץ החמה',            english: 'Netz HaChama',       icon: 'sunny',           iconColor: '#f59e0b', iconBg: '#fef3c7' },
  { key: 'sofZmanShmaMGA', hebrew: 'סוף זמן ק"ש (מג"א)', english: 'Latest Shema (M"A)', icon: 'book',            iconColor: '#dc2626', iconBg: '#fee2e2' },
  { key: 'sofZmanShmaGRA', hebrew: 'סוף זמן ק"ש (גר"א)', english: 'Latest Shema (Gr"a)',icon: 'book',            iconColor: '#dc2626', iconBg: '#fee2e2' },
  { key: 'chatzot',        hebrew: 'חצות היום',           english: 'Chatzot HaYom',      icon: 'remove',          iconColor: '#374151', iconBg: '#f3f4f6' },
  { key: 'minchaGedola',   hebrew: 'מנחה גדולה',         english: 'Mincha Gedola',       icon: 'sunny-outline',   iconColor: '#d97706', iconBg: '#fef9ee' },
  { key: 'minchaKetana',   hebrew: 'מנחה קטנה',          english: 'Mincha Ketana',       icon: 'sunny-outline',   iconColor: '#b45309', iconBg: '#fef3c7' },
  { key: 'plagHaMincha',   hebrew: 'פלג המנחה',          english: 'Plag HaMincha',       icon: 'partly-sunny-outline', iconColor: '#92400e', iconBg: '#fde68a' },
  { key: 'sunset',         hebrew: 'שקיעת החמה',         english: 'Shkiat HaChama',      icon: 'sunny',           iconColor: '#ea580c', iconBg: '#ffedd5' },
  { key: 'tzeit42min',     hebrew: 'צאת הכוכבים',        english: 'Tzeit HaKochavim',    icon: 'moon',            iconColor: '#7c3aed', iconBg: '#ede9fe' },
];

// ─── API ──────────────────────────────────────────────────────────────────────

interface ZmanimData {
  times: Record<string, string>;
  hdate: string;   // e.g. "כ"ב בְּתַמּוּז תשפ"ו"
  gdate: string;   // e.g. "7 ביולי 2026"
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

async function fetchZmanim(lat: number, lng: number): Promise<ZmanimData | null> {
  try {
    const date = todayISO();
    const url = `https://www.hebcal.com/zmanim?cfg=json&latitude=${lat}&longitude=${lng}&date=${date}&tzid=Asia/Jerusalem`;
    const res = await fetch(url);
    const json = await res.json();

    // Hebrew date from converter
    const [gy, gm, gd] = date.split('-').map(Number);
    const convUrl = `https://www.hebcal.com/converter?cfg=json&gd=${gd}&gm=${gm}&gy=${gy}&g2h=1`;
    const convRes = await fetch(convUrl);
    const convJson = await convRes.json();

    const hebrewMonths: Record<number, string> = {
      1:'ניסן',2:'אייר',3:'סיון',4:'תמוז',5:'אב',6:'אלול',
      7:'תשרי',8:'חשון',9:'כסלו',10:'טבת',11:'שבט',12:'אדר',13:'אדר ב׳',
    };
    const heDay = convJson.hd;
    const heMonth = hebrewMonths[convJson.hm] ?? '';
    const heYear = convJson.hebrew?.split(' ').pop() ?? '';
    const hdate = `${heDay} ${heMonth} ${heYear}`;

    const gregMonths = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    const gdate = `${gd} ${gregMonths[gm - 1]} ${gy}`;

    return { times: json.times ?? {}, hdate, gdate };
  } catch {
    return null;
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ZmanimScreen() {
  const { location: ctxLoc } = useSharedLocation();
  const gpsLoc = ctxLoc ?? getCachedLocation();

  // Default to nearest GPS city or Jerusalem
  const defaultCity = gpsLoc
    ? CITIES.reduce((best, c) => {
        const d = Math.abs(c.lat - gpsLoc.latitude) + Math.abs(c.lng - gpsLoc.longitude);
        const bd = Math.abs(best.lat - gpsLoc.latitude) + Math.abs(best.lng - gpsLoc.longitude);
        return d < bd ? c : best;
      }, CITIES[0])
    : CITIES[0];

  const [city, setCity] = useState<City>(defaultCity);
  const [data, setData] = useState<ZmanimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchZmanim(city.lat, city.lng);
    setData(result);
    setLoading(false);
  }, [city]);

  useEffect(() => { void load(); }, [load]);

  const pickCity = (c: City) => {
    setCity(c);
    setCityPickerOpen(false);
  };

  return (
    <Screen padded>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.dateBlock}>
          {data ? (
            <>
              <Text style={styles.hebrewDate}>{data.hdate}</Text>
              <Text style={styles.gregDate}>{data.gdate}</Text>
            </>
          ) : (
            <Text style={styles.gregDate}>{todayISO()}</Text>
          )}
        </View>

        <Pressable style={styles.cityPicker} onPress={() => setCityPickerOpen(true)}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles.cityName}>{city.name}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Zmanim list */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>טוען זמנים...</Text>
        </View>
      ) : !data ? (
        <View style={styles.loadingBox}>
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
            const time = formatTime(rawTime);
            return (
              <View key={zman.key} style={styles.card}>
                {/* Icon */}
                <View style={[styles.iconBox, { backgroundColor: zman.iconBg }]}>
                  <Ionicons name={zman.icon as any} size={22} color={zman.iconColor} />
                </View>

                {/* Name */}
                <View style={styles.nameBlock}>
                  <Text style={styles.hebrewName}>{zman.hebrew}</Text>
                  <Text style={styles.englishName}>{zman.english}</Text>
                </View>

                {/* Time pill */}
                <View style={styles.timePill}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
              </View>
            );
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* City picker modal */}
      <Modal
        visible={cityPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCityPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setCityPickerOpen(false)} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>בחר עיר</Text>
            <Pressable onPress={() => setCityPickerOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView>
            {CITIES.map((c) => (
              <Pressable
                key={c.name}
                style={[styles.cityRow, c.name === city.name && styles.cityRowActive]}
                onPress={() => pickCity(c)}
              >
                <Text style={[styles.cityRowText, c.name === city.name && styles.cityRowTextActive]}>
                  {c.name}
                </Text>
                {c.name === city.name && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: 10,
  },
  dateBlock: {
    alignItems: 'center',
    gap: 4,
  },
  hebrewDate: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  gregDate: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cityPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  cityName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  // List
  list: {
    gap: 10,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  hebrewName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  englishName: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 1,
  },
  timePill: {
    backgroundColor: '#1e3a5f',
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingHorizontal: 12,
    minWidth: 64,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Loading / error
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 15,
    color: colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // City picker
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  cityRowActive: {
    backgroundColor: colors.primaryLight,
  },
  cityRowText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  cityRowTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
});
