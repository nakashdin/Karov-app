import type { Place } from '../types';
import { localDateISO } from './date';

/**
 * Runtime certificate state for a place's kashrut certification.
 *
 * - 'valid'   — a real certificate with a known expiry date, not yet passed.
 * - 'expired' — a real certificate with a known expiry date that has passed.
 * - 'unknown' — kashrut info exists (an authority/type is on record) but
 *               Karov has no certificate document or expiry date for it.
 *               This is an information gap, not evidence the business lost
 *               its certification — never treat it as 'expired'.
 * - 'none'    — no kashrut information at all.
 */
export type CertificateState = 'valid' | 'expired' | 'unknown' | 'none';

/**
 * Fields relevant to certificate state. Deliberately not Tzohar-specific —
 * any future authorized certification source (its own authority name, its
 * own `kosherCertUrl` document, its own `certificateValidUntil`) is read the
 * same way. Nothing here should be populated without real evidence for it.
 */
type CertifiablePlace = Pick<
  Place,
  'certifiedBy' | 'kosherType' | 'kosherAuthority' | 'kosherAuthorityGroup' | 'certificateValidUntil'
>;

const hasKashrutInfo = (place: CertifiablePlace): boolean =>
  !!(place.certifiedBy || place.kosherType || place.kosherAuthority || place.kosherAuthorityGroup);

/**
 * Computed fresh against the current device date on every call — never baked
 * into the build at build time. A missing `certificateValidUntil` is never
 * treated as expired: it means Karov doesn't have the certificate for that
 * branch, not that a certificate lapsed.
 *
 * Uses `localDateISO()`, never `new Date().toISOString().slice(0, 10)`
 * (UTC) — found live, 2026-08-27, as the SAME bug already fixed twice in
 * scripts/ write paths, this time in already-live display/filter code.
 * Israel is UTC+3: on the night 152 certificates all expire simultaneously
 * (2026-09-11 → 09-12), the UTC form would make this function report
 * 'valid' for all 152 during the ~2-3 hours after Israeli local midnight
 * when they have, in fact, already lapsed — the app asserting a
 * certificate is current at the exact hour it stops being true, across
 * every one of them at once. This is the highest-stakes claim this app
 * makes about a place; do not revert this to `toISOString()`.
 */
export function getCertificateState(place: CertifiablePlace): CertificateState {
  if (!place.certificateValidUntil) {
    return hasKashrutInfo(place) ? 'unknown' : 'none';
  }
  const todayISO = localDateISO();
  return place.certificateValidUntil < todayISO ? 'expired' : 'valid';
}

export function isCertificateExpired(place: CertifiablePlace): boolean {
  return getCertificateState(place) === 'expired';
}
