// Opening-hours parser — OSM format + Hebrew abbreviated days + Hebrew natural-
// language council schedules with ZMANIM ("מעלות השחר עד כניסת שבת", "שעה אחרי
// צאת שבת למשך שעתיים"). Returns true (open), false (closed) or null (unknown).
//
// SAFETY RULE: never return `false` (closed) for a clause we cannot parse — only
// when a real window was resolved and "now" falls outside it. Unparseable →
// null, so the UI shows nothing rather than a wrong "closed".

import { zmanim, type Zmanim } from './zmanim';

type Loc = { latitude: number; longitude: number };

// ── Day lookup maps ───────────────────────────────────────────────────────────

const OSM_DAY: Record<string, number> = { su: 0, mo: 1, tu: 2, we: 3, th: 4, fr: 5, sa: 6 };
const HE_DAY: Record<string, number> = {
  "א": 0, "ב": 1, "ג": 2, "ד": 3, "ה": 4, "ו": 5, "ש": 6,
  "א'": 0, "ב'": 1, "ג'": 2, "ד'": 3, "ה'": 4, "ו'": 5, "ש'": 6,
};
const HE_DAY_WORD: Record<string, number> = { ראשון: 0, שני: 1, שלישי: 2, רביעי: 3, חמישי: 4, שישי: 5 };
const DAY_HE_LABEL: Record<string, string> = { Su: "א'", Mo: "ב'", Tu: "ג'", We: "ד'", Th: "ה'", Fr: "ו'", Sa: "ש'" };

// ── Low-level helpers ─────────────────────────────────────────────────────────

function expandRange(from: number, to: number): number[] {
  const days: number[] = [];
  let cur = from;
  for (let i = 0; i <= 7; i++) { days.push(cur); if (cur === to) break; cur = cur === 6 ? 0 : cur + 1; }
  return days;
}
const lookupOsm = (t: string): number | undefined => OSM_DAY[t.toLowerCase()];
const lookupHe = (t: string): number | undefined => HE_DAY[t.trim()];

function expandDayToken(token: string, isHe: boolean): number[] {
  token = token.trim();
  if (isHe) {
    const hm = token.match(/^(א'|ב'|ג'|ד'|ה'|ו'|ש')-(א'|ב'|ג'|ד'|ה'|ו'|ש')$/) || token.match(/^([אבגדהוש])-([אבגדהוש])$/);
    if (hm) { const a = lookupHe(hm[1]), b = lookupHe(hm[2]); if (a != null && b != null) return expandRange(a, b); }
    const d = lookupHe(token); return d != null ? [d] : [];
  }
  const om = token.match(/^([A-Za-z]{2})-([A-Za-z]{2})$/);
  if (om) { const a = lookupOsm(om[1]), b = lookupOsm(om[2]); if (a != null && b != null) return expandRange(a, b); }
  const d = lookupOsm(token); return d != null ? [d] : [];
}
const parseDaySpec = (spec: string, isHe: boolean): number[] => spec.split(',').flatMap(p => expandDayToken(p.trim(), isHe));

function parseTime(t: string): number | null {
  const m = t.trim().match(/^(\d{1,2})[:.](\d{2})$/);
  return m ? +m[1] * 60 + +m[2] : null;
}
function inRange(nowMin: number, from: number, to: number): boolean {
  if (to <= from) return nowMin >= from || nowMin < to; // crosses midnight
  return nowMin >= from && nowMin < to;
}
const isSummer = (d: Date): boolean => { const m = d.getMonth(); return m >= 3 && m <= 9; }; // ~Apr–Oct (Israel DST)

// ── Hebrew ZMANIM-aware evaluator ─────────────────────────────────────────────

/** Split a clause into its day-spec and time text. Uses the first colon that is
 * NOT inside a clock time; falls back to a leading day-letter run. */
