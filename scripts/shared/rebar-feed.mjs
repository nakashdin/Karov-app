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
 * JSON one level backslash-escaped inside a giant streamed string literal —
 * not a clean JSON island to `JSON.parse`. Confirmed field order, stable
 * across three independent fetches: name, address, city, active, latitude,
 * longitude, hasDelivery, hasPickup, kosher, six opening-hour fields, four
 * accessibility fields, forceClose, open.
 *
 * `kosher` is a genuinely differentiated boolean — roughly half true, half
 * false across the feed, confirmed by fetching and counting, not assumed.
 * The feed's full key union has NO level field and NO authority field: that
 * is the evidence ceiling for anything built on this module.
 *
 * ENTRY COUNT IS NOT STABLE — do not cite one. Independent fetches on
 * 2026-08-26 returned 107 and 115 parsed entries (an earlier hand-scan by
 * the Architect, using a stricter anchor requiring a trailing
 * `"open":(true|false)`, silently dropped 9 and reported 106 — a claim that
 * was true of a set which no longer exists the moment the page re-renders).
 * What IS stable, and re-checked across every one of those fetches: the
 * per-object KEY SET itself (the field names enumerated above) never
 * varies, and none of them is a level or authority field — that is the
 * actual evidence ceiling claim, and it does not depend on how many store
 * objects happen to be present on any one fetch.
 *
 * EXTRACTION SAFETY — read this before touching the regex below. A first
 * attempt used a generic "escaped string" capture group
 * (`([^\\]*(?:\\.[^\\]*)*)`), meant to tolerate escaped characters inside a
 * field value. It matched ONCE instead of 107 times: because backslash
 * escapes are common throughout the surrounding RSC stream (not just inside
 * this module's fields), that pattern happily treated large stretches of
 * UNRELATED page content as if they were part of one field's value, only
 * stopping wherever the next literal anchor happened to reappear far away.
 * The fix in use here is tighter, not looser: real business names and
 * addresses never contain a literal backslash or a literal double-quote, so
 * `[^\\"]*` (stop at the FIRST backslash or quote) is both correct for this
 * data and structurally unable to over-consume.
 */

const FEED_URL = 'https://rebar.co.il/our-stores/';
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

const STORE_RE =
  /\\"name\\":\\"([^\\"]*)\\",\\"address\\":\\"([^\\"]*)\\",\\"city\\":\\"([^\\"]*)\\",\\"active\\":(true|false),\\"latitude\\":([\d.-]+),\\"longitude\\":([\d.-]+),\\"hasDelivery\\":(?:true|false),\\"hasPickup\\":(?:true|false),\\"kosher\\":(true|false|null),/g;

/**
 * Parses the raw fetched page text into one object per branch. Pure —
 * exported separately from the fetch so it's testable against a captured
 * real fixture without a network call.
 *
 * `kosher` is `true` | `false` | `null` — `null` covers a feed entry where
 * the field is present but neither literal boolean (the regex only ever
 * assigns `null` for that third case; it never guesses `true` or `false`).
 * A store the regex can't match at all (a genuinely different shape) is
 * silently absent from the result — callers that need to notice a total
 * count regression should compare against a known-good count themselves,
 * the same caveat every scrape-based importer in this repo carries.
 */
export function parseRebarStores(rawText) {
  return [...rawText.matchAll(STORE_RE)].map((m) => ({
    name: m[1],
    address: m[2],
    city: m[3],
    active: m[4] === 'true',
    lat: Number(m[5]),
    lng: Number(m[6]),
    kosher: m[7] === 'true' ? true : m[7] === 'false' ? false : null,
  }));
}

/** Fetches and parses in one call. `fetchImpl` is injectable for testing without a real network call. */
export async function fetchRebarStores(fetchImpl = fetch) {
  const res = await fetchImpl(FEED_URL, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`fetchRebarStores: HTTP ${res.status}`);
  const text = await res.text();
  return parseRebarStores(text);
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

/** Existing records were Waze-synced (locationSource:'waze'); a genuinely different branch is always much further than this. */
export const MATCH_RADIUS_KM = 0.5;

/**
 * True when a feed store's address is the existing record's address —
 * exact prefix match, not fuzzy. The feed states just the street+number
 * ("ההדרים 7"); an existing record's own address usually appends the city
 * ("ההדרים 7, גני תקווה"), so containment-as-prefix is the correct
 * comparison, not full equality. Confirmed safe against this specific
 * population: 0 of the 55 existing rebar-* records share an address with
 * any other (checked directly before relying on this), so this can never
 * match the WRONG existing branch, only fail to match a real one under a
 * differently-formatted address.
 */
function sameAddress(storeAddress, existingAddress) {
  const a = String(storeAddress ?? '').trim();
  const b = String(existingAddress ?? '').trim();
  return a.length > 0 && b.startsWith(a);
}

/**
 * Nearest existing rebar record to a feed store — matched by coordinate
 * proximity (within MATCH_RADIUS_KM) OR exact address containment,
 * whichever finds it; null if neither does.
 *
 * Address-only fallback is not decorative: found necessary on REAL data.
 * Two existing records (rebar-8b7c4c33 "ההדרים 7, גני תקווה" and
 * rebar-ca53bc00 "הקריה האקדמית אונו") have the exact same address as a
 * real feed entry, but their STORED coordinates are 1.2km and 2.9km away
 * from the feed's own coordinate for that address respectively — one from
 * Waze-sync drift, one because it still carries the original 2026-07
 * hand-typed 3-decimal estimate and was never geocoded since. Distance
 * alone classified both as "no match -> new record", which would have
 * created two duplicate records for branches that already exist. Address
 * containment is checked whenever distance alone doesn't find a match,
 * specifically to catch this stale-coordinate case, not as the primary
 * signal (a real, geographically DIFFERENT branch could coincidentally
 * carry a short/generic address the feed's OWN version prefixes some other
 * way — distance-first keeps that risk lower than address-first would).
 */
export function matchExistingRebar(store, existingRebarRecords) {
  let bestByDistance = null;
  let bestDistanceKm = Infinity;
  let bestByAddress = null;
  for (const r of existingRebarRecords) {
    if (r.location && typeof r.location.latitude === 'number' && typeof r.location.longitude === 'number') {
      const d = haversineKm(store.lat, store.lng, r.location.latitude, r.location.longitude);
      if (d < bestDistanceKm) {
        bestDistanceKm = d;
        bestByDistance = r;
      }
    }
    if (!bestByAddress && sameAddress(store.address, r.address)) bestByAddress = r;
  }
  if (bestByDistance && bestDistanceKm <= MATCH_RADIUS_KM) return { matched: bestByDistance, distanceKm: bestDistanceKm, via: 'distance' };
  if (bestByAddress) return { matched: bestByAddress, distanceKm: null, via: 'address' };
  return null;
}
