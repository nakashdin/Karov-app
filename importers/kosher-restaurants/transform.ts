/** OSM element → normalized kosher-restaurant record. */
import type { Locality, NormalizedPlace, OsmElement } from '../shared/types.ts';
import { buildOsmAddress, nearestLocality, osmCoords, osmId } from '../shared/utils.ts';

/** True when OSM marks the place as kosher-serving. */
function isKosher(tags: Record<string, string>): boolean {
  const k = tags['diet:kosher'];
  return k === 'yes' || k === 'only' || k === 'designated';
}

export function transformRestaurant(
  el: OsmElement,
  localities: Locality[],
): NormalizedPlace | null {
  const tags = el.tags || {};
  if (!isKosher(tags)) return null;

  const name = tags['name:he'] || tags.name;
  if (!name) return null;

  const location = osmCoords(el);
  if (!location) return null;

  const cityName =
    nearestLocality(location.latitude, location.longitude, localities) ||
    tags['addr:city'] ||
    '';

  const place: NormalizedPlace = {
    id: osmId(el),
    name,
    type: 'restaurant',
    cityId: cityName,
    address: buildOsmAddress(tags, cityName),
    location,
    source: 'osm',
  };

  const phone = tags['contact:phone'] || tags.phone;
  if (phone) place.phone = phone;
  if (tags.opening_hours) place.openingHours = tags.opening_hours;
  if (tags.cuisine) {
    const cuisines = tags.cuisine.split(';').map((s) => s.trim()).filter(Boolean);
    if (cuisines.length) place.tags = cuisines;
  }
  // Keep the raw kosher signal for trust/debugging (NOT a certification claim).
  place.extra = { osmKosher: tags['diet:kosher'] };

  return place;
}
