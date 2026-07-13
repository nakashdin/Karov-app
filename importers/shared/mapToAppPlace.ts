/**
 * Pure mapper: importer `SynagoguePlace` → the app's `Place`.
 *
 * PREPARED, NOT WIRED. Nothing in the app imports this yet — it exists so the
 * conversion can be reviewed and type-checked BEFORE we connect the new data.
 * It does not touch screens, the repository, or any existing dataset.
 *
 * Field mapping
 *   lat/lng              → location: { latitude, longitude }
 *   source 'openstreetmap' → source: 'osm'        (the app's enum value)
 *   verifiedAt           → lastVerifiedAt
 *   city                 → cityId                 (see note below)
 *   sourceId             → used only to derive `id`; NOT carried as a field
 *   isActive             → dropped (no equivalent on Place)
 *
 * cityId: for OSM data the app already treats `cityId` AS the city name — see
 * src/data/repository/filterPlaces.ts ("For OSM data the cityId IS the city
 * name"). So `city → cityId` is the EXISTING mechanism, not a guess. When the
 * source has no city we do NOT invent one: `cityId` becomes '' (the record just
 * won't match any city filter). In practice OSM gives a city for ~100% of
 * synagogues, so this is only a safety fallback.
 *
 * `Place.address` is required, while `SynagoguePlace.address` is optional. To
 * preserve the existing app behaviour (OSM records show the city as the address
 * when no street is known) we fall back: real address → else city → else ''.
 * This is not fabricated data — the city is already known and shown today.
 */
import type { Place } from '../../src/types/place.ts';
import type { SynagoguePlace } from './types.ts';

export function mapSynagogueToPlace(s: SynagoguePlace): Place {
  if (!s.name) {
    throw new Error(`cannot map synagogue without a name (sourceId=${s.sourceId})`);
  }
  if (s.lat == null || s.lng == null) {
    throw new Error(`cannot map synagogue without coordinates (sourceId=${s.sourceId})`);
  }

  // Derive an app-style id from the OSM reference (e.g. "node/123" → "osm-node-123"),
  // matching the existing dataset's id format. The raw sourceId is not stored.
  const id = `osm-${s.sourceId.replace('/', '-')}`;

  const place: Place = {
    id,
    name: s.name,
    type: 'synagogue',
    cityId: s.city ?? '',
    address: s.address ?? s.city ?? '',
    location: { latitude: s.lat, longitude: s.lng },
    source: 'osm',
    lastVerifiedAt: s.verifiedAt,
  };

  if (s.phone) place.phone = s.phone;

  return place;
}
