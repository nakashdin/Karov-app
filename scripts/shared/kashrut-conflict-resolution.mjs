/**
 * Item 4 (owner directive, docs/KASHRUT_FACTS.md §18e-i/§18e-ii): resolves a
 * places.osm.json vs. restaurants.osm.json kashrut-field conflict for one
 * shared id, per the owner's rule —
 *
 *   "The value actually supported by the source evidence wins, regardless
 *    of which dataset currently contains it."
 *
 * — never "places.osm.json wins because it's the main dataset" (explicitly
 * rejected by the owner) and never raw-string equality between the two
 * sides' certifiedBy citations (explicitly required: resolve through the
 * registry alias map).
 *
 * BUILD-ONLY. Nothing in this file reads or writes
 * src/data/generated/*. It is a pure function of its arguments — no file
 * I/O, no registry loading — so the caller supplies an already-loaded
 * `aliasMap` (raw certifiedBy string -> {authorityId, level}, same shape
 * scripts/validate-data.mjs and scripts/shared/kashrut-write.mjs already
 * load from scripts/reports/kashrut-registry.json). This is deliberate:
 * a THIRD copy of the registry-loading boilerplate in this file would be
 * exactly the duplication docs/KASHRUT_FACTS.md §17 face 3 warns about,
 * and a pure function is what makes every branch below testable without a
 * detached worktree or any dataset file at all.
 *
 * DO NOT WIRE THIS INTO A MERGE SCRIPT THAT WRITES DATA YET. The owner has
 * authorised building and testing this logic, not applying it — see the
 * carve-out note on resolveKosherTypeConflict() below, which is the actual
 * reason application is being held, not caution for its own sake.
 */

/** kosherType values that assert a specific kashrut level. Kept in sync
 * with scripts/validate-data.mjs and scripts/shared/kashrut-write.mjs. */
export const LEVEL_ASSERTING_KOSHER_TYPES = new Set(['mehadrin', 'rabanut_mehadrin', 'rabanut_mehadrin_jerusalem']);

/**
 * The only level value the registry (or KashrutBasis) ever asserts other
 * than null — see kashrut-write.mjs's basisSupportsLevelAssertion(), which
 * hardcodes the same comparison for the same reason: there is currently no
 * second level in this system to generalise for.
 */
const ASSERTED_LEVEL = 'mehadrin';

function hasValue(v) {
  return v !== undefined && v !== null && v !== '';
}

function normalizeWhitespace(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}

/** True if `longer` is a legitimate append-only textual extension of `shorter` (or equal, or shorter is empty). */
function isExtension(shorter, longer) {
  const shorterText = hasValue(shorter) ? String(shorter) : '';
  const longerText = hasValue(longer) ? String(longer) : '';
  if (!shorterText) return true; // nothing to extend from
  if (shorterText === longerText) return true;
  return normalizeWhitespace(longerText).includes(normalizeWhitespace(shorterText));
}

