import { City, NewIssueReport, Place, PlaceFilters } from '../../types';
import { MOCK_LATENCY_MS } from '../config';
import { CITIES_SEED } from '../seed/cities.seed';
import { PLACES_SEED } from '../seed/places.seed';
import { matchesFilters } from './filterPlaces';
import { PlacesRepository } from './PlacesRepository';

/** Resolve after `ms`, to simulate network latency. */
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * In-memory repository backed by the seed files.
 * Reports are kept in memory only (logged) — no persistence in the MVP.
 */
export class MockPlacesRepository implements PlacesRepository {
  private readonly places: Place[] = PLACES_SEED;
  private readonly cities: City[] = CITIES_SEED;
  private readonly reports: NewIssueReport[] = [];

  async getPlaces(filters: Partial<PlaceFilters> = {}): Promise<Place[]> {
    await delay(MOCK_LATENCY_MS);
    return this.places.filter((p) => matchesFilters(p, filters));
  }

  async getPlaceById(id: string): Promise<Place | null> {
    await delay(MOCK_LATENCY_MS);
    return this.places.find((p) => p.id === id) ?? null;
  }

  async getCities(): Promise<City[]> {
    await delay(MOCK_LATENCY_MS);
    return this.cities;
  }

  async submitReport(report: NewIssueReport): Promise<void> {
    await delay(MOCK_LATENCY_MS);
    this.reports.push(report);
    // eslint-disable-next-line no-console
    console.log('[MockPlacesRepository] report submitted:', report);
  }
}
