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
