import { useEffect, useState } from 'react';
import { placesRepository } from '../data/placesRepository';
import { City } from '../types';

/** Load the list of cities for the filter UI. */
export function useCities(): { cities: City[]; loading: boolean } {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    placesRepository
      .getCities()
      .then((c) => {
        if (active) setCities(c);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { cities, loading };
}
