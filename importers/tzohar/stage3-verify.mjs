/**
 * Stage 3 (docs/CERT_REFRESH_DESIGN.md §10) decision logic — pure, no I/O,
 * no network. Takes already-fetched-and-parsed candidate results and
 * decides one outcome per our record. The async fetch orchestration lives
 * in stage3-report.mjs; this file is what makes the decision testable
 * without a network call or a worktree.
 *
 * THE RULE THE ARCHITECT REQUIRED BEFORE ANY OF THIS WAS BUILT (2026-08-26):
 * cluster membership decides what to LOOK AT, never what to TRUST. A
 * cluster-mate's validity signal is only usable if THAT SPECIFIC candidate
 * independently passes identity verification against OUR record — reading
 * its own certificate's own printed name/address, not "it was near the one
 * that matched." Two identity-verified candidates that disagree are
 * AMBIGUOUS_DATE, never a blind max — a blind max would import a
 * neighbouring, differently-certified business's date onto our record,
 * which is the exact wrong-business risk this whole design exists to catch,
 * arriving through the very door opened to fix cluster staleness.
 */
import { nameScore } from '../../scripts/shared/tzohar-identity-match.mjs';

function stripAllWhitespace(s) {
  return String(s ?? '').replace(/\s+/g, '');
}

/**
 * Does a certificate's own printed identity (parseIdentity()'s blob) match
 * OUR record? Whitespace is stripped entirely (not just collapsed) before
 * the containment check — confirmed necessary on real data: a business name
 * split across two PDF text lines rejoins as "הקוס ם" (a space in the
 * middle from the line join), which does not contain "הקוסם" as a
 * substring under ordinary whitespace normalization, only under full
 * stripping.
 *
 * Name match is the deciding signal. Address match is reported as
 * supporting evidence, not required — certificate address formatting
 * (abbreviations, unit numbers, "מרכז מסחרי" vs the street name alone) was
 * observed to vary more than name formatting across real certs, and
 * requiring it would produce false WRONG_BUSINESS calls for the SAME
 * business. This is a deliberate, stated design choice, not an oversight —
 * open to tightening once real address-mismatch data exists to tune it
 * against, the same way the plausibility bound in extraction was scoped.
 *
 * The name check tries the WHOLE normalized name first, then falls back to
 * checking EACH segment of a bilingual "Hebrew - English" name separately
 * (split on " - " / "–" / "-") — found necessary on a real record, "אמאיה -
 * amaia": the certificate prints only the Hebrew half, so requiring the
 * full bilingual string to appear verbatim always failed even though the
 * business plainly IS the one on the certificate. A segment match still
 * requires a real, specific token (not a generic word) to appear, so this
 * does not meaningfully loosen the check for a genuinely different business
 * — it only recovers the common case where our own name field carries more
 * language variants than the certificate prints.
 */
export function verifyIdentity(ourRecord, printedIdentityBlob) {
  if (!printedIdentityBlob) return { verified: false, nameMatches: false, addressMatches: null, reason: 'no identity text extracted from the certificate' };
  const blob = stripAllWhitespace(printedIdentityBlob).toLowerCase();
  const ourName = stripAllWhitespace(ourRecord.name).toLowerCase();
  if (!ourName) return { verified: false, nameMatches: false, addressMatches: null, reason: 'our record has no name to verify against' };

  const segments = String(ourRecord.name).split(/\s*[-–]\s*/).map((s) => stripAllWhitespace(s).toLowerCase()).filter((s) => s.length >= 2);
  const nameMatches = blob.includes(ourName)
    || nameScore(ourRecord.name, printedIdentityBlob) >= 0.85
    || segments.some((seg) => blob.includes(seg));

  let addressMatches = null;
  if (ourRecord.address) {
    const street = stripAllWhitespace(String(ourRecord.address).split(',')[0]).toLowerCase();
    addressMatches = street.length > 0 && blob.includes(street);
  }

  return {
    verified: nameMatches,
    nameMatches,
    addressMatches,
    reason: nameMatches ? 'printed identity contains our record\'s name' : 'printed identity does NOT contain our record\'s name',
  };
}

const TODAY = () => new Date().toISOString().slice(0, 10);

/**
 * The full Stage 3 decision for one of our records, given every candidate
 * (the Stage 2 match plus its coordinate cluster-mates) already fetched and
 * parsed. Never receives a network dependency — every candidate arrives
 * pre-resolved as one of: fetch failed, fetched but unreadable, or fetched
 * with an identity blob + validity signal to check.
 *
 * @param ourRecord - {name, address, certificateValidUntil}
 * @param candidates - Array<{
 *   tzoharId, certUrl,
 *   fetchStatus: 'ok' | 'unreachable',
 *   identityBlob?: string | null,   // present when fetchStatus === 'ok'
 *   validity?: {kind, value},       // present when fetchStatus === 'ok'
 * }>
 * @param today - injectable for deterministic tests; defaults to real today.
 */
