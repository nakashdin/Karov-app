/**
 * Tzohar's live, machine-readable certifier feed — WP Store Locator's own
 * `store_search` AJAX action, confirmed working unauthenticated (2026-08-26,
 * independently reproduced against Tel Aviv coordinates before this file was
 * written). This replaces the custom `tzohar_find_rest_by_search` action
 * documented as broken in docs/CERT_REFRESH_DESIGN.md §9 (HTTP 500 from a
 * plain client, every time) — do not resurrect that path.
 *
 * GET https://www.tzohar.org.il/wp-admin/admin-ajax.php
 *     ?action=store_search&lat=<lat>&lng=<lng>&max_results=200&search_radius=50&autoload=1
 *
 * Per entry: id (Tzohar's own stable business id — do NOT treat as a match
 * key on its own; we have no stored mapping to it yet, see
 * scripts/shared/tzohar-identity-match.mjs), store (name), address, city,
 * lat, lng, phone, terms (חלבי/בשרי/פרווה), and address2 — which carries the
 * CURRENT certificate PDF URL, not a second address field despite the name.
 *
 * search_radius is capped server-side (500km still only returned 14 results
 * in testing) — sweepIsrael() below covers the country with a grid of
 * capped-radius calls instead of one call with a huge radius.
 */

const AJAX_URL = 'https://www.tzohar.org.il/wp-admin/admin-ajax.php';
const REFERER = 'https://www.tzohar.org.il/?page_id=18700';

/** Israel bounding box — mirrors scripts/validate-data.mjs's BBOX so sweeps and validation agree on "inside Israel". */
export const ISRAEL_BBOX = { minLat: 29.3, maxLat: 33.4, minLng: 34.2, maxLng: 35.95 };

function decodeHtmlEntities(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** One page's worth of results, decoded and normalized. Never writes anything — pure network read. */
export async function fetchStoreSearch({ lat, lng, radius = 50, maxResults = 200, fetchImpl = fetch } = {}) {
  const url = new URL(AJAX_URL);
  url.searchParams.set('action', 'store_search');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));
  url.searchParams.set('max_results', String(maxResults));
  url.searchParams.set('search_radius', String(radius));
  url.searchParams.set('autoload', '1');

  const res = await fetchImpl(url.toString(), {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Referer: REFERER,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  });
  if (!res.ok) throw new Error(`store_search HTTP ${res.status} at (${lat},${lng})`);
  const raw = await res.json();
  if (!Array.isArray(raw)) throw new Error(`store_search returned non-array at (${lat},${lng}): ${typeof raw}`);

  return raw.map((r) => ({
    tzoharId: String(r.id),
    store: decodeHtmlEntities(r.store),
    address: decodeHtmlEntities(r.address),
    city: decodeHtmlEntities(r.city),
    lat: r.lat !== undefined ? Number(r.lat) : null,
    lng: r.lng !== undefined ? Number(r.lng) : null,
    phone: decodeHtmlEntities(r.phone) || null,
    certUrl: r.address2 || null, // address2 carries the certificate PDF URL, not a second address
    terms: Array.isArray(r.terms) ? r.terms.map((t) => decodeHtmlEntities(t.name)) : [],
  }));
}

/** A grid of (lat,lng) points covering ISRAEL_BBOX at `stepDeg` spacing. Pure — no network. */
export function israelGrid(stepDeg = 0.25) {
  const points = [];
  for (let lat = ISRAEL_BBOX.minLat; lat <= ISRAEL_BBOX.maxLat; lat += stepDeg) {
    for (let lng = ISRAEL_BBOX.minLng; lng <= ISRAEL_BBOX.maxLng; lng += stepDeg) {
      points.push({ lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000 });
    }
  }
  return points;
}

/**
 * Sweep the whole country and return the deduped (by tzoharId) union of
 * every business the feed returns. Rate-limited between calls (default
 * 400ms, matching the cadence already proven not to trip anything server-
 * side) — this is a courtesy to a third party's production server, not a
 * technical requirement, and should not be shortened casually.
 */
export async function sweepIsrael({ stepDeg = 0.25, radius = 50, maxResults = 200, delayMs = 400, fetchImpl = fetch, onProgress } = {}) {
  const points = israelGrid(stepDeg);
  const byId = new Map();
  for (let i = 0; i < points.length; i++) {
    const { lat, lng } = points[i];
    const batch = await fetchStoreSearch({ lat, lng, radius, maxResults, fetchImpl });
    for (const entry of batch) byId.set(entry.tzoharId, entry);
    onProgress?.({ index: i, total: points.length, point: points[i], newTotal: byId.size });
    if (delayMs > 0 && i < points.length - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return [...byId.values()];
}