/**
 * Resolve a kosherType disagreement between places.osm.json ("places") and
 * restaurants.osm.json ("mirror") for one shared id.
 *
 * Handles precisely the shape docs/KASHRUT_FACTS.md §18e-ii measured and
 * adjudicated: exactly one side asserts a level-asserting kosherType
 * (mehadrin / rabanut_mehadrin / rabanut_mehadrin_jerusalem) and the other
 * does not. Resolution is evidence-based, through the registry alias map,
 * on the ELEVATING side's own certifiedBy — never a raw-string comparison
 * of the two kosherType values themselves:
 *
 *   · certifiedBy resolves to a NAMED BODY (alias.authorityId present) —
 *     the level was inferred from the body, which §5b records as never
 *     legitimate. UNSUPPORTED. The non-elevating side wins.
 *     (branch: 'body-name-unsupported' — the 6 the validator's own
 *     levelAssertedOverNamedBody predicate already flags.)
 *   · certifiedBy resolves in the registry but NOT to the asserted level
 *     (level is null, or some other value, and authorityId is also absent
 *     or irrelevant) — same defect, invisible to that predicate (§15a).
 *     UNSUPPORTED. The non-elevating side wins.
 *     (branch: 'registry-level-mismatch' — the 7 the proxy misses.)
 *   · certifiedBy resolves in the registry TO the asserted level
 *     (authorityId null, level === 'mehadrin') — the source text itself
 *     states the level. SUPPORTED. The elevating side wins.
 *     (branch: 'registry-level-match' — the 20.)
 *   · the elevating side has no certifiedBy at all — nothing to resolve
 *     against. UNRESOLVED, conservative (non-elevating) value, left alone.
 *     (branch: 'no-certifiedBy-unadjudicable' — the 7.)
 *
 * Every other shape (both sides agree, neither elevates, both elevate to
 * different values, etc.) falls to a general UNRESOLVED branch — this
 * function does not invent an adjudication rule for a population the
 * owner's directive did not specify one for.
 *
 * carve-out note, read before ever wiring this into a write path: for the
 * 13 ids where this resolves to 'mirror' (body-name-unsupported +
 * registry-level-mismatch), the resolved value is IDENTICAL to what item
 * 2's (the 358) proposed remediation would also produce, on a subset of
 * the same defect population. Applying this function's output to data
 * before the owner has seen item 2's evidence report performs item 2's
 * downgrade through item 4's door.
 *
 * That is why these 13 (and only these 13) carry `held: 'item-2-gated'`
 * on the returned result, per kosher-app-39's (the Reviewer's) proposed
 * acceptance predicate for this work (docs/owner-directive-acceptance-
 * predicate.md §5 — a reviewer's criteria for judging work on the
 * owner's directive, not text the owner wrote; the doc's title
 * originally read as the reverse, corrected at a52a05b, and this
 * corrects the same misreading here): resolve the full population
 * INCLUDING the thirteen — do not special-case them out of the function
 * — and mark them for a caller to emit rather than apply. This keeps
 * the rule complete and verifiable across every conflict, lets the
 * thirteen appear in item 2's eventual report as "resolved pending
 * authorisation" (which strengthens that report rather than requiring
 * item 2 to re-derive them), and means nothing has to be remembered
 * separately once item 2 is authorised — a caller that ignores `held`
 * and applies every non-'unresolved' winner unconditionally is the one
 * thing this module cannot prevent by itself; that check belongs to
 * whatever eventually calls this, which does not exist yet.
 *
 * `includeSilentConservative` (default false) controls a SEPARATE,
 * narrower population than the audited 40: ids where one side elevates
 * and the other has no kosherType AT ALL, rather than an explicit
 * non-elevating value. The Architect's ruling (2026-08-26): absent is
 * not evidence for the conservative value — a record with no kosherType
 * asserts nothing, and treating silence as if it were the conservative
 * claim is the mirror image of the exact error this function exists to
 * stop (treating a body name as if it were a level claim). That 18-
 * record population is a claim-vs-silence question, which belongs to
 * the merge/admission design, not this conflict rule — so by default
 * those ids resolve to 'unresolved' (branch 'conservative-side-silent')
 * without ever reaching the registry logic below. Pass
 * `includeSilentConservative: true` to apply the exact same rule to
 * that population anyway (the capability is kept because it costs
 * nothing and the underlying evidence logic doesn't change — only the
 * default is narrowed).
 */
