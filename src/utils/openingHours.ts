// OSM opening_hours lightweight parser — handles the most common formats.
// Returns true (open), false (closed), or null (can't determine).

const DAY_MAP: Record<string, number> = {
  Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0,
};

// Hebrew day abbreviations (Israeli week: Sun=א' … Sat=ש')
const DAY_HE: Record<string, string> = {
  Su: "א'", Mo: "ב'", Tu: "ג'", We: "ד'", Th: "ה'", Fr: "ו'", Sa: "ש'",
};

function expandDayRange(spec: string): number[] {
  spec = spec.trim();
  const parts = spec.split('-');
  if (parts.length === 2) {
    const start = DAY_MAP[parts[0]];
    const end   = DAY_MAP[parts[1]];
    if (start == null || end == null) return [];
    const days: number[] = [];
    let cur = start;
    for (let i = 0; i <= 7; i++) {
      days.push(cur);
      if (cur === end) break;
      cur = cur === 6 ? 0 : cur + 1;
    }
    return days;
  }
  const d = DAY_MAP[spec];
  return d != null ? [d] : [];
}

function parseTimeToMinutes(t: string): number | null {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function isCurrentlyOpen(hoursStr: string | undefined): boolean | null {
  if (!hoursStr) return null;
  const s = hoursStr.trim();
  if (s === '24/7') return true;

  const now     = new Date();
  const today   = now.getDay();        // 0=Sun … 6=Sat
  const minutes = now.getHours() * 60 + now.getMinutes();

  for (const clause of s.split(';')) {
    const c = clause.trim();
    const match = c.match(/^([A-Za-z,\-]+)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
    if (!match) continue;

    const daySpec = match[1];
    const from    = parseTimeToMinutes(match[2]);
    const to      = parseTimeToMinutes(match[3]);
    if (from == null || to == null) continue;

    const applicableDays = daySpec
      .split(',')
      .flatMap(d => expandDayRange(d));

    if (!applicableDays.includes(today)) continue;

    return minutes >= from && minutes < to;
  }

  return null;
}

/** Translate a single OSM day-range spec (e.g. "Su-Th") to Hebrew (e.g. "א'-ה'"). */
function translateDaySpec(daySpec: string): string {
  return daySpec
    .split(',')
    .map(part => {
      const trimmed = part.trim();
      const rangeParts = trimmed.split('-');
      if (rangeParts.length === 2) {
        const from = DAY_HE[rangeParts[0]] ?? rangeParts[0];
        const to   = DAY_HE[rangeParts[1]] ?? rangeParts[1];
        return `${from}-${to}`;
      }
      return DAY_HE[trimmed] ?? trimmed;
    })
    .join(', ');
}

/** Returns a short Hebrew display string for the card (first clause only). */
export function shortHours(hoursStr: string | undefined): string | null {
  if (!hoursStr) return null;
  const s = hoursStr.trim();
  if (s === '24/7') return '24/7';

  const clause = s.split(';')[0].trim();
  const match  = clause.match(/^([A-Za-z,\-]+)\s+(.+)$/);
  if (!match) return clause;

  return `${translateDaySpec(match[1])} ${match[2]}`;
}

/** Returns full Hebrew hours string with all clauses separated by " | ". */
export function fullHoursHebrew(hoursStr: string | undefined): string | null {
  if (!hoursStr) return null;
  const s = hoursStr.trim();
  if (s === '24/7') return 'פתוח 24/7';

  return s
    .split(';')
    .map(clause => {
      const c = clause.trim();
      const match = c.match(/^([A-Za-z,\-]+)\s+(.+)$/);
      if (!match) return c;
      return `${translateDaySpec(match[1])} ${match[2]}`;
    })
    .join(' | ');
}
