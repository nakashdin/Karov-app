import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { GeoPoint } from '../types';

export type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'error';

interface UseLocationResult {
  status: LocationStatus;
  location: GeoPoint | null;
  /** Ask for permission and fetch the current position. */
  request: () => Promise<void>;
}

/**
 * Foreground location permission + current position.
 * Works in Expo Go (basic foreground access is supported).
 */
export function useLocation(autoRequest = false): UseLocationResult {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [location, setLocation] = useState<GeoPoint | null>(null);

  const request = useCallback(async () => {
    try {
      setStatus('requesting');
      const { status: perm } =
        await Location.requestForegroundPermissionsAsync();

      if (perm !== 'granted') {
        setStatus('denied');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      setStatus('granted');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (autoRequest) void request();
  }, [autoRequest, request]);

  return { status, location, request };
}