export function resolveKosherTypeConflict({ id, placesKosherType, placesCertifiedBy, mirrorKosherType, mirrorCertifiedBy, aliasMap, includeSilentConservative = false }) {
  const placesElevates = LEVEL_ASSERTING_KOSHER_TYPES.has(placesKosherType);
  const mirrorElevates = LEVEL_ASSERTING_KOSHER_TYPES.has(mirrorKosherType);

  if (placesKosherType === mirrorKosherType) {
    return {
      id, field: 'kosherType', winner: 'agree', resolvedValue: placesKosherType, conservativeValue: placesKosherType,
      branch: 'no-conflict', held: null, reason: 'both sides already hold the same value',
    };
  }

  if (placesElevates !== mirrorElevates) {
    const elevatedSide = placesElevates ? 'places' : 'mirror';
    const conservativeSide = placesElevates ? 'mirror' : 'places';
    const elevatedKosherType = placesElevates ? placesKosherType : mirrorKosherType;
    const conservativeKosherType = placesElevates ? mirrorKosherType : placesKosherType;
    const elevatedCertifiedBy = placesElevates ? placesCertifiedBy : mirrorCertifiedBy;

    // Do not flip this default because it "resolves more records" — that count is exactly
    // the wrong reason. Silence is not a conservative CLAIM; a record with no kosherType
    // asserts nothing, so treating its absence as evidence for the lower value is the same
    // error as treating a named body as evidence for mehadrin, pointed the other way. See
    // the includeSilentConservative doc comment above for the full reasoning.
    if (!hasValue(conservativeKosherType) && !includeSilentConservative) {
      return {
        id, field: 'kosherType', winner: 'unresolved', resolvedValue: null, conservativeValue: null,
        branch: 'conservative-side-silent', held: null,
        reason: `${elevatedSide} asserts ${JSON.stringify(elevatedKosherType)} while ${conservativeSide} has no kosherType at all — a positive claim vs. silence, not two contradictory claims. Not the audited-40 shape; left unresolved by default (pass includeSilentConservative:true to apply the same registry rule anyway).`,
      };
    }

    if (!hasValue(elevatedCertifiedBy)) {
      return {
        id, field: 'kosherType', winner: 'unresolved', resolvedValue: null, conservativeValue: conservativeKosherType,
        branch: 'no-certifiedBy-unadjudicable', held: null,
        reason: `${elevatedSide} asserts level-asserting kosherType ${JSON.stringify(elevatedKosherType)} with no certifiedBy to resolve it against — cannot adjudicate, left unresolved`,
      };
    }

    const entry = aliasMap?.get(elevatedCertifiedBy);
    if (entry?.authorityId) {
      return {
        id, field: 'kosherType', winner: conservativeSide, resolvedValue: conservativeKosherType, conservativeValue: conservativeKosherType,
        branch: 'body-name-unsupported', held: 'item-2-gated',
        reason: `${elevatedSide}'s certifiedBy ${JSON.stringify(elevatedCertifiedBy)} resolves to a named body (${entry.authorityId}), not a level — the level was inferred from the body, which FACTS §5b records as never legitimate; ${conservativeSide}'s non-elevating value is the evidence-supported one`,
      };
    }
    if (entry?.level === ASSERTED_LEVEL) {
      return {
        id, field: 'kosherType', winner: elevatedSide, resolvedValue: elevatedKosherType, conservativeValue: conservativeKosherType,
        branch: 'registry-level-match', held: null,
        reason: `${elevatedSide}'s certifiedBy ${JSON.stringify(elevatedCertifiedBy)} resolves in the registry to level "${ASSERTED_LEVEL}" — the source text itself states the level, so the elevation is evidence-supported`,
      };
    }
    return {
      id, field: 'kosherType', winner: conservativeSide, resolvedValue: conservativeKosherType, conservativeValue: conservativeKosherType,
      branch: 'registry-level-mismatch', held: 'item-2-gated',
      reason: `${elevatedSide}'s certifiedBy ${JSON.stringify(elevatedCertifiedBy)} does not resolve in the registry to level "${ASSERTED_LEVEL}" (${entry ? `resolves to level=${JSON.stringify(entry.level)}, authorityId=${JSON.stringify(entry.authorityId)}` : 'no registry entry at all'}) — same defect as body-name-unsupported, invisible to the validator's narrower proxy (FACTS §15a); ${conservativeSide}'s non-elevating value is the evidence-supported one`,
    };
  }

  // Both agree on whether they elevate (both do, to different specific
  // values; or neither does, but the values still differ — e.g. two
  // different named bodies). Not a shape the owner's directive specified
  // an adjudication rule for. Left unresolved rather than guessed.
  const bothElevateDifferently = placesElevates && mirrorElevates;
  return {
    id, field: 'kosherType', winner: 'unresolved', resolvedValue: null,
    conservativeValue: bothElevateDifferently ? null : (placesElevates ? mirrorKosherType : placesElevates === mirrorElevates ? null : placesKosherType),
    branch: 'unresolved-unspecified-shape', held: null,
    reason: bothElevateDifferently
      ? `both sides assert a level-asserting kosherType but different values (places=${JSON.stringify(placesKosherType)}, mirror=${JSON.stringify(mirrorKosherType)}) — no adjudication rule specified for this shape`
      : `neither side elevates but the values disagree (places=${JSON.stringify(placesKosherType)}, mirror=${JSON.stringify(mirrorKosherType)}) — no principled ordering between two non-elevating values; no adjudication rule specified for this shape`,
  };
}

