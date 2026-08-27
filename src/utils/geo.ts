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

// ─────────────────────────────────────────────────────────────────────────────
// Distance selection
//
// `distanceKm` is not free — it is four trig calls plus a sqrt. Passing it
// straight to Array.prototype.sort recomputes it twice on every comparison,
// so picking the 6 nearest of 7,500 places cost roughly 190,000 haversine
// evaluations on the JS thread. Both helpers below compute each distance
// exactly once.
// ─────────────────────────────────────────────────────────────────────────────

interface HasLocation {
  location: GeoPoint;
}

/**
 * The `k` items closest to `origin`, nearest first.
 *
 * One pass, one distance per item, and only `k` entries held — no full sort.
 */
export function nearestBy<T extends HasLocation>(
  origin: GeoPoint,
  items: readonly T[],
  k: number,
): T[] {
  if (k <= 0) return [];

  const best: { item: T; d: number }[] = [];
  for (const item of items) {
    const d = distanceKm(origin, item.location);
    if (best.length === k && d >= best[best.length - 1].d) continue;

    let i = best.length;
    while (i > 0 && best[i - 1].d > d) i--;
    best.splice(i, 0, { item, d });
    if (best.length > k) best.pop();
  }
  return best.map((b) => b.item);
}

/**
 * Every item ordered by distance from `origin`, nearest first.
 *
 * Decorate–sort–undecorate: n distance computations rather than ~2·n·log₂(n).
 */
export function sortedByDistance<T extends HasLocation>(
  origin: GeoPoint,
  items: readonly T[],
): T[] {
  return items
    .map((item) => ({ item, d: distanceKm(origin, item.location) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.item);
}

/** Items within `radiusKm` of `origin`, nearest first. */
export function withinRadius<T extends HasLocation>(
  origin: GeoPoint,
  items: readonly T[],
  radiusKm: number,
): T[] {
  return items
    .map((item) => ({ item, d: distanceKm(origin, item.location) }))
    .filter((x) => x.d <= radiusKm)
    .sort((a, b) => a.d - b.d)
    .map((x) => x.item);
}
