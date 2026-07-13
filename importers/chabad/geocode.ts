/**
 * GovMap address geocoding for coordless Chabad records (data.gov.il amutot).
 *
 * Same quality bar as the mikvah pipeline: accept ONLY an exact ADDR_V1 result
 * (ResultType 1) whose label contains the right city, then ITM→WGS84 and an
 * in-Israel check. Records without a street address cannot reach ADDR_V1 and are
 * left coordless (reported, never invented). GovMap is the official Israeli
 * address DB; Nominatim is NOT used (it collides on city names).
 */
import { isInIsrael, sleep } from '../shared/utils.ts';
import { itmToWgs84 } from '../arcgis/itm.ts';
import type { GeoPoint } from '../../src/types/place.ts';

const UA = 'Mozilla/5.0 (karov-kosher-app; chabad geocode; non-commercial)';
const sp = (s: string): string => s.replace(/["'׳״’”`.,()\[\]\-–]/g, ' ').replace(/\s+/g, ' ').trim();

/** Geocode "<address>, <city>" via GovMap. Returns null unless an exact,
 * city-matching ADDR_V1 result resolves inside Israel. */
export async function govmapGeocode(
  address: string,
  city: string,
): Promise<{ loc: GeoPoint; label: string } | null> {
  const query = city ? `${address}, ${city}` : address;
  let d: any;
  try {
    const res = await fetch(
      `https://es.govmap.gov.il/TldSearch/api/DetailsByQuery?query=${encodeURIComponent(query)}&lyrs=257&gid=govmap`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' } },
    );
    d = await res.json();
  } catch {
    return null;
  }
  const a = d?.data?.ADDRESS?.[0];
  if (!a || a.DescLayerID !== 'ADDR_V1' || a.ResultType !== 1) return null; // exact address only
  const label = sp(String(a.ResultLable ?? ''));
  const c = sp(String(city ?? ''));
  if (c && !(label.includes(c) || c.split(' ').every((w) => w.length < 2 || label.includes(w)))) {
    return null; // wrong city
  }
  const w = itmToWgs84(Number(a.X), Number(a.Y));
  if (w.latitude == null || w.longitude == null) return null;
  const loc = { latitude: w.latitude, longitude: w.longitude };
  if (!isInIsrael(loc)) return null;
  return { loc, label: String(a.ResultLable) };
}

/** Polite delay between GovMap calls (matches the mikvah importer). */
export const GEOCODE_DELAY_MS = 400;
export const geocodeSleep = (): Promise<void> => sleep(GEOCODE_DELAY_MS);

/**
 * FALLBACK geocoder — OSM Nominatim, used ONLY when GovMap is unavailable.
 * Restricted to a STRUCTURED street+city query inside Israel so it can't
 * city-collide the way a free-text Nominatim query does. Accepts a result only
 * when it carries a house number (precise) and lands inside Israel. Honors the
 * Nominatim usage policy (valid UA, ≤1 req/s — see NOMINATIM_DELAY_MS).
 */
export async function nominatimGeocode(
  address: string,
  city: string,
): Promise<{ loc: GeoPoint; label: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=il`
    + `&street=${encodeURIComponent(address)}&city=${encodeURIComponent(city)}`;
  let arr: any[];
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'karov-kosher-app/1.0 (chabad geocode; non-commercial)', Accept: 'application/json' } });
    arr = await res.json();
  } catch {
    return null;
  }
  const a = Array.isArray(arr) ? arr[0] : null;
  if (!a) return null;
  if (!a.address?.house_number) return null; // require a precise (building-level) hit
  const loc = { latitude: Number(a.lat), longitude: Number(a.lon) };
  if (!isInIsrael(loc)) return null;
  return { loc, label: String(a.display_name ?? `${address}, ${city}`) };
}

/** Nominatim policy: ≤1 request/second. */
export const NOMINATIM_DELAY_MS = 1100;
export const nominatimSleep = (): Promise<void> => sleep(NOMINATIM_DELAY_MS);