/**
 * Resolve a certifiedBy disagreement between places and mirror for one
 * shared id. Uses the SAME append-only extension logic
 * (isCertifiedByAppendOnlyViolation's inverse) already enforced at every
 * live write via recordKashrutWrite() — imported from kashrut-write.mjs
 * rather than reimplemented, per FACTS §17 face 3.
 *
 * If one side's text is a legitimate append-only extension of the other
 * (including one side being empty), the more complete side wins — this is
 * not really a "conflict" in the source-evidence sense, just one side
 * having recorded more of the same evidence. If the two texts are
 * genuinely disjoint (neither extends the other), there is no registry-
 * resolvable or text-evidence basis in this dataset to prefer one citation
 * over the other, so this is UNRESOLVED with no suggested value — unlike
 * kosherType, there is no "more conservative" ordering between two
 * arbitrary non-empty citations, so conservativeValue is null rather than
 * guessed.
 */
export function resolveCertifiedByConflict({ id, placesCertifiedBy, mirrorCertifiedBy }) {
  const placesText = hasValue(placesCertifiedBy) ? String(placesCertifiedBy) : '';
  const mirrorText = hasValue(mirrorCertifiedBy) ? String(mirrorCertifiedBy) : '';

  if (normalizeWhitespace(placesText) === normalizeWhitespace(mirrorText)) {
    return {
      id, field: 'certifiedBy', winner: 'agree', resolvedValue: placesCertifiedBy ?? mirrorCertifiedBy, conservativeValue: placesCertifiedBy ?? mirrorCertifiedBy,
      branch: 'no-conflict', reason: 'both sides already hold the same value (modulo whitespace)',
    };
  }

  const mirrorExtendsPlaces = isExtension(placesText, mirrorText);
  const placesExtendsMirror = isExtension(mirrorText, placesText);

  if (mirrorExtendsPlaces && !placesText) {
    return {
      id, field: 'certifiedBy', winner: 'mirror', resolvedValue: mirrorCertifiedBy, conservativeValue: mirrorCertifiedBy,
      branch: 'fills-gap', reason: 'places has no certifiedBy; mirror supplies evidence places lacks entirely',
    };
  }
  if (placesExtendsMirror && !mirrorText) {
    return {
      id, field: 'certifiedBy', winner: 'places', resolvedValue: placesCertifiedBy, conservativeValue: placesCertifiedBy,
      branch: 'fills-gap', reason: 'mirror has no certifiedBy; places supplies evidence mirror lacks entirely',
    };
  }
  if (mirrorExtendsPlaces) {
    return {
      id, field: 'certifiedBy', winner: 'mirror', resolvedValue: mirrorCertifiedBy, conservativeValue: placesCertifiedBy,
      branch: 'mirror-extends-places', reason: `mirror's certifiedBy (${JSON.stringify(mirrorCertifiedBy)}) is a legitimate append-only extension of places' (${JSON.stringify(placesCertifiedBy)}) — more complete evidence`,
    };
  }
  if (placesExtendsMirror) {
    return {
      id, field: 'certifiedBy', winner: 'places', resolvedValue: placesCertifiedBy, conservativeValue: placesCertifiedBy,
      branch: 'places-extends-mirror', reason: `places' certifiedBy (${JSON.stringify(placesCertifiedBy)}) is a legitimate append-only extension of mirror's (${JSON.stringify(mirrorCertifiedBy)}) — more complete evidence`,
    };
  }
  return {
    id, field: 'certifiedBy', winner: 'unresolved', resolvedValue: null, conservativeValue: null,
    branch: 'unresolved-disjoint-citations',
    reason: `places (${JSON.stringify(placesCertifiedBy)}) and mirror (${JSON.stringify(mirrorCertifiedBy)}) hold genuinely different, non-overlapping certifiedBy text — neither extends the other, and there is no registry- or text-evidence basis in this function to prefer one citation over the other`,
  };
}

/**
 * THE single exported entry point a future merge is required to call
 * (FACTS §17 face 3: not logic duplicated at the call site). Dispatches to
 * the per-field resolver above. Throws for any field this module has not
 * been designed for yet, rather than silently no-op'ing or guessing.
 */
export function resolveKashrutFieldConflict(field, args) {
  if (field === 'kosherType') return resolveKosherTypeConflict(args);
  if (field === 'certifiedBy') return resolveCertifiedByConflict(args);
  throw new Error(
    `resolveKashrutFieldConflict: no resolution rule defined for field "${field}". ` +
    'Only kosherType and certifiedBy are covered — the fields FACTS §18e-i measured a disagreement ' +
    'population for. Do not add a field here without the same evidence-based design work the other two got.',
  );
}
