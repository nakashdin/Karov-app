import { GeoPoint } from '../types';
import type { Strings } from '../i18n';

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in kilometers (Haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Human-readable distance string (meters under 1km, else km). */
export function formatDistance(km: number, t: Pick<Strings, 'common'>): string {
  if (km < 1) {
    const meters = Math.max(10, Math.round(km * 1000 / 10) * 10);
    return `${meters} ${t.common.meters}`;
  }
  return `${km.toFixed(1)} ${t.common.km}`;
}
