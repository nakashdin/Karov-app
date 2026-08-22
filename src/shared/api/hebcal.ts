import { getJson, query, type RequestOptions } from './client';

/**
 * Hebcal — the Hebrew calendar, parashat hashavua and zmanim.
 *
 * URLs were previously assembled inline at four call sites (two hooks, one
 * screen, one duplicated pair), each with slightly different parameters. One
 * module means one place to fix a parameter, and one place to look when a time
 * comes back wrong.
 *
 * https://www.hebcal.com/home/developer-apis
 */

const BASE = 'https://www.hebcal.com';

/** Israel, Jerusalem time — every consumer of this app is on this calendar. */
const ISRAEL = { il: '1' as const, tzid: 'Asia/Jerusalem' };

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HebcalItem {
  title: string;
  date: string;
  category?: string;
  subcat?: string;
  hebrew?: string;
  /** Present on parashat items — the transliterated English name. */
  title_orig?: string;
  hdate?: string;
  memo?: string;
}

export interface HebcalCalendar {
  items?: HebcalItem[];
}

export interface HebcalConversion {
  /** Full Hebrew date string, e.g. "ז׳ בֶּאֱלוּל תשפ״ו". */
  hebrew?: string;
  /** English month key, e.g. "Elul". */
  hm?: string;
  /** Day of the Hebrew month. */
  hd?: number;
  hy?: number;
  /** Hebrew-script parts. Note: `m` is Hebrew text ("אלול"), not a key. */
  heDateParts?: { y?: string; m?: string; d?: string };
}

export interface HebcalZmanim {
  times?: Record<string, string>;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

/**
 * Calendar events for a Gregorian year/month (holidays, omer, rosh chodesh).
 *
 * `i=on` selects the ISRAEL schedule. This app previously sent `l=IL`, which is
 * not a Hebcal parameter at all (the language flag is `lg`), so it was ignored
 * and the API fell back to its default — the DIASPORA calendar. Concretely, the
 * app told users in Israel that 4 Oct 2026 is Simchat Torah (it is a weekday
 * there; Simchat Torah fell on the 3rd with Shmini Atzeret), that Pesach II is
 * yom tov rather than chol hamoed, and that there is an eighth day of Pesach.
 * It also omitted Israeli observances such as Yom HaAliyah.
 *
 * `shabbatIsraelUrl` above has always asked for `geo=il`, so the two endpoints
 * were contradicting each other. They now agree.
 */
export function calendarUrl(year: number, month: number): string {
  return (
    `${BASE}/hebcal` +
    query({
      v: 1,
      cfg: 'json',
      maj: 'on',
      min: 'on',
      mod: 'on',
      nx: 'on',
      omer: 'on',
      year,
      month,
      yt: 'G',
      xl: 0,
      c: 'off',
      i: 'on',
    })
  );
}

/** Gregorian → Hebrew date. `strict` returns the date without an event suffix. */
export function converterUrl(
  year: number,
  month: number,
  day: number,
  strict = false,
): string {
  return (
    `${BASE}/converter` +
    query({ cfg: 'json', gy: year, gm: month, gd: day, g2h: 1, strict: strict ? 1 : undefined })
  );
}

/**
 * Shabbat times and the week's parasha, country-wide for Israel.
 *
 * Parameters are kept exactly as they have always been: m=50 (havdalah at 50
 * minutes) and b=18 (candle lighting 18 minutes before sunset) are halachic
 * choices, not defaults — changing them changes the times shown to users.
 */
export function shabbatIsraelUrl(): string {
  return `${BASE}/shabbat` + query({ cfg: 'json', geo: 'il', m: 50, b: 18, M: 'on' });
}

/** Shabbat times for a specific coordinate. */
export function shabbatUrl(latitude: number, longitude: number): string {
  return (
    `${BASE}/shabbat` +
    query({
      cfg: 'json',
      geo: 'pos',
      latitude,
      longitude,
      tzid: ISRAEL.tzid,
      i: ISRAEL.il,
      m: 50,
      b: 18,
      M: 'on',
    })
  );
}

/** Halachic times for a coordinate on a given ISO date. */
export function zmanimUrl(latitude: number, longitude: number, isoDate: string): string {
  return (
    `${BASE}/zmanim` +
    query({ cfg: 'json', latitude, longitude, date: isoDate, tzid: ISRAEL.tzid })
  );
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const fetchCalendar = (year: number, month: number, opts?: RequestOptions) =>
  getJson<HebcalCalendar>(calendarUrl(year, month), opts);

export const fetchConversion = (
  year: number,
  month: number,
  day: number,
  strict?: boolean,
  opts?: RequestOptions,
) => getJson<HebcalConversion>(converterUrl(year, month, day, strict), opts);

export const fetchShabbatIsrael = (opts?: RequestOptions) =>
  getJson<HebcalCalendar>(shabbatIsraelUrl(), opts);

export const fetchShabbat = (latitude: number, longitude: number, opts?: RequestOptions) =>
  getJson<HebcalCalendar>(shabbatUrl(latitude, longitude), opts);

export const fetchZmanim = (
  latitude: number,
  longitude: number,
  isoDate: string,
  opts?: RequestOptions,
) => getJson<HebcalZmanim>(zmanimUrl(latitude, longitude, isoDate), opts);
