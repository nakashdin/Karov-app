/**
 * Rebar's own store-locator feed — the shared core for Item 4 Unit 1 (the
 * importer) and Unit 2 (remediating the 53 existing records), so both read
 * and match against the same live evidence via one code path (§17 face 3:
 * logic imported, never duplicated).
 *
 * Source: https://rebar.co.il/our-stores/. This is a Next.js App Router page
 * (confirmed: no __NEXT_DATA__, no /_next/data/ endpoint — App Router
 * streams data via React Server Components, not the older pages-router
 * static-props JSON). The RSC payload embeds the chain's own store-locator
 * JSON inside a giant streamed string literal — not a clean JSON island to
 * `JSON.parse`. Confirmed field order, stable across every fetch checked:
 * name, address, city, active, latitude, longitude, hasDelivery, hasPickup,
 * kosher, six opening-hour fields, four accessibility fields, forceClose,
 * open.
 *
 * `kosher` is a genuinely differentiated boolean — roughly half true, half
 * false across the feed, confirmed by fetching and counting, not assumed.
 * The feed's full key union has NO level field and NO authority field: that
 * is the evidence ceiling for anything built on this module.
 *
 * ENTRY COUNT IS NOT STABLE — do not cite one. Independent fetches on
 * 2026-08-26 returned 107, 115, and 120 parsed entries across different
 * attempts (some from genuine parser bugs — see ESCAPE DEPTH below — not
 * page volatility alone). What IS stable, and re-checked across every
 * fetch: the per-object KEY SET itself never varies, and none of them is a
 * level or authority field.
 *
 * ESCAPE DEPTH — the second real bug found here, more serious than the
 * first, and it corrupted the feed silently rather than failing loudly.
 * The RSC stream is DOUBLE-escaped, not single: the store array was
 * JSON.stringify'd once (escaping any literal `"` INSIDE a value, e.g. the
 * standard Hebrew abbreviation form רמב"ם, to `\"`), and that whole result
 * was then embedded as a string in the OUTER RSC wrapper, which escapes
 * the text AGAIN. The two escaping layers do NOT apply equally to every
 * quote in the stream: a STRUCTURAL quote (a JSON delimiter — the quotes
 * around `"name"` itself) was never escaped by the inner JSON.stringify
 * (it's the syntax that stringify PRODUCES, not literal content it had to
 * escape), so it only picks up ONE layer of backslash-escaping from the
 * outer wrapper: raw text shows `\"`. A quote that is part of a VALUE
 * (רמב"ם's internal `"`) went through the inner escaping too (`"`->`\"`),
 * and THAT two-character result (backslash, quote) is what the outer layer
 * escapes again — backslash->`\\`, quote->`\"` — producing FOUR raw
 * characters: `\\\"` (three backslashes, then a quote). Confirmed at the
 * codepoint level, not by counting characters in a rendered string.
 *
 * The original `[^\\"]*` capture (stop at the first backslash OR quote)
 * treated that internal 4-character sequence as the field's own closing
 * delimiter, truncating the value and breaking the rest of that store
 * object's match — which is why "חיפה- רמב"ם" (kosher:true, a real branch)
 * silently vanished from every earlier extraction attempt (107, 115) with
 * no error at all. Fixed below with an alternation that recognizes the
 * 4-character escaped-internal-quote sequence as PART of the value, not
 * its end — verified against the real captured bytes for this exact store,
 * including its real coordinates (32.8329875, 34.9857066), cross-checked
 * independently by the Architect via direct codepoint inspection before
 * this fix existed. Extraction was NOT re-implemented by string-surgery
 * pre-unescaping the whole stream first (tried, by the Architect, while
 * verifying this: two different brace-slicing attempts returned 131 and
 * 100 — string surgery on a doubly-escaped stream is exactly what
 * corrupts quote-bearing values in a new way each time). The fix parses
 * the raw stream directly, once, with a regex that understands both
 * escape depths where they actually differ.
 *
 * `hasDelivery`/`hasPickup` are not always boolean — at least two real
 * feed entries carry `null` for `hasDelivery`. Neither is used as
 * anything but a fixed-width anchor here, so the pattern tolerates
 * true/false/null without caring which.
 */

const FEED_URL = 'https://rebar.co.il/our-stores/';
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

// A value is a run of (any non-backslash character) OR (the 4-character
// escaped-internal-quote sequence: three literal backslashes then a quote —
// see ESCAPE DEPTH above). A real field terminator is a bare backslash+quote
// (2 characters), which matches NEITHER alternative, so the group correctly
// stops there without needing to be told where the value "should" end.
const VALUE = String.raw`(?:[^\\]|\\\\\\")*`;
const STORE_RE = new RegExp(
  String.raw`\\"name\\":\\"(${VALUE})\\",\\"address\\":\\"(${VALUE})\\",\\"city\\":\\"(${VALUE})\\",\\"active\\":(true|false),\\"latitude\\":([\d.-]+),\\"longitude\\":([\d.-]+),\\"hasDelivery\\":(?:true|false|null),\\"hasPickup\\":(?:true|false|null),\\"kosher\\":(true|false|null),`,
  'g',
);

