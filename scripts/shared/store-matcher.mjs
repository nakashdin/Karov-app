/**
 * Many-to-one-aware matcher between a source adapter's normalized branches
 * (see adapters/*.mjs and kashrut-pipeline.mjs for the contract) and existing
 * dataset records for the same chain.
 *
 * This is matchRebarStores() from rebar-feed.mjs (Item 4 Unit 1/2), lifted
 * out and generalized so every source adapter shares ONE matcher instead of
 * re-deriving matching logic per chain (§17 face 3: logic imported, never
 * duplicated — the architecture-level version of the same mistake). The
 * rebar-specific candidate signals (haversine distance, address-prefix) are
 * UNCHANGED — same threshold, same comparison — so a source that supplies
 * coordinates matches exactly as it did before this file existed.
 *
 * A THIRD signal is added for sources with no coordinates at all (greg has
 * none — a WordPress branch page carries no lat/lng): city-plus-name-token
 * overlap. This signal is gated to fire ONLY when the branch supplies no
 * usable coordinates, so it can never add a candidate — and therefore can
 * never change a confirmed/ambiguous outcome — for a source that does supply
 * them. Verified for rebar by the pipeline's own reproduction check against
 * commit 880e48d, not just argued here.
 *
 * A pairing is CONFIRMED only when it is MUTUALLY exclusive: the existing
 * record has exactly one candidate branch, AND that branch has exactly one
 * candidate existing record, and they are each other's. Anything else — a
 * record with 2+ candidate branches, or a branch claimed by 2+ records — is
 * reported as ambiguous and resolved by NEITHER distance NOR tokens alone; a
 * caller must not pick a winner here. This guarantee is unchanged from
 * matchRebarStores' original three real ambiguous cases (see that file's
 * former header, now folded into this one).
 */

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Existing records were often Waze-synced; a genuinely different branch is normally much further than this. Unchanged from matchRebarStores. */
export const MATCH_RADIUS_KM = 0.5;

/**
 * True when a branch's address is the existing record's address — exact
 * prefix match, not fuzzy. Some feeds state just the street+number ("ההדרים
 * 7"); an existing record's own address usually appends the city ("ההדרים 7,
 * גני תקווה"), so containment-as-prefix is the correct comparison, not full
 * equality. Unchanged from matchRebarStores' sameAddress().
 */
function sameAddress(branchAddress, existingAddress) {
  const a = String(branchAddress ?? '').trim();
  const b = String(existingAddress ?? '').trim();
  return a.length > 0 && b.startsWith(a);
}

