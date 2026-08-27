/**
 * The ratchet-correction predicates and verification guard used by
 * validate-data.mjs's RATCHET_CORRECTIONS mechanism (Item 4 Unit 3,
 * 2026-08-27) — factored into their own module because validate-data.mjs
 * runs its entire check unconditionally at import time (no entry-point
 * guard; it reads real files and can call process.exit()), which makes it
 * unsafe to import from a test file. These three functions are pure and
 * side-effect-free, so they live here instead, and validate-data.mjs
 * imports them the same way it already imports isCertifiedByAppendOnlyViolation
 * from kashrut-write.mjs.
 *
 * See validate-data.mjs's RATCHET_CORRECTIONS array for the full design
 * rationale (why this exists, why entering/leaving instead of a net number,
 * why the guard reuses these predicates instead of re-expressing them).
 */

/** kosherType/PlaceType lists this module needs — kept in sync with validate-data.mjs's own FOOD_TYPES by the guard test below, not re-declared independently. */
export const FOOD_TYPES = new Set([
  'restaurant',
  'fast_food',
  'cafe',
  'coffee_cart',
  'juice_bar',
  'ice_cream_parlor',
  'bakery',
  'winery',
]);

export function isKashrutAuthorityUnknown(p) {
  return FOOD_TYPES.has(p.type) && (!p.kosherAuthorityGroup || p.kosherAuthorityGroup === 'unknown');
}

export function isFreeTextCertifierUnmapped(p) {
  return FOOD_TYPES.has(p.type) && Boolean(p.certifiedBy) && p.certifierId === undefined;
}

/**
 * Re-verifies one RATCHET_CORRECTIONS entry against the LIVE records being
 * validated right now — never trusts the entry's own ids at face value.
 * Returns null if the entry checks out, or a string describing exactly what
 * doesn't reconcile (which id, which direction, what the predicate actually
 * says about it) — a caller turns a non-null return into a HARD failure so a
 * broken correction entry cannot silently pass the very check it exists to
 * pass deliberately.
 *
 * @param {{key: string, from: number, to: number, entering: string[], leaving: string[], reason: string}} entry
 * @param {Map<string, object>} placesById
 * @param {(p: object) => boolean} predicateFn - the SAME predicate function the ratchet's own counting loop uses for this key, never a re-expressed copy.
 * @returns {string | null}
 */
export function verifyRatchetCorrection(entry, placesById, predicateFn) {
  if (!entry.reason || !entry.reason.trim()) {
    return `RATCHET_CORRECTIONS entry for "${entry.key}" (${entry.from} → ${entry.to}) has no reason.`;
  }
  const netClaimed = entry.entering.length - entry.leaving.length;
  const netActual = entry.to - entry.from;
  if (netClaimed !== netActual) {
    return `RATCHET_CORRECTIONS entry for "${entry.key}": entering(${entry.entering.length}) - leaving(${entry.leaving.length}) = ${netClaimed}, but the claimed movement ${entry.from} → ${entry.to} is ${netActual} — the ids do not reconcile with the numbers.`;
  }
  for (const id of entry.entering) {
    const record = placesById.get(id);
    if (!record) return `RATCHET_CORRECTIONS entry for "${entry.key}": entering id "${id}" does not exist in the current dataset.`;
    if (!predicateFn(record)) {
      return `RATCHET_CORRECTIONS entry for "${entry.key}": entering id "${id}" does not currently satisfy the ratchet's own predicate — this entry no longer describes what actually happened.`;
    }
  }
  for (const id of entry.leaving) {
    const record = placesById.get(id);
    if (!record) return `RATCHET_CORRECTIONS entry for "${entry.key}": leaving id "${id}" does not exist in the current dataset.`;
    if (predicateFn(record)) {
      return `RATCHET_CORRECTIONS entry for "${entry.key}": leaving id "${id}" STILL satisfies the ratchet's own predicate — this entry no longer describes what actually happened.`;
    }
  }
  return null;
}
