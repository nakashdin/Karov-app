import { useEffect, useState } from 'react';
import { GeoPoint } from '../types';
import { geocode } from '../shared/api';
import { getString, setString, StorageKeyFor } from '../shared/storage';

/**
 * Human-readable name of the city the user is standing in.
 *
 * Reverse geocoding is rate-limited by Nominatim's usage policy, so the result
 * is cached per ~1 km grid cell: moving around a city never issues a second
 * request.
 */
export function useCityName(location: GeoPoint | null): string | null {
  const [cityName, setCityName] = useState<string | null>(null);

  const lat = location?.latitude;
  const lng = location?.longitude;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;

    const controller = new AbortController();
    const key = StorageKeyFor.cityName(lat, lng);
    let mounted = true;

    (async () => {
      const cached = await getString(key);
      if (cached) {
        if (mounted) setCityName(cached);
        return;
      }

      try {
        const result = await geocode.fetchReverse(lat, lng, { signal: controller.signal });
        const name = geocode.cityNameOf(result);
        if (!name) return;
        await setString(key, name);
        if (mounted) setCityName(name);
      } catch {
        // No city label is a fine outcome — the UI simply omits it.
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [lat, lng]);

  return cityName;
}
