import { useEffect, useState } from 'react';
import { placesRepository } from '../data/placesRepository';
import { Place } from '../types';

interface UsePlaceResult {
  place: Place | null;
  loading: boolean;
  error: boolean;
}

/** Load a single place by id. */
export function usePlace(id: string): UsePlaceResult {
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    placesRepository
      .getPlaceById(id)
      .then((p) => {
        if (active) setPlace(p);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  return { place, loading, error };
}
