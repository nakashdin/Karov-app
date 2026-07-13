// OSM opening_hours lightweight parser — handles the most common formats.
// Returns true (open), false (closed), or null (can't determine).

const DAY_MAP: Record<string, number> = {
  Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0,
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
    // Match "Mo-Fr 09:00-21:00" or "Mo,We 10:00-18:00"
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

/** Returns a short display string for the card (first clause only). */
export function shortHours(hoursStr: string | undefined): string | null {
  if (!hoursStr) return null;
  const s = hoursStr.trim();
  if (s === '24/7') return '24/7';
  // Return first clause, trimmed
  return s.split(';')[0].trim();
}
