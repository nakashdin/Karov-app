import { getJson, query, type RequestOptions } from './client';

/**
 * Reverse geocoding via OpenStreetMap Nominatim.
 *
 * Nominatim's usage policy requires an identifying User-Agent. The previous
 * implementation set one on `fetch` — but User-Agent and Referer are forbidden
 * headers in a browser and are stripped silently, so on web the app was
 * anonymous and one bad day away from being rate-limited or blocked.
 *
 * Identification is therefore carried in the `email` query parameter, which
 * Nominatim explicitly supports and which no platform strips. Requests are also
 * kept to a single attempt: the policy caps clients at 1 request/second, and
 * retrying a rate-limited call is exactly what gets a client banned.
 *
 * https://operations.osmfoundation.org/policies/nominatim/
 */

const BASE = 'https://nominatim.openstreetmap.org';

/** Contact address published to Nominatim, per their policy. */
const CONTACT = 'nakashdin@gmail.com';

export interface NominatimReverse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    county?: string;
    state?: string;
  };
}

export const reverseUrl = (latitude: number, longitude: number): string =>
  `${BASE}/reverse` +
  query({
    lat: latitude,
    lon: longitude,
    format: 'json',
    zoom: 14,
    'accept-language': 'he',
    email: CONTACT,
  });

export const fetchReverse = (latitude: number, longitude: number, opts?: RequestOptions) =>
  getJson<NominatimReverse>(reverseUrl(latitude, longitude), {
    // Never retry: the policy is 1 req/s and a retry storm gets the app blocked.
    retries: 0,
    timeoutMs: 6_000,
    ...opts,
  });

/** Best available place name, from most to least specific. */
export function cityNameOf(result: NominatimReverse | null): string | null {
  const a = result?.address;
  return a?.city || a?.town || a?.village || a?.suburb || a?.county || null;
}
