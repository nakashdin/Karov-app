import { City, NewIssueReport, Place, PlaceFilters } from '../../types';
import { PlacesRepository } from './PlacesRepository';

/**
 * Future Supabase-backed implementation.
 *
 * The intended schema (for reference when wiring this up):
 *   places(id, name, description, category, kosher_type, city_id, address,
 *          latitude, longitude, phone, opening_hours, certified_by,
 *          certificate_valid_until, rating, tags)
 *   cities(id, name)
 *   reports(id, place_id, type, details, created_at)
 *
 * Each method should query Supabase and map snake_case rows to the camelCase
 * domain types above. Filtering can be pushed down to the query
 * (`.eq('city_id', ...)`, `.ilike('name', %q%)`, etc.).
 */
export class SupabasePlacesRepository implements PlacesRepository {
  private notImplemented(method: string): never {
    throw new Error(
      `SupabasePlacesRepository.${method} not implemented yet. ` +
        'See lib/supabase.ts for setup steps.',
    );
  }

  async getPlaces(_filters?: Partial<PlaceFilters>): Promise<Place[]> {
    return this.notImplemented('getPlaces');
  }

  async getPlaceById(_id: string): Promise<Place | null> {
    return this.notImplemented('getPlaceById');
  }

  async getCities(): Promise<City[]> {
    return this.notImplemented('getCities');
  }

  async submitReport(_report: NewIssueReport): Promise<void> {
    return this.notImplemented('submitReport');
  }
}