function splitDayTime(clause: string): { dayPart: string; timePart: string } {
  for (let i = 0; i < clause.length; i++) {
    if (clause[i] === ':' && !(/\d/.test(clause[i - 1] ?? '') && /\d/.test(clause[i + 1] ?? ''))) {
      return { dayPart: clause.slice(0, i), timePart: clause.slice(i + 1) };
    }
  }
  const hm = clause.match(/^((?:[אבגדהוש]'?[-,]?)+)\s+(.+)$/);
  if (hm) return { dayPart: hm[1], timePart: hm[2] };
  return { dayPart: '', timePart: clause };
}

/** Which weekdays a Hebrew day-spec covers. null = indeterminate (e.g. "חג" only). */
function hebrewDays(dayPart: string): Set<number> | null {
  const p = dayPart.trim();
  if (!p) return null; // no day spec → caller treats as "all days"
  const days = new Set<number>();
  let hadUnknown = false;
  // phrase-level markers
  if (/מוצאי\s*שבת|מוצ["״']?ש/.test(p)) days.add(6);
  if (/ליל\s*שבת|ערב\s*שבת|ערב\s*חג/.test(p)) days.add(5);
  if (/(^|[\s,/])שבתות?([\s,/]|$)/.test(p)) days.add(6);
  if (/חג|מועד/.test(p)) hadUnknown = true; // chag/moed — no fixed weekday
  // token-level (letters, ranges, full words)
  for (const tok of p.split(/[\s,/]+/).filter(Boolean)) {
    if (/^[אבגדהוש]'?$/.test(tok)) { const d = lookupHe(tok); if (d != null) days.add(d); }
    else if (/^[אבגדהוש]'?[-–][אבגדהוש]'?$/.test(tok)) { for (const d of expandDayToken(tok.replace('–', '-'), true)) days.add(d); }
    else if (HE_DAY_WORD[tok] != null) days.add(HE_DAY_WORD[tok]);
  }
  if (days.size === 0) return hadUnknown ? null : null;
  return days;
}

const DUR_WORD: Record<string, number> = { חצי: 30, שעה: 60, כשעה: 60, שעתיים: 120, רבע: 15 };
const NUM_WORD: Record<string, number> = { שתי: 2, שתיים: 2, שלוש: 3, ארבע: 4, חמש: 5, שש: 6 };

/** Parse a duration phrase → minutes, or null. */
function parseDuration(text: string): number | null {
  const t = text.trim();
  if (/שעה\s*וחצי/.test(t)) return 90;
  let m = t.match(/(\d+)\s*(?:שעות|שעה)/); if (m) return +m[1] * 60;
  m = t.match(/(שתי|שתיים|שלוש|ארבע|חמש|שש)\s*שעות/); if (m) return NUM_WORD[m[1]] * 60;
  m = t.match(/(\d+)\s*(?:דקות|דק')/); if (m) return +m[1];
  if (/חצי\s*שעה/.test(t)) return 30;
  if (/רבע\s*שעה/.test(t)) return 15;
  if (/שעתיים/.test(t)) return 120;
  if (/כשעה|שעה/.test(t)) return 60;
  return null;
}

/** Resolve one time point (clock or zman anchor) → minutes, or null. */
function resolvePoint(text: string, z: Zmanim | null): number | null {
  const t = text.replace(/^מ/, '').trim(); // strip leading "מ" (מהשקיעה, מזמן…)
  const clock = t.match(/(\d{1,2})[:.](\d{2})/);
  if (clock) return +clock[1] * 60 + +clock[2];
  if (!z) return null;
  if (/עלות\s*השחר|מעלות\s*השחר/.test(t)) return z.dawn;
  if (/הנץ|זריחה/.test(t)) return z.sunrise;
  if (/הדלקת\s*(ה)?נרות|כניסת\s*(ה)?שבת|כניסת\s*(ה)?חג/.test(t)) return z.candleLighting;
  if (/צאת\s*(ה)?שבת|צאת\s*הכוכבים|צאת\s*(ה)?חג/.test(t)) return z.nightfall;
  if (/שקיעה|שקיעת\s*החמה|השקיעה/.test(t)) return z.sunset;
  if (/חצות/.test(t)) return Math.round((z.sunrise + z.sunset) / 2);
  return null;
}

/** Parse a Hebrew time phrase → {from,to} window, "closed", "unknown". */
function parseHebrewWindow(timePart: string, z: Zmanim | null, summer: boolean): { from: number; to: number } | 'closed' | 'unknown' {
  let s = timePart.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  if (!s) return 'unknown';
  if (/^סגור/.test(s) || /\bסגור\b/.test(s)) return 'closed';

  // Season split: "19:30-22:00 (קיץ) / 18:30-21:00 (חורף)"
  if (/\(קיץ\)/.test(s) && /\(חורף\)/.test(s)) {
    const parts = s.split('/');
    const pick = parts.find(p => (summer ? /קיץ/.test(p) : /חורף/.test(p))) ?? parts[0];
    s = pick.replace(/\((קיץ|חורף)\)/g, '').trim();
  }

  // "חצי שעה לאחר <anchor> למשך <dur>" / "שעה אחרי <anchor> ... למשך <dur>" / "מזמן <anchor> למשך <dur>"
  if (/(לאחר|אחרי)|למשך/.test(s)) {
    const durM = s.match(/למשך\s*(.+)$/);
    const anchorM = s.match(/(?:לאחר|אחרי)\s*([^,]+?)(?:\s*למשך|$)/) || s.match(/^מזמן\s*([^,]+?)(?:\s*למשך|$)/) || s.match(/^([^,]+?)\s*למשך/);
    if (anchorM) {
      const anchor = resolvePoint(anchorM[1], z);
      if (anchor != null) {
        // leading offset before "לאחר/אחרי" (e.g. "חצי שעה לאחר", "40 דק' לאחר", "שעה אחרי")
        const offText = s.split(/לאחר|אחרי/)[0];
        const off = /לאחר|אחרי/.test(s) ? (parseDuration(offText) ?? 0) : 0;
        const dur = durM ? parseDuration(durM[1]) : null;
        const from = anchor + off;
        const to = from + (dur ?? 60);
        return { from, to };
      }
      return 'unknown';
    }
  }

  // "<point> עד <point>"  (מעלות השחר עד 12:00 / מהשקיעה עד 22:00 / … עד כניסת שבת)
  const untilM = s.match(/^(.+?)\s*עד\s*(.+)$/);
  if (untilM) {
    const from = resolvePoint(untilM[1], z);
    const to = resolvePoint(untilM[2], z);
    if (from != null && to != null) return { from, to };
    return 'unknown';
  }

  // "<point> למשך <dur>"  (handled above if "למשך" present) — plain clock range fallback
  const range = s.match(/(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})/);
  if (range) { const from = parseTime(range[1]); const to = parseTime(range[2]); if (from != null && to != null) return { from, to }; }

  return 'unknown';
}

/** Evaluate a Hebrew natural-language schedule for now. */
function evalHebrew(s: string, today: number, nowMin: number, z: Zmanim | null, summer: boolean): boolean | null {
  const clauses = s.split(/[;|]|\n/).map(c => c.trim()).filter(Boolean);
  let anyReal = false; // at least one real window resolved for today
  for (const clause of clauses) {
    const { dayPart, timePart } = splitDayTime(clause);
    const daySet = hebrewDays(dayPart);
    if (daySet === null && dayPart.trim() !== '') continue; // indeterminate day (חג) — skip
    if (daySet && !daySet.has(today)) continue;             // not today
    const w = parseHebrewWindow(timePart, z, summer);
    if (w === 'unknown') continue;
    if (w === 'closed') { anyReal = true; continue; }
    anyReal = true;
    if (inRange(nowMin, ((w.from % 1440) + 1440) % 1440, ((w.to % 1440) + 1440) % 1440)) return true;
  }
  return anyReal ? false : null;
}

// ── OSM clause parser (restaurants / synagogues) ─────────────────────────────

/**
 * `today`-only day matching plus a bidirectional `inRange` produces a
 * midnight-crossing window on BOTH sides of its own start — e.g. "We
 * 22:00-02:00" read as open at Wednesday 01:00, hours before it starts,
 * while the actual pre-dawn coverage (Tuesday night bleeding into Wednesday
 * morning) is never checked at all. A window that wraps past midnight can
 * only be entered from its own day (`nowMin >= from`); the wrapped tail is
 * entered from the FOLLOWING day (`nowMin < to`), which is why the day-spec
 * is tested against both `today` and `yesterday` below.
 */
function evalClause(raw: string, today: number, nowMin: number): boolean | null {
  let clause = raw.replace(/"[^"]*"/g, '').trim();
  if (!clause) return null;
  if (/sunset|sunrise/i.test(clause)) return null;
  if (/^\s*ph\s/i.test(clause) || /\bunknown\b/i.test(clause)) return null;

  const om = clause.match(/^([A-Za-z]{2}(?:[-,][A-Za-z]{2})*)\s+(.+)$/);
  let daySpec: string | null = null, timeBlock: string;
  if (om) { daySpec = om[1]; timeBlock = om[2]; } else { timeBlock = clause; }

  const yesterday = (today + 6) % 7;
  let matchesToday = true;
  let matchesYesterday = true;
  if (daySpec) {
    const days = parseDaySpec(daySpec, false);
    if (days.length === 0) return null;
    matchesToday = days.includes(today);
    matchesYesterday = days.includes(yesterday);
    if (!matchesToday && !matchesYesterday) return null;
  }

  timeBlock = timeBlock.trim();
  if (/^(off|closed)$/i.test(timeBlock)) return matchesToday ? false : null;
  const normalized = timeBlock.replace(/\s*[–—]\s*/g, '-').replace(/\s+-\s+/g, '-');
  for (const slot of normalized.split(',').map(x => x.trim()).filter(Boolean)) {
    if (slot.endsWith('+')) {
      const from = parseTime(slot.slice(0, -1));
      if (from == null) continue;
      if (matchesToday && nowMin >= from) return true;
      if (matchesYesterday && nowMin < 180) return true;
      continue;
    }
    const dashIdx = slot.lastIndexOf('-');
    if (dashIdx <= 0) continue;
    const from = parseTime(slot.slice(0, dashIdx));
    const to = parseTime(slot.slice(dashIdx + 1));
    if (from == null || to == null) continue;
    if (to <= from) {
      // Wraps past midnight: entered from `from` on this clause's own day,
      // exited before `to` on the day after.
      if (matchesToday && nowMin >= from) return true;
      if (matchesYesterday && nowMin < to) return true;
    } else if (matchesToday && inRange(nowMin, from, to)) {
      return true;
    }
  }
  return matchesToday ? false : null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Is the place open right now? `loc` (the place's coordinate) enables zmanim for
 * Hebrew schedules that reference sunrise/candle-lighting/nightfall. Returns null
 * when it cannot be determined (never a false "closed").
 */
export function isCurrentlyOpen(hoursStr: string | undefined, loc?: Loc, nowArg?: Date): boolean | null {
  if (!hoursStr) return null;
  const s = hoursStr.trim();
  if (!s || s === 'אין כרגע') return null;
  if (s === '24/7' || s === '24 שעות' || /פתוח\s*24|כל\s*שעות\s*היממה|כל\s*שעות\s*היום/.test(s)) return true;

  const now = nowArg ?? new Date();
  const today = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (/[א-ת]/.test(s)) {
    const z = loc ? zmanim(now, loc) : null;
    return evalHebrew(s, today, nowMin, z, isSummer(now));
  }

  // OSM (English) path
  let result: boolean | null = null;
  for (const clause of s.split(';')) { const r = evalClause(clause, today, nowMin); if (r !== null) result = r; }
  return result;
}

// ── Today's hours (for PlaceCard list) ───────────────────────────────────────

function getClauseTodayTimeOsm(raw: string, today: number): string | false | null {
  let clause = raw.replace(/"[^"]*"/g, '').trim();
  if (!clause || /sunset|sunrise/i.test(clause) || /^\s*ph\s/i.test(clause) || /\bunknown\b/i.test(clause)) return null;
  const om = clause.match(/^([A-Za-z]{2}(?:[-,][A-Za-z]{2})*)\s+(.+)$/);
  let daySpec: string | null = null, timeBlock: string;
  if (om) { daySpec = om[1]; timeBlock = om[2]; } else { timeBlock = clause; }
  if (daySpec) { const days = parseDaySpec(daySpec, false); if (days.length === 0) return null; if (!days.includes(today)) return null; }
  timeBlock = timeBlock.trim();
  if (/^(off|closed)$/i.test(timeBlock)) return false;
  return timeBlock;
}

/** Today's time text for PlaceCard, e.g. "09:00-21:30" or "מעלות השחר עד 12:00". */
export function todayHoursStr(hoursStr: string | undefined): string | null {
  if (!hoursStr) return null;
  const s = hoursStr.trim();
  if (s === '24/7' || s === '24 שעות' || /פתוח\s*24|כל\s*שעות\s*היממה/.test(s)) return '24/7';
  const today = new Date().getDay();

  if (/[א-ת]/.test(s)) {
    for (const clause of s.split(/[;|]|\n/).map(c => c.trim()).filter(Boolean)) {
      const { dayPart, timePart } = splitDayTime(clause);
      const daySet = hebrewDays(dayPart);
      if (daySet === null && dayPart.trim() !== '') continue;
      if (daySet && !daySet.has(today)) continue;
      const tp = timePart.trim();
      if (tp) return tp;
    }
    return null;
  }

  let result: string | false | null = null;
  for (const clause of s.split(';')) { const r = getClauseTodayTimeOsm(clause, today); if (r !== null) result = r; }
  return typeof result === 'string' ? result : null;
}

// ── Display helpers ───────────────────────────────────────────────────────────

function translateDaySpec(daySpec: string): string {
  return daySpec.split(',').map(part => {
    const t = part.trim(); const rp = t.split('-');
    if (rp.length === 2) return `${DAY_HE_LABEL[rp[0]] ?? rp[0]}-${DAY_HE_LABEL[rp[1]] ?? rp[1]}`;
    return DAY_HE_LABEL[t] ?? t;
  }).join(', ');
}

export function shortHours(hoursStr: string | undefined): string | null {
  if (!hoursStr) return null;
  const s = hoursStr.trim();
  if (s === '24/7' || s === '24 שעות') return '24/7';
  if (/[א-ת]/.test(s)) return s.split(/[;|]|\n/)[0].trim();
  const clause = s.split(';')[0].trim();
  const m = clause.match(/^([A-Za-z,\-]+)\s+(.+)$/);
  return m ? `${translateDaySpec(m[1])} ${m[2]}` : clause;
}

export function fullHoursHebrew(hoursStr: string | undefined): string | null {
  if (!hoursStr) return null;
  const s = hoursStr.trim();
  if (s === '24/7' || s === '24 שעות') return 'פתוח 24/7';
  if (/[א-ת]/.test(s)) return s.split(/[;|]|\n/).map(c => c.trim()).filter(Boolean).join(' | ');
  return s.split(';').map(clause => {
    const c = clause.trim(); const m = c.match(/^([A-Za-z,\-]+)\s+(.+)$/);
    return m ? `${translateDaySpec(m[1])} ${m[2]}` : c;
  }).join(' | ');
}
