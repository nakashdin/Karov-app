import { useCallback, useEffect, useState } from 'react';
import { placesRepository } from '../data/placesRepository';
import { Place, PlaceFilters } from '../types';

interface UsePlacesResult {
  places: Place[];
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
}

/**
 * Load places from the repository, re-fetching whenever filters change.
 * Filtering happens in the data layer so this works identically for Supabase.
 */
export function usePlaces(filters?: Partial<PlaceFilters>): UsePlacesResult {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Stable key so the effect only re-runs on meaningful filter changes.
  const key = JSON.stringify(filters ?? {});

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await placesRepository.getPlaces(filters);
      setPlaces(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    void load();
  }, [load]);

  return { places, loading, error, reload: load };
}