export function resolveCertificate(ourRecord, candidates, { today = TODAY() } = {}) {
  if (candidates.length === 0) {
    return { kind: 'NOT_FOUND', reason: 'no live candidates to check (Stage 2 found nothing)' };
  }

  const fetched = candidates.filter((c) => c.fetchStatus === 'ok');
  if (fetched.length === 0) {
    return { kind: 'UNREACHABLE', reason: `all ${candidates.length} candidate(s) failed to fetch`, candidateCount: candidates.length };
  }

  const identityChecked = fetched.map((c) => ({ ...c, identity: verifyIdentity(ourRecord, c.identityBlob) }));
  const verified = identityChecked.filter((c) => c.identity.verified);

  if (verified.length === 0) {
    // "No candidate verified" has two different causes that must not be
    // conflated: a candidate whose identity text was extracted and does NOT
    // match ours (a real WRONG_BUSINESS signal) vs. a candidate where
    // identity extraction itself found nothing to check (a parsing gap —
    // confirmed on a real cert, amaia-1.pdf, before parseIdentity() was
    // fixed to handle its line layout; even with that fix, an unknown
    // future layout could still fail extraction, and this distinction is
    // what keeps that failure mode from silently reading as an identity
    // accusation it never actually made).
    const withBlob = identityChecked.filter((c) => c.identityBlob);
    if (withBlob.length === 0) {
      return {
        kind: 'UNREADABLE',
        reason: `${fetched.length} candidate certificate(s) fetched, but identity extraction found nothing to check on any of them — cannot confirm OR deny a match`,
        checked: identityChecked.map((c) => ({ tzoharId: c.tzoharId, reason: c.identity.reason })),
      };
    }
    return {
      kind: 'WRONG_BUSINESS',
      reason: `${withBlob.length} candidate certificate(s) had a readable printed identity, and none matched our record`,
      checked: identityChecked.map((c) => ({ tzoharId: c.tzoharId, identityBlob: c.identityBlob, reason: c.identity.reason })),
    };
  }

  const comparable = verified.filter((c) => c.validity?.kind && c.validity.kind !== 'unknown');
  if (comparable.length === 0) {
    return {
      kind: 'UNREADABLE',
      reason: `${verified.length} candidate(s) passed identity verification, but none yielded a parseable date or vintage`,
      verifiedTzoharIds: verified.map((c) => c.tzoharId),
    };
  }

  const distinctValues = [...new Map(comparable.map((c) => [`${c.validity.kind}:${c.validity.value}`, c.validity])).values()];

  if (distinctValues.length > 1) {
    return {
      kind: 'AMBIGUOUS_DATE',
      reason: `${comparable.length} identity-verified candidates disagree on validity — never resolved by taking the latest`,
      candidates: comparable.map((c) => ({ tzoharId: c.tzoharId, certUrl: c.certUrl, validity: c.validity })),
    };
  }

  const resolved = distinctValues[0];
  const priorValidUntil = ourRecord.certificateValidUntil ?? null;

  if (resolved.kind === 'expiry-date') {
    if (resolved.value < today) {
      // The business IS still on the live feed (we matched it, and this
      // value is independently identity-verified) but the document itself,
      // agreed on by every identity-verified candidate, is already in the
      // past. No amount of re-fetching finds a newer document, because
      // there isn't one on the feed right now — this is not a fetch/read/
      // ambiguity failure and it is not "verified as current."
      return {
        kind: 'LISTED_BUT_DOCUMENT_STALE',
        reason: `every identity-verified candidate agrees on ${resolved.value}, which is in the past (today: ${today}) — the business is still Tzohar-listed but no current document exists on the feed`,
        value: resolved.value,
        priorValidUntil,
        verifiedTzoharIds: verified.map((c) => c.tzoharId),
      };
    }
    return {
      kind: 'VERIFIED',
      reason: priorValidUntil === resolved.value ? 're-confirmed, unchanged' : `renewed: ${priorValidUntil ?? '(none on record)'} -> ${resolved.value}`,
      value: resolved.value,
      changed: priorValidUntil !== resolved.value,
      priorValidUntil,
      verifiedTzoharIds: verified.map((c) => c.tzoharId),
    };
  }

  // vintage-year: no established "expired" semantic for wineries in this
  // app today (certificateValidUntil isn't populated for them) — report as
  // verified/confirmed rather than inventing a staleness rule the owner
  // hasn't specified for this population.
  return {
    kind: 'VERIFIED',
    reason: `vintage confirmed: ${resolved.value}`,
    value: resolved.value,
    validityKind: 'vintage-year',
    changed: null,
    priorValidUntil,
    verifiedTzoharIds: verified.map((c) => c.tzoharId),
  };
}
