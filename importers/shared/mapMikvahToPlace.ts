/**
 * Pure mapper: importer `GeocodedMikvah` → app-ready `AppReadyMikvah`.
 *
 * PREPARED, NOT WIRED. Nothing in the app imports this. It does not change the
 * app's `PlaceType`, screens, repository, or live data.
 *
 * Field mapping
 *   sourceId             → id              (already "mikveh-<n>")
 *   name                 → name
 *   city                 → cityId          (OSM/app convention: cityId is the city name)
 *   address              → address         (falls back to city, then '')
 *   lat/lng              → location: { latitude, longitude }
 *   phone                → phone
 *   openingHours         → openingHours
 *   verifiedAt           → lastVerifiedAt
 *   geocodePrecision     → locationPrecision  (+ kept in extra)
 *   source 'data.gov.il' → extra.dataSource   (Place.source can't hold it; not faked)
 *
 * City-level records (locationPrecision === 'city') are flagged so the app can
 * later show an "approximate location" hint. type stays 'mikveh' — importer-only
 * until PlaceType is extended.
 */
import type { AppReadyMikvah, GeocodedMikvah } from './types.ts';

export function mapMikvahToPlace(m: GeocodedMikvah): AppReadyMikvah {
  const place: AppReadyMikvah = {
    id: m.sourceId,
    name: m.name,
    type: 'mikveh',
    cityId: m.city ?? '',
    address: m.address ?? m.city ?? '',
    location: { latitude: m.lat, longitude: m.lng },
    lastVerifiedAt: m.verifiedAt,
    locationPrecision: m.geocodePrecision,
    extra: {
      dataSource: 'data.gov.il',
      geocodeQuery: m.geocodeQuery,
      geocodePrecision: m.geocodePrecision,
    },
  };

  if (m.phone) place.phone = m.phone;
  if (m.openingHours) place.openingHours = m.openingHours;

  const src = m.extra;
  const dst = place.extra;
  if (src.accessibility) dst.accessibility = src.accessibility;
  if (src.forWomen) dst.forWomen = src.forWomen;
  if (src.forMen) dst.forMen = src.forMen;
  if (src.forDishes) dst.forDishes = src.forDishes;
  if (src.brideRoom) dst.brideRoom = src.brideRoom;
  if (src.responsible) dst.responsibleWorker = src.responsible;

  return place;
}
