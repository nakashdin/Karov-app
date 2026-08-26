/**
 * Stage 2 of docs/CERT_REFRESH_DESIGN.md §10 — score a candidate live Tzohar
 * store-feed entry against one of our own records, and decide whether a
 * confident match exists. Pure functions, no I/O, no network — takes both
 * sides as plain data so it can be tested without a detached worktree or a
 * live fetch.
 *
 * No single signal decides a match, per the design doc: name alone is
 * exactly the shape of the identity failure that already happened once (an
 * 82-business bundle, many branches sharing a name); address-string alone
 * and filename alone were both separately proven unreliable elsewhere in
 * this project. This combines normalized name similarity, geographic
 * distance (haversine — Tzohar's feed always has lat/lng, ours nearly
 * always does), and an exact-phone override when both sides have one.
 *
 * This is Stage 2 only. Stage 3 (re-reading the fetched certificate PDF's
 * own printed identity) is a separate, later check this module does not and
 * cannot perform — it has no access to the certificate document itself.
 * Nothing this module returns may be applied to data without Stage 3 also
 * agreeing.
 */

function normalizeName(s) {
  if (!s) return '';
  return String(s)
    .replace(/["'׳״“”‘’]/g, '') // gershayim/quotes — punctuation noise, not identity
    .replace(/[־\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Levenshtein distance, normalized to a 0..1 similarity (1 = identical). */
function levenshteinSimilarity(a, b) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const m = a.length, n = b.length;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  const dist = prev[n];
  return 1 - dist / Math.max(m, n);
}

/** Name score: exact/substring gets a strong floor, otherwise edit-distance similarity. */
export function nameScore(ourName, liveName) {
  const a = normalizeName(ourName);
  const b = normalizeName(liveName);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return Math.max(0.85, levenshteinSimilarity(a, b));
  return levenshteinSimilarity(a, b);
}

function toRad(deg) { return (deg * Math.PI) / 180; }

/** Great-circle distance in km. Returns null if either point is missing. */
export function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v === null || v === undefined || Number.isNaN(v))) return null;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Distance score: close is a strong signal, far is not — thresholds are a proposal, not settled. */
export function distanceScore(distanceKm) {
  if (distanceKm === null) return null; // no signal, not a zero — see combine()
  if (distanceKm <= 0.5) return 1;
  if (distanceKm <= 2) return 0.6;
  if (distanceKm <= 5) return 0.25;
  return 0;
}

function normalizePhone(p) {
  if (!p) return '';
  return String(p).replace(/[^\d]/g, '').replace(/^972/, '0').replace(/^0*/, '0');
}

/** Phone score: exact normalized match is a strong positive; absence on either side is neutral, never a penalty. */
export function phoneScore(ourPhone, livePhone) {
  const a = normalizePhone(ourPhone);
  const b = normalizePhone(livePhone);
  if (!a || !b) return null; // no signal
  return a === b ? 1 : 0;
}

/**
 * Combine the three signals into one score, 0..1. Filenames are explicitly
 * NOT a signal — confirmed unreliable (Tzohar's own filenames don't match
 * their business names: dikkkkknter.pdf for יקב דיקנטר, Cheetah.pdf for יקב
 * צ'יטה) — this function never receives or looks at a URL.
 */
export function scoreCandidate(ourRecord, liveEntry) {
  const name = nameScore(ourRecord.name, liveEntry.store);
  const distKm = haversineKm(
    ourRecord.location?.latitude, ourRecord.location?.longitude,
    liveEntry.lat, liveEntry.lng,
  );
  const dist = distanceScore(distKm);
  const phone = phoneScore(ourRecord.phone, liveEntry.phone);

  // Exact phone match is a strong override — phone numbers are rarely
  // shared between different branches even when name and city coincide.
  if (phone === 1) {
    return { score: Math.max(0.95, 0.5 * name + 0.5 * (dist ?? 0)), name, distKm, dist, phone, breakdown: 'phone-match-override' };
  }

  const distComponent = dist ?? 0.3; // no coordinates on one side: mild neutral fill, not a zero-out
  // Same weights regardless of the phone signal, deliberately — the penalty
  // below is the ONLY thing a mismatched phone changes. Making the weights
  // themselves differ between the phone===0 and phone===null branches was
  // an earlier version of this function's actual bug: it let the intended
  // -0.25 penalty be removed by a sabotage test without any test failing,
  // because the weight-sum difference (0.75 vs 1.0) was silently doing the
  // job instead. Found by firing that exact negative control, not by
  // reading the code.
  const weights = { name: 0.6, dist: 0.4 };
  const score = weights.name * name + weights.dist * distComponent - (phone === 0 ? 0.25 : 0);

  return { score: Math.max(0, Math.min(1, score)), name, distKm, dist, phone, breakdown: 'weighted' };
}

/**
 * Stage 2's decision: score every live candidate against one of our
 * records, and only declare a match when the best candidate both clears a
 * confidence floor AND is clearly separated from the runner-up — "good
 * enough and nothing else is close," not "best of a weak field."
 *
 * Thresholds are proposals (docs/CERT_REFRESH_DESIGN.md §10), not settled —
 * flagged here at the point they're used, same discipline as the
 * includeSilentConservative comment in kashrut-conflict-resolution.mjs.
 */
export function matchTzoharRecord(ourRecord, liveEntries, { minScore = 0.7, minMargin = 0.15 } = {}) {
  const scored = liveEntries
    .map((entry) => ({ entry, ...scoreCandidate(ourRecord, entry) }))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { status: 'unmatched', reason: 'no live candidates supplied', candidates: [] };
  }

  const [best, runnerUp] = scored;
  const margin = runnerUp ? best.score - runnerUp.score : best.score;

  if (best.score < minScore) {
    return { status: 'unmatched', reason: `best candidate score ${best.score.toFixed(2)} below floor ${minScore}`, candidates: scored.slice(0, 5) };
  }
  if (margin < minMargin) {
    return {
      status: 'ambiguous',
      reason: `top two candidates within ${margin.toFixed(2)} of each other (floor ${minMargin}) — not clearly separated`,
      candidates: scored.slice(0, 5),
    };
  }
  return { status: 'matched', matchedEntry: best.entry, score: best.score, breakdown: best, candidates: scored.slice(0, 5) };
}