/** A raw captured string, still carrying the 4-char escaped-internal-quote sequence where a value had a literal `"` — converted back to a real `"`. */
function unescapeValue(raw) {
  return raw.replace(/\\\\\\"/g, '"');
}

/**
 * Count of `"kosher":` anchors in the raw text (at the same one-backslash
 * escape depth as every other structural key — `kosher`'s VALUE is a bare
 * literal, never a string, so this specific anchor can never be confused by
 * escaped content inside a name/address/city value the way counting `"name"`
 * itself could be). This is the "compare against a known-good count"
 * countermeasure the extraction risk above calls for — computed here so a
 * caller can detect a parsing shortfall instead of silently returning fewer
 * stores than the feed actually contains, which is exactly how "חיפה- רמב"ם"
 * went missing from two earlier extraction attempts with no error at all.
 */
export function countStoreAnchors(rawText) {
  return (rawText.match(/\\"kosher\\":/g) ?? []).length;
}

/**
 * A SECOND, independent structural-key count (`latitude`'s value is also a
 * bare literal, never a string, for the same reason `kosher`'s is —
 * confirmed on the live feed: latitude/longitude/hasPickup/forceClose/
 * accessibleRestroom/weekDaysOpeningHour/address/city/active/hasDelivery
 * all read the identical count as kosher does; only `name` differs, because
 * it also occurs outside store objects, which is exactly why anchoring on
 * `kosher` rather than `name` was right in the first place).
 *
 * Necessary because countStoreAnchors() alone shares a blind spot with
 * parseRebarStores(): both are downstream of the SAME `kosher` key
 * existing at all. A store object missing its `kosher` key entirely is
 * invisible to both measurements equally — parsed count and kosher-anchor
 * count drop together, agree with each other, and the mismatch check never
 * fires. Two measurements agreeing is not automatically corroboration; it
 * can be a shared blind spot wearing the shape of one. This is the same
 * mechanism as the earlier 106-vs-115 discrepancy: two counts that closed
 * against each other while both were wrong. A genuinely independent third
 * surface — a different key, not just a different count of the same key —
 * is the actual countermeasure.
 */
export function countLatitudeAnchors(rawText) {
  return (rawText.match(/\\"latitude\\":/g) ?? []).length;
}

/**
 * Parses the raw fetched page text into one object per branch. Pure —
 * exported separately from the fetch so it's testable against a captured
 * real fixture without a network call.
 *
 * `kosher` is `true` | `false` | `null` — `null` covers a feed entry where
 * the field is present but neither literal boolean. A store the regex
 * can't match at all is silently absent from the result; `countStoreAnchors`
 * above is how a caller notices that happened instead of trusting the
 * returned array's length.
 */
export function parseRebarStores(rawText) {
  return [...rawText.matchAll(STORE_RE)].map((m) => ({
    name: unescapeValue(m[1]),
    address: unescapeValue(m[2]),
    city: unescapeValue(m[3]),
    active: m[4] === 'true',
    lat: Number(m[5]),
    lng: Number(m[6]),
    kosher: m[7] === 'true' ? true : m[7] === 'false' ? false : null,
  }));
}

/**
 * Fetches and parses in one call. `fetchImpl` is injectable for testing
 * without a real network call. Throws if the parsed store count doesn't
 * match the raw "kosher" anchor count (a parsing shortfall — the exact
 * failure mode that dropped רמב"ם twice) OR if the "kosher" anchor count
 * disagrees with the independent "latitude" anchor count (a whole store
 * object missing its kosher key, invisible to the first check alone — see
 * countLatitudeAnchors' header). Never silently prefers either count when
 * they disagree; the error names both and which is short.
 */
export async function fetchRebarStores(fetchImpl = fetch) {
  const res = await fetchImpl(FEED_URL, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`fetchRebarStores: HTTP ${res.status}`);
  const text = await res.text();
  const stores = parseRebarStores(text);
  const kosherAnchors = countStoreAnchors(text);
  const latitudeAnchors = countLatitudeAnchors(text);

  if (kosherAnchors !== latitudeAnchors) {
    const shortKey = kosherAnchors < latitudeAnchors ? 'kosher' : 'latitude';
    throw new Error(
      `fetchRebarStores: independent structural-key counts disagree — "kosher": ${kosherAnchors} vs "latitude": ${latitudeAnchors}. ` +
      `The "${shortKey}" key is short, meaning at least one store object is missing it entirely — invisible to a same-key ` +
      `count check, since a missing key drops the same object from every measurement of that key equally.`,
    );
  }
  if (stores.length !== kosherAnchors) {
    throw new Error(
      `fetchRebarStores: parsed ${stores.length} stores but the raw text has ${kosherAnchors} "kosher": anchors — ` +
      `${kosherAnchors - stores.length} store(s) failed to parse and would have been silently dropped.`,
    );
  }
  return stores;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Existing records were Waze-synced (locationSource:'waze'); a genuinely different branch is normally much further than this. */
export const MATCH_RADIUS_KM = 0.5;

/**
 * True when a feed store's address is the existing record's address —
 * exact prefix match, not fuzzy. The feed states just the street+number
 * ("ההדרים 7"); an existing record's own address usually appends the city
 * ("ההדרים 7, גני תקווה"), so containment-as-prefix is the correct
 * comparison, not full equality.
 */
function sameAddress(storeAddress, existingAddress) {
  const a = String(storeAddress ?? '').trim();
  const b = String(existingAddress ?? '').trim();
  return a.length > 0 && b.startsWith(a);
}

function isCandidate(store, existingRecord) {
  const closeByDistance =
    existingRecord.location &&
    typeof existingRecord.location.latitude === 'number' &&
    typeof existingRecord.location.longitude === 'number' &&
    haversineKm(store.lat, store.lng, existingRecord.location.latitude, existingRecord.location.longitude) <= MATCH_RADIUS_KM;
  const closeByAddress = sameAddress(store.address, existingRecord.address);
  return Boolean(closeByDistance || closeByAddress);
}

/**
 * Matches feed stores against existing rebar-* records, MANY-TO-ONE aware
 * in both directions — replaces an earlier "nearest wins" design that was
 * unsafe on real data.
 *
 * Found necessary by checking every existing record for more than one
 * candidate, not just checking whether "nearest" looked plausible: three
 * real cases inside the 0.5km radius, not one —
 *   - rebar-02629c63 ("שער הצפון"): candidates include BOTH a kosher:true
 *     store (0.01km) and a kosher:false store (0.28km) — a contradictory
 *     pair, easy to notice because the outcomes disagree.
 *   - rebar-dc59d466 ("קניון הנגב") and rebar-bs-central-station ("תחנה
 *     מרכזית"): a mutual 2x2 cross-claim — both Beer Sheva feed stores
 *     ("קניון הנגב" 0.02/0.33km, "תחנה מרכזית" 0.23/0.12km) fall inside
 *     BOTH records' radii. Both stores are kosher:true, so a naive
 *     nearest-wins match would silently produce a PLAUSIBLE-LOOKING result
 *     (right kosher outcome, wrong branch's name/coordinates/sourceUrl
 *     attached) — the dangerous kind of ambiguity, the kind that doesn't
 *     announce itself by disagreeing.
 *
 * A pairing is CONFIRMED only when it is mutually exclusive: the existing
 * record has exactly one candidate store, AND that store has exactly one
 * candidate existing record, and they are each other's. Anything else —
 * a record with 2+ candidate stores, or a store claimed by 2+ records —
 * is reported as ambiguous and resolved by neither distance nor address
 * alone; a caller must not pick a winner here.
 */
export function matchRebarStores(stores, existingRebarRecords) {
  const candidatesByRecord = new Map(existingRebarRecords.map((r) => [r, []]));
  const candidatesByStore = new Map(stores.map((s) => [s, []]));

  for (const r of existingRebarRecords) {
    for (const s of stores) {
      if (isCandidate(s, r)) {
        candidatesByRecord.get(r).push(s);
        candidatesByStore.get(s).push(r);
      }
    }
  }

  const confirmed = [];
  const ambiguousRecords = [];
  const noMatchRecords = [];

  for (const r of existingRebarRecords) {
    const recordCandidates = candidatesByRecord.get(r);
    if (recordCandidates.length === 0) {
      noMatchRecords.push(r);
    } else if (recordCandidates.length > 1) {
      ambiguousRecords.push({ record: r, candidates: recordCandidates });
    } else {
      const [store] = recordCandidates;
      if (candidatesByStore.get(store).length > 1) {
        ambiguousRecords.push({ record: r, candidates: candidatesByStore.get(store) });
      } else {
        confirmed.push({ record: r, store });
      }
    }
  }

  const confirmedStores = new Set(confirmed.map((c) => c.store));
  const ambiguousStores = new Set(ambiguousRecords.flatMap((a) => a.candidates));
  const newStores = stores.filter(
    (s) => s.kosher === true && candidatesByStore.get(s).length === 0 && !confirmedStores.has(s) && !ambiguousStores.has(s),
  );

  return { confirmed, ambiguousRecords, noMatchRecords, newStores };
}
