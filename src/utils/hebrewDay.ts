import { sunTimes } from './zmanim';

/**
 * The Jewish day begins at sunset, not at midnight.
 *
 * Anything that asks "what is today's Hebrew date" has to roll over there.
 * Keying off the civil date left the app a full day behind between sunset and
 * midnight — on Friday evening, with Shabbat already in, it still said
 * "ח׳ באלול — אומרים סליחות ותוקעים בשופר".
 *
 * Sunset is computed locally, so this needs no network and no permission.
 * Without a device location we fall back to Jerusalem: sunset across Israel
 * spans only a few minutes, so the rollover lands at essentially the right
 * moment either way.
 */

const JERUSALEM: Coord = { latitude: 31.7683, longitude: 35.2137 };

export interface Coord {
  latitude: number;
  longitude: number;
}

export interface HalachicDate {
  /** Civil year of the Jewish day — after sunset, tomorrow's */
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  /** YYYY-MM-DD of the above */
  iso: string;
  /** Weekday of the Jewish day, 0 = Sunday */
  weekday: number;
  /** Whether we are past sunset and have already moved on */
  afterSunset: boolean;
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

/** The civil date that carries the current Jewish day. */
export function halachicDate(now: Date = new Date(), loc?: Coord | null): HalachicDate {
  const at = loc ?? JERUSALEM;
  const sun = sunTimes(now, at.latitude, at.longitude);
  const afterSunset = sun != null && minutesOfDay(now) >= sun.sunset;

  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (afterSunset) d.setDate(d.getDate() + 1);

  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    iso: isoOf(d),
    weekday: d.getDay(),
    afterSunset,
  };
}

/**
 * Milliseconds until the Jewish day flips again — sunset while it is still
 * ahead of us, midnight once it has passed (that is when the civil date we
 * count from changes).
 */
export function msUntilRollover(now: Date = new Date(), loc?: Coord | null): number {
  const at = loc ?? JERUSALEM;
  const sun = sunTimes(now, at.latitude, at.longitude);
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (sun != null && minutesOfDay(now) < sun.sunset) {
    target.setMinutes(Math.ceil(sun.sunset));
  } else {
    target.setDate(target.getDate() + 1);
  }

  // A second past the boundary, so we never re-read the same side of it.
  return Math.max(1000, target.getTime() - now.getTime() + 1000);
}
