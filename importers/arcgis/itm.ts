/**
 * Projected → WGS84 reprojection for ArcGIS layers (pure, dependency-free).
 *
 * Israeli municipal GIS layers publish geometry in a PROJECTED CRS — usually
 * Israeli TM Grid (EPSG:2039, "ITM") or Web Mercator (EPSG:3857 / ESRI 102100).
 * The app stores WGS84 lat/lng, so each native point is reprojected here.
 *
 * This is a coordinate-system transform of an ORIGINAL, authoritative municipal
 * point — NOT geocoding. No address lookup, nothing invented.
 *
 * IMPORTANT (Israel datum): `itmToWgs84` is a PROJECTION-only inverse. The
 * official ITM↔WGS84 transform also includes a DATUM shift (Israel 1993/IGD05 →
 * WGS84) of ~50–80m in Israel — too large to ignore. So PRODUCTION stores the
 * ArcGIS server's own `outSR=4326` output (authoritative; it applies that datum
 * shift). `itmToWgs84` is kept for layers that cannot reproject server-side and
 * as the run-time DIAGNOSTIC that quantifies the datum shift (run-haifa.ts).
 * `webMercatorToWgs84` (EPSG:3857) needs no datum shift and is exact.
 */
import type { GeoPoint } from '../../src/types/place.ts';

const DEG = 180 / Math.PI;

// --- GRS80 ellipsoid (used by both ITM and WGS84) ---------------------------
const A = 6378137.0;
const F = 1 / 298.257222101;
const E2 = F * (2 - F);

// --- Israeli TM Grid (EPSG:2039) parameters ---------------------------------
const ITM_K0 = 1.0000067;
const ITM_LAT0 = (31 + 44 / 60 + 3.8174 / 3600) * (Math.PI / 180); // 31°44'03.8174"N
const ITM_LON0 = (35 + 12 / 60 + 16.261 / 3600) * (Math.PI / 180); // 35°12'16.261"E
const ITM_FE = 219529.584;
const ITM_FN = 626907.39;

/** Meridional arc length from the equator to latitude `phi`. */
function meridionalArc(phi: number): number {
  return (
    A *
    ((1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256) * phi -
      ((3 * E2) / 8 + (3 * E2 ** 2) / 32 + (45 * E2 ** 3) / 1024) * Math.sin(2 * phi) +
      ((15 * E2 ** 2) / 256 + (45 * E2 ** 3) / 1024) * Math.sin(4 * phi) -
      ((35 * E2 ** 3) / 3072) * Math.sin(6 * phi))
  );
}

/** Inverse Transverse Mercator for the Israeli TM Grid (EPSG:2039). */
export function itmToWgs84(easting: number, northing: number): GeoPoint {
  const ep2 = E2 / (1 - E2);
  const M = meridionalArc(ITM_LAT0) + (northing - ITM_FN) / ITM_K0;
  const mu = M / (A * (1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sin1 = Math.sin(phi1);
  const cos1 = Math.cos(phi1);
  const tan1 = Math.tan(phi1);
  const C1 = ep2 * cos1 * cos1;
  const T1 = tan1 * tan1;
  const N1 = A / Math.sqrt(1 - E2 * sin1 * sin1);
  const R1 = (A * (1 - E2)) / (1 - E2 * sin1 * sin1) ** 1.5;
  const D = (easting - ITM_FE) / (N1 * ITM_K0);

  const lat =
    phi1 -
    ((N1 * tan1) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6) / 720);

  const lon =
    ITM_LON0 +
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5) / 120) /
      cos1;

  return { latitude: lat * DEG, longitude: lon * DEG };
}

/** Inverse Web Mercator (EPSG:3857 / ESRI 102100). */
export function webMercatorToWgs84(x: number, y: number): GeoPoint {
  return {
    latitude: (2 * Math.atan(Math.exp(y / A)) - Math.PI / 2) * DEG,
    longitude: (x / A) * DEG,
  };
}

/**
 * Reproject one projected point to WGS84 by the layer's WKID. Inputs already in
 * degrees (|x|≤180) are passed through — a guard against servers that ignore the
 * requested SR and return lon/lat regardless.
 */
export function projectedToWgs84(x: number, y: number, wkid: number): GeoPoint {
  if (Math.abs(x) <= 180 && Math.abs(y) <= 90) return { latitude: y, longitude: x };
  if (wkid === 4326) return { latitude: y, longitude: x };
  if (wkid === 2039) return itmToWgs84(x, y);
  if (wkid === 3857 || wkid === 102100 || wkid === 900913) return webMercatorToWgs84(x, y);
  throw new Error(`projectedToWgs84: unsupported wkid ${wkid}`);
}
