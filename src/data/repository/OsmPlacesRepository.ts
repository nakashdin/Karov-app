import { City, NewIssueReport, Place, PlaceFilters } from '../../types';
import { filterPlaces } from './filterPlaces';
import { PlacesRepository } from './PlacesRepository';
import { buildIndex } from '../search/searchEngine';
import osmData from '../generated/places.osm.json';
import osmCities from '../generated/cities.osm.json';

/** Real places imported from OpenStreetMap (built by scripts/fetch-osm-places.mjs). */
const PLACES = osmData as unknown as Place[];

// Cities are sorted by place-count; cap the filter chips to the busiest ones.
// (Search-by-city still works for every city via the text search.)
const CITIES = (osmCities as City[]).slice(0, 40);

// Build the full-text search index once at module load.
const CITY_NAME_MAP = new Map<string, string>(
  (osmCities as City[]).map((c) => [c.id, c.name]),
);
buildIndex(PLACES, CITY_NAME_MAP);

/**
 * Serves the pre-built OpenStreetMap dataset bundled with the app.
 * Read-only and offline; reports are logged (no backend yet).
 */
export class OsmPlacesRepository implements PlacesRepository {
  async getPlaces(filters: Partial<PlaceFilters> = {}): Promise<Place[]> {
    return filterPlaces(PLACES, filters);
  }

  async getPlaceById(id: string): Promise<Place | null> {
    return PLACES.find((p) => p.id === id) ?? null;
  }

  async getCities(): Promise<City[]> {
    return CITIES;
  }

  async submitReport(report: NewIssueReport): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('[OsmPlacesRepository] report submitted:', report);
  }
}
