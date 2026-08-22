import { isCurrentlyOpen, todayHoursStr, shortHours, fullHoursHebrew } from '../openingHours';

/** 2026-08-19 is a Wednesday; 2026-08-21 a Friday; 2026-08-22 a Saturday. */
const wed = (h: number, m = 0) => new Date(2026, 7, 19, h, m);
const fri = (h: number, m = 0) => new Date(2026, 7, 21, h, m);
const sat = (h: number, m = 0) => new Date(2026, 7, 22, h, m);

const TEL_AVIV = { latitude: 32.0853, longitude: 34.7818 };

describe('isCurrentlyOpen — unknown input never reports "closed"', () => {
  it.each([undefined, '', '   ', 'אין כרגע'])('returns null for %p', (input) => {
    expect(isCurrentlyOpen(input, undefined, wed(12))).toBeNull();
  });

  it('returns null for a schedule it cannot parse', () => {
    expect(isCurrentlyOpen('בערך מתי שבא לנו', TEL_AVIV, wed(12))).toBeNull();
  });
});

describe('isCurrentlyOpen — always-open forms', () => {
  it.each(['24/7', '24 שעות', 'פתוח 24 שעות', 'כל שעות היממה'])('treats %p as open', (s) => {
    expect(isCurrentlyOpen(s, undefined, wed(3))).toBe(true);
  });
});

describe('isCurrentlyOpen — OSM syntax', () => {
  it('is open inside the window', () => {
    expect(isCurrentlyOpen('We 09:00-17:00', undefined, wed(12))).toBe(true);
  });

  it('is closed outside the window', () => {
    expect(isCurrentlyOpen('We 09:00-17:00', undefined, wed(18))).toBe(false);
  });

  it('is exclusive at the closing minute', () => {
    expect(isCurrentlyOpen('We 09:00-17:00', undefined, wed(17))).toBe(false);
    expect(isCurrentlyOpen('We 09:00-17:00', undefined, wed(16, 59))).toBe(true);
  });

  it('is inclusive at the opening minute', () => {
    expect(isCurrentlyOpen('We 09:00-17:00', undefined, wed(9))).toBe(true);
  });

  it('expands weekday ranges', () => {
    expect(isCurrentlyOpen('Su-Th 09:00-17:00', undefined, wed(12))).toBe(true);
    expect(isCurrentlyOpen('Su-Th 09:00-17:00', undefined, fri(12))).toBeNull();
  });

  it('handles a range that wraps past Saturday', () => {
    expect(isCurrentlyOpen('Fr-Su 10:00-14:00', undefined, sat(12))).toBe(true);
  });

  it('handles windows crossing midnight', () => {
    expect(isCurrentlyOpen('We 22:00-02:00', undefined, wed(23))).toBe(true);
  });

  it('handles multiple slots in one day', () => {
    const h = 'We 09:00-13:00,16:00-20:00';
    expect(isCurrentlyOpen(h, undefined, wed(10))).toBe(true);
    expect(isCurrentlyOpen(h, undefined, wed(14))).toBe(false);
    expect(isCurrentlyOpen(h, undefined, wed(17))).toBe(true);
  });

  it('honours an explicit "off" clause', () => {
    expect(isCurrentlyOpen('Mo-Fr 09:00-17:00; We off', undefined, wed(12))).toBe(false);
  });

  it('reads an open-ended "18:00+" slot', () => {
    expect(isCurrentlyOpen('We 18:00+', undefined, wed(20))).toBe(true);
    expect(isCurrentlyOpen('We 18:00+', undefined, wed(9))).toBe(false);
  });
});

describe('isCurrentlyOpen — Hebrew schedules', () => {
  it('reads a Hebrew weekday range', () => {
    expect(isCurrentlyOpen("א'-ה': 09:00-17:00", TEL_AVIV, wed(12))).toBe(true);
    expect(isCurrentlyOpen("א'-ה': 09:00-17:00", TEL_AVIV, wed(20))).toBe(false);
  });

  it('does not claim "closed" on a day the schedule never mentions', () => {
    expect(isCurrentlyOpen("א'-ה': 09:00-17:00", TEL_AVIV, sat(12))).not.toBe(true);
  });
});

describe('todayHoursStr', () => {
  it('returns 24/7 unchanged', () => {
    expect(todayHoursStr('24/7')).toBe('24/7');
  });

  it('returns null for missing input', () => {
    expect(todayHoursStr(undefined)).toBeNull();
  });
});

describe('display helpers', () => {
  it('shortHours translates OSM day codes to Hebrew letters', () => {
    expect(shortHours('Su-Th 09:00-17:00')).toBe("א'-ה' 09:00-17:00");
  });

  it('shortHours keeps a Hebrew schedule as-is (first clause only)', () => {
    expect(shortHours("א'-ה': 09:00-17:00 | ו': 09:00-14:00")).toBe("א'-ה': 09:00-17:00");
  });

  it('fullHoursHebrew joins every clause', () => {
    expect(fullHoursHebrew('Su-Th 09:00-17:00; Fr 09:00-14:00')).toBe(
      "א'-ה' 09:00-17:00 | ו' 09:00-14:00",
    );
  });

  it('fullHoursHebrew labels 24/7 in Hebrew', () => {
    expect(fullHoursHebrew('24/7')).toBe('פתוח 24/7');
  });

  it('every helper returns null for missing input', () => {
    expect(shortHours(undefined)).toBeNull();
    expect(fullHoursHebrew(undefined)).toBeNull();
  });
});
