/**
 * OSM element → unified `SynagoguePlace` record (the spec'd output shape).
 *
 * Builds a candidate from whatever OSM provides — never invents missing data.
 * Validation (name / coordinates / Israel bounds / duplicates) happens in
 * validate.ts, so a candidate may still come back incomplete from here.
 */
import type { Locality, OsmElement, SynagoguePlace } from '../shared/types.ts';
import { nearestLocality, osmCoords } from '../shared/utils.ts';

/** True for an OSM Jewish place of worship. */
function isSynagogue(tags: Record<string, string>): boolean {
  return tags.religion === 'jewish' && tags.amenity === 'place_of_worship';
}

export function transformSynagogue(
  el: OsmElement,
  localities: Locality[],
  verifiedAt: string,
): SynagoguePlace | null {
  const tags = el.tags || {};
  if (!isSynagogue(tags)) return null; // not a synagogue → skipped, not rejected

  const coords = osmCoords(el);
  const lat = coords?.latitude ?? null;
  const lng = coords?.longitude ?? null;

  // City: nearest OSM locality (consistent Hebrew) when we have coordinates,
  // else fall back to the addr:city tag if present. Never guessed.
  const city =
    lat != null && lng != null
      ? nearestLocality(lat, lng, localities) || tags['addr:city'] || undefined
      : tags['addr:city'] || undefined;

  const place: SynagoguePlace = {
    type: 'synagogue',
    source: 'openstreetmap',
    sourceId: `${el.type}/${el.id}`,
    name: tags['name:he'] || tags.name || null,
    lat,
    lng,
    verifiedAt,
    isActive: true,
  };

  if (city) place.city = city;

  // address only when OSM actually has a street (not just the city name).
  const street = [tags['addr:street'], tags['addr:housenumber']]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (street) place.address = [street, city].filter(Boolean).join(', ');

  const phone = tags['contact:phone'] || tags.phone;
  if (phone) place.phone = phone;

  return place;
}