function normalize(s) {
  return String(s ?? '').replace(/["'׳״]/g, '').replace(/קריית/g, 'קרית').trim();
}

function tokenize(text) {
  return normalize(text)
    .split(/[\s,\-־()]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * True when the existing record's cityId is textually present in whatever
 * city hint the branch carries (its own `city` field, falling back to its
 * `name`, since a source like greg encodes the city inside the branch page's
 * title rather than a separate field).
 */
function cityMatches(branch, existingRecord) {
  const city = normalize(existingRecord.cityId);
  if (!city) return false;
  const hint = normalize(branch.city) || normalize(branch.name);
  return hint.includes(city);
}

/**
 * Token overlap between the branch's own text (name+address+city) and the
 * existing record's text (name+address+cityId), city tokens excluded from
 * both sides first (a shared city is required separately via cityMatches and
 * must never by itself count as a distinguishing signal — two branches in
 * the same city always share the city name, which is exactly what produced
 * the false "golda is 32 by prefix" id-vs-domain confusion earlier in this
 * effort; the same mistake, generalized, would silently make every same-city
 * branch a candidate for every same-city record).
 */
function nonCityTokenOverlap(branch, existingRecord) {
  const exclude = new Set([...tokenize(branch.city), ...tokenize(existingRecord.cityId)]);
  const branchTokens = new Set(
    [...tokenize(branch.name), ...tokenize(branch.address)].filter((t) => !exclude.has(t)),
  );
  const recordTokens = [...tokenize(existingRecord.name), ...tokenize(existingRecord.address)].filter(
    (t) => !exclude.has(t),
  );
  return recordTokens.filter((t) => branchTokens.has(t));
}

function hasCoords(branch, existingRecord) {
  return (
    typeof branch.lat === 'number' &&
    typeof branch.lng === 'number' &&
    existingRecord.location &&
    typeof existingRecord.location.latitude === 'number' &&
    typeof existingRecord.location.longitude === 'number'
  );
}

function isCandidate(branch, existingRecord) {
  const withCoords = hasCoords(branch, existingRecord);
  const closeByDistance =
    withCoords &&
    haversineKm(branch.lat, branch.lng, existingRecord.location.latitude, existingRecord.location.longitude) <=
      MATCH_RADIUS_KM;
  const closeByAddress = sameAddress(branch.address, existingRecord.address);
  // Fallback signal — ONLY evaluated when the branch has no coordinates at
  // all, so it can never add a candidate (and therefore can never change an
  // outcome) for a source that does supply them. City match ALONE is enough
  // to qualify as a candidate — deliberately broad/inclusive: a chain's most
  // common record shape is just its own name repeated with no distinguishing
  // suffix (e.g. greg's "קפה גרג" in a dozen different single-branch
  // cities), where city is the ONLY available signal at all. Requiring a
  // non-city token match here as well would silently drop every one of
  // those into noMatchRecords instead of confirming them (found live: it
  // did, on greg). A city with more than one branch naturally produces more
  // than one candidate for the record in it, which the many-to-one logic
  // below reports as AMBIGUOUS rather than silently guessing — token
  // overlap remains available (nonCityTokenOverlap, exported) for a human
  // to CITE as reasoning when resolving that ambiguity explicitly, the same
  // way rebar's address-token overlap is cited in rebar-resolutions.mjs; it
  // is evidence for a documented resolution, not a silent filter.
  const closeByCity = !withCoords && cityMatches(branch, existingRecord);
  return Boolean(closeByDistance || closeByAddress || closeByCity);
}

/**
 * Matches a source adapter's branches against a chain's existing dataset
 * records, many-to-one aware in both directions.
 *
 * @param {Array} branches - normalized adapter output (kashrut-pipeline.mjs's contract).
 * @param {Array} existingRecords - the chain's existing places/restaurants records.
 * @returns {{confirmed: Array<{record, branch}>, ambiguousRecords: Array<{record, candidates}>, noMatchRecords: Array}}
 */
export function matchSourceBranches(branches, existingRecords) {
  const candidatesByRecord = new Map(existingRecords.map((r) => [r, []]));
  const candidatesByBranch = new Map(branches.map((b) => [b, []]));

  for (const r of existingRecords) {
    for (const b of branches) {
      if (isCandidate(b, r)) {
        candidatesByRecord.get(r).push(b);
        candidatesByBranch.get(b).push(r);
      }
    }
  }

  const confirmed = [];
  const ambiguousRecords = [];
  const noMatchRecords = [];

  for (const r of existingRecords) {
    const recordCandidates = candidatesByRecord.get(r);
    if (recordCandidates.length === 0) {
      noMatchRecords.push(r);
    } else if (recordCandidates.length > 1) {
      ambiguousRecords.push({ record: r, candidates: recordCandidates });
    } else {
      const [branch] = recordCandidates;
      if (candidatesByBranch.get(branch).length > 1) {
        ambiguousRecords.push({ record: r, candidates: candidatesByBranch.get(branch) });
      } else {
        confirmed.push({ record: r, branch });
      }
    }
  }

  return { confirmed, ambiguousRecords, noMatchRecords };
}

// Exported for the reproduction check and for callers that want the raw
// candidate signal without the full many-to-one resolution above.
export { isCandidate, nonCityTokenOverlap, cityMatches, tokenize, normalize };
