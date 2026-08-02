import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GeoPoint } from '../types';

function coordKey(loc: GeoPoint): string {
  return `@karov/cityName_${Math.round(loc.latitude * 100)}_${Math.round(loc.longitude * 100)}`;
}

export function useCityName(location: GeoPoint | null): string | null {
  const [cityName, setCityName] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;

    let mounted = true;
    const key = coordKey(location);

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached && mounted) { setCityName(cached); return; }
      } catch {}

      try {
        const url =
          `https://nominatim.openstreetmap.org/reverse` +
          `?lat=${location.latitude}&lon=${location.longitude}&format=json&accept-language=he`;
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'Karov/1.0 (kosher-app)', 'Referer': 'https://karov-eta.vercel.app' },
        });
        const json = await resp.json();
        const addr = json.address ?? {};
        const city =
          addr.city || addr.town || addr.village || addr.suburb || addr.county || null;
        if (city && mounted) {
          setCityName(city);
          await AsyncStorage.setItem(key, city).catch(() => {});
        }
      } catch {}
    })();

    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude]);

  return cityName;
}
