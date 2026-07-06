import { City, NewIssueReport, Place, PlaceFilters } from '../../types';

/**
 * The contract every data source must satisfy.
 *
 * Screens and hooks depend ONLY on this interface — never on a concrete
 * implementation — so swapping mock data for Supabase is a single-line change
 * in `repository/index.ts`.
 */
export interface PlacesRepository {
  /** Return places, optionally narrowed by filters (city/type/category/query). */
  getPlaces(filters?: Partial<PlaceFilters>): Promise<Place[]>;

  /** Return a single place by id, or null if it doesn't exist. */
  getPlaceById(id: string): Promise<Place | null>;

  /** Return the list of cities used for filtering. */
  getCities(): Promise<City[]>;

  /** Submit a "wrong info" report for a place. */
  submitReport(report: NewIssueReport): Promise<void>;
}
