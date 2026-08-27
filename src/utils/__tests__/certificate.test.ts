import { getCertificateState, isCertificateExpired } from '../certificate';

// A fixed "today" makes past/future dates deterministic regardless of when
// the suite actually runs.
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-08-24T12:00:00Z'));
});
afterEach(() => jest.useRealTimers());

describe('getCertificateState', () => {
  it('is "valid" when the known expiry date is in the future', () => {
    expect(getCertificateState({ certificateValidUntil: '2027-01-01' })).toBe('valid');
  });

  it('is "expired" when the known expiry date has passed', () => {
    expect(getCertificateState({ certificateValidUntil: '2025-01-01' })).toBe('expired');
  });

  it('is "unknown" — NOT expired — when kashrut info exists but no expiry date is on record', () => {
    // This is the core rule: an information gap is not evidence of a lapse.
    expect(getCertificateState({ certifiedBy: 'רבנות מקומית' })).toBe('unknown');
    expect(getCertificateState({ kosherType: 'kosher' })).toBe('unknown');
    expect(getCertificateState({ kosherAuthority: 'tzohar' })).toBe('unknown');
    expect(getCertificateState({ kosherAuthorityGroup: 'rabbinate' })).toBe('unknown');
  });

  it('is "none" when there is no kashrut information at all', () => {
    expect(getCertificateState({})).toBe('none');
  });
});

describe('isCertificateExpired', () => {
  it('is false for a place with no expiry date on record (unknown, not expired)', () => {
    expect(isCertificateExpired({ certifiedBy: 'צהר' })).toBe(false);
  });

  it('is false for a place with no kashrut info at all', () => {
    expect(isCertificateExpired({})).toBe(false);
  });

  it('is true only once the known date has actually passed', () => {
    expect(isCertificateExpired({ certificateValidUntil: '2026-08-23' })).toBe(true);
    expect(isCertificateExpired({ certificateValidUntil: '2026-08-24' })).toBe(false); // today itself is still valid
    expect(isCertificateExpired({ certificateValidUntil: '2026-08-25' })).toBe(false);
  });
});

describe('the UTC/local timezone boundary (2026-08-27 finding)', () => {
  // getCertificateState previously used new Date().toISOString().slice(0,10)
  // (UTC) instead of localDateISO() (local). The bug only shows up for an
  // instant that falls on DIFFERENT calendar days in UTC vs. Israel's local
  // time (UTC+3) — the beforeEach above (UTC noon) never touches that
  // window, so it could not have caught this. This block deliberately picks
  // an instant inside that window: 2026-09-11T23:00:00Z is 2026-09-12
  // 02:00 local — September 11 in UTC, September 12 in local time. A
  // record whose certificate expires 2026-09-11 has ALREADY lapsed by local
  // clock at this instant; the buggy UTC form would still call it 'valid'.
  it('reports a cert expiring "today" (2026-09-11) as EXPIRED once local time has already rolled to 2026-09-12, even though UTC has not', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 8, 11, 23, 0, 0)));
    try {
      expect(getCertificateState({ certificateValidUntil: '2026-09-11' })).toBe('expired');
      expect(isCertificateExpired({ certificateValidUntil: '2026-09-11' })).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('still reports the same cert as VALID for an instant safely inside 2026-09-11 local time (the day it actually expires)', () => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2026, 8, 11, 6, 0, 0))); // 2026-09-11T09:00 local
    try {
      expect(getCertificateState({ certificateValidUntil: '2026-09-11' })).toBe('valid');
    } finally {
      jest.useRealTimers();
    }
  });
});
