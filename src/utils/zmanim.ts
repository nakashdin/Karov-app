// Zmanim (halachic sun times) — sunrise / sunset / dawn / candle-lighting /
// nightfall for a given coordinate + date. Used by the opening-hours parser so
// mikveh schedules written in natural language ("מעלות השחר עד כניסת שבת",
// "שעה אחרי צאת שבת") can be evaluated against the current time.
//
// Sunrise/sunset use the classic "Almanac for Computers" algorithm (accurate to
// ~1 min for Israel latitudes) — enough for open/closed decisions.

export interface SunTimes {
  /** local minutes since midnight */
  sunrise: number;
  sunset: number;
}

const toRad = (d: number): number => (d * Math.PI) / 180;
const toDeg = (r: number): number => (r * 180) / Math.PI;
const norm360 = (x: number): number => ((x % 360) + 360) % 360;

/** Sunrise & sunset as local minutes-since-midnight, or null at extreme latitudes. */
export function sunTimes(date: Date, lat: number, lng: number): SunTimes | null {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const zenith = 90.833; // official sunrise/sunset (includes refraction + solar radius)
  const lngHour = lng / 15;
  const tzMin = -date.getTimezoneOffset(); // device local offset in minutes (east +)

  const compute = (rising: boolean): number | null => {
    const t = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(toRad(M)) + 0.02 * Math.sin(toRad(2 * M)) + 282.634;
    L = norm360(L);
    let RA = toDeg(Math.atan(0.91764 * Math.tan(toRad(L))));
    RA = norm360(RA);
    // align RA quadrant with L
    const Lq = Math.floor(L / 90) * 90;
    const RAq = Math.floor(RA / 90) * 90;
    RA = (RA + (Lq - RAq)) / 15;
    const sinDec = 0.39782 * Math.sin(toRad(L));
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(toRad(zenith)) - sinDec * Math.sin(toRad(lat))) / (cosDec * Math.cos(toRad(lat)));
    if (cosH > 1 || cosH < -1) return null; // sun never rises/sets that day
    const H = (rising ? 360 - toDeg(Math.acos(cosH)) : toDeg(Math.acos(cosH))) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    let UT = T - lngHour; // universal time (hours)
    UT = ((UT % 24) + 24) % 24;
    const localMin = UT * 60 + tzMin;
    return ((localMin % 1440) + 1440) % 1440;
  };

  const sunrise = compute(true);
  const sunset = compute(false);
  if (sunrise == null || sunset == null) return null;
  return { sunrise, sunset };
}

export interface Zmanim {
  dawn: number;          // עלות השחר ≈ sunrise − 72 min
  sunrise: number;       // הנץ / זריחה
  sunset: number;        // שקיעה
  candleLighting: number;// הדלקת נרות / כניסת שבת ≈ sunset − 20 min
  nightfall: number;     // צאת הכוכבים / צאת שבת ≈ sunset + 27 min
}

export function zmanim(date: Date, loc: { latitude: number; longitude: number }): Zmanim | null {
  const st = sunTimes(date, loc.latitude, loc.longitude);
  if (!st) return null;
  return {
    dawn: st.sunrise - 72,
    sunrise: st.sunrise,
    sunset: st.sunset,
    candleLighting: st.sunset - 20,
    nightfall: st.sunset + 27,
  };
}
