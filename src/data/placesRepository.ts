import { DATA_SOURCE } from './config';
import { MockPlacesRepository } from './repository/MockPlacesRepository';
import { OsmPlacesRepository } from './repository/OsmPlacesRepository';
import { PlacesRepository } from './repository/PlacesRepository';
import { SupabasePlacesRepository } from './repository/SupabasePlacesRepository';

/**
 * The single data entry point for the whole app.
 *
 * Every screen reads data through hooks (usePlaces / usePlace / useCities) and
 * actions (submitReport) that call THIS singleton — never the seed/mock files
 * directly. To go live, flip DATA_SOURCE to 'supabase' in config.ts and
 * implement SupabasePlacesRepository; nothing else changes.
 */
function createRepository(): PlacesRepository {
  switch (DATA_SOURCE) {
    case 'osm':
      return new OsmPlacesRepository(); // real OpenStreetMap data
    case 'supabase':
      return new SupabasePlacesRepository();
    case 'mock':
    default:
      return new MockPlacesRepository();
  }
}

export const placesRepository: PlacesRepository = createRepository();

export type { PlacesRepository } from './repository/PlacesRepository';
