/**
 * Rebar adapter for the shared kashrut pipeline (kashrut-pipeline.mjs).
 *
 * An adapter's ONLY job is to report what the source says — it interprets
 * nothing. It does not decide kosher, does not map to kosherType, does not
 * decide a level, does not touch the dataset. All of that lives in the
 * pipeline's Gates 0-4, in exactly one place, so the same argument is never
 * re-won per chain (§17 face 3 at the architecture level).
 *
 * Rebar's feed (rebar-feed.mjs) is a boolean-only source: `kosher` is
 * true/false/null, and the feed's full key union has no level field and no
 * authority field anywhere (confirmed in rebar-feed.mjs's own header) — so
 * levelText and bodyText are always null here, for every branch, always.
 * That is the evidence ceiling this specific source has; a different source
 * (e.g. greg) can and does report non-null values for those fields.
 *
 * kashrutMarker is three-state, not the two-state 'asserted'|'absent' first
 * proposed for the adapter contract: rebar's feed carries a REAL boolean-false
 * signal (a store explicitly marked not-kosher), which is a different fact
 * than silence and must reach Gate 1 as a distinct STOP case, not be
 * collapsed into 'absent'. Flagging this as a deliberate widening of the
 * contract, not a deviation from it — every source's adapter uses the same
 * three states; greg's just never emits 'negative' because its own source
 * never does either (verified by a full 59-page sweep, not assumed).
 */
import { fetchRebarStores } from '../rebar-feed.mjs';

export const FEED_URL = 'https://rebar.co.il/our-stores/';
export const CHAIN_ID_PREFIX = 'rebar-';

/**
 * @param {typeof fetch} [fetchImpl] - injectable for testing without a real network call.
 * @returns {Promise<Array<{sourceKey, name, address, city, lat, lng, kashrutMarker: 'asserted'|'negative'|'not_asserted', levelText: null, bodyText: null, sourceUrl: string, raw: object}>>}
 */
export async function fetchBranches(fetchImpl) {
  const stores = fetchImpl ? await fetchRebarStores(fetchImpl) : await fetchRebarStores();
  return stores.map((store) => ({
    sourceKey: `${store.name}|${store.address}`,
    name: store.name,
    address: store.address,
    city: store.city,
    lat: store.lat,
    lng: store.lng,
    kashrutMarker: store.kosher === true ? 'asserted' : store.kosher === false ? 'negative' : 'not_asserted',
    levelText: null,
    bodyText: null,
    sourceUrl: FEED_URL,
    raw: store,
  }));
}
