import { City, NewIssueReport, Place, PlaceFilters } from '../../types';
import { filterPlaces } from './filterPlaces';
import { PlacesRepository } from './PlacesRepository';
import { buildIndex } from '../search/searchEngine';
import osmData from '../generated/places.osm.json';
import osmCities from '../generated/cities.osm.json';

/**
 * Coerce a raw JSON record into a valid Place, filling in safe defaults for
 * any missing required fields.  This prevents a single bad data entry from
 * crashing the entire app at startup.
 */
function sanitizePlace(raw: Record<string, unknown>): Place | null {
  // Hard requirements: without these the record is unusable.
  if (!raw.id || typeof raw.id !== 'string') return null;
  if (!raw.name || typeof raw.name !== 'string') return null;
  if (!raw.type || typeof raw.type !== 'string') return null;

  const loc = raw.location as { latitude?: unknown; longitude?: unknown } | undefined;
  if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return null;

  return {
    ...(raw as unknown as Place),
    // Ensure all required string fields are never undefined at runtime.
    id: String(raw.id),
    name: String(raw.name),
    type: raw.type as Place['type'],
    address: typeof raw.address === 'string' ? raw.address : '',
    cityId: typeof raw.cityId === 'string' ? raw.cityId : '',
    location: { latitude: loc.latitude as number, longitude: loc.longitude as number },
  };
}

/** Real places imported from OpenStreetMap (built by scripts/fetch-osm-places.mjs). */
const PLACES: Place[] = (osmData as unknown as Record<string, unknown>[])
  .map(sanitizePlace)
  .filter((p): p is Place => p !== null);

const CITIES = [...(osmCities as City[])].sort((a, b) => a.name.localeCompare(b.name, 'he'));

// Build the full-text search index once at module load.
const CITY_NAME_MAP = new Map<string, string>(
  (osmCities as City[]).map((c) => [c.id, c.name]),
);
buildIndex(PLACES, CITY_NAME_MAP);

/**
 * dedupe-places.mjs folds duplicate records into `extra.mergedFrom` on the
 * surviving id rather than deleting them (additive-only, per AGENTS.md). A
 * `/place/:id` link shared or bookmarked before a merge still carries the old
 * id, so it needs to resolve to the record it was folded into — otherwise the
 * merge silently breaks every outstanding link to it.
 */
const MERGED_ID_ALIAS = new Map<string, Place>(
  PLACES.flatMap((p) => {
    const mergedFrom = (p.extra as { mergedFrom?: unknown } | undefined)?.mergedFrom;
    if (!Array.isArray(mergedFrom)) return [];
    return mergedFrom.filter((id): id is string => typeof id === 'string').map((id) => [id, p] as const);
  }),
);

/**
 * Serves the pre-built OpenStreetMap dataset bundled with the app.
 * Read-only and offline; reports are logged (no backend yet).
 */
export class OsmPlacesRepository implements PlacesRepository {
  async getPlaces(filters: Partial<PlaceFilters> = {}): Promise<Place[]> {
    return filterPlaces(PLACES, filters, CITY_NAME_MAP);
  }

  async getPlaceById(id: string): Promise<Place | null> {
    return PLACES.find((p) => p.id === id) ?? MERGED_ID_ALIAS.get(id) ?? null;
  }

  async getCities(): Promise<City[]> {
    return CITIES;
  }

  async submitReport(report: NewIssueReport): Promise<void> {
    console.log('[OsmPlacesRepository] report submitted:', report);
  }
}
