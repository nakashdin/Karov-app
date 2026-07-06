import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
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
  request: () => Promise<void>;
}

async function requestNative(
  setStatus: (s: LocationStatus) => void,
  setLocation: (g: GeoPoint) => void,
) {
  const Location = await import('expo-location');
  const { status: perm } = await Location.requestForegroundPermissionsAsync();
  if (perm !== 'granted') { setStatus('denied'); return; }
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
  setStatus('granted');
}

async function requestWeb(
  setStatus: (s: LocationStatus) => void,
  setLocation: (g: GeoPoint) => void,
) {
  if (!navigator.geolocation) { setStatus('denied'); return; }
  return new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setStatus('granted');
        resolve();
      },
      () => { setStatus('denied'); resolve(); },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  });
}

export function useLocation(autoRequest = false): UseLocationResult {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [location, setLocation] = useState<GeoPoint | null>(null);

  const request = useCallback(async () => {
    try {
      setStatus('requesting');
      if (Platform.OS === 'web') {
        await requestWeb(setStatus, setLocation);
      } else {
        await requestNative(setStatus, setLocation);
      }
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (autoRequest) void request();
  }, [autoRequest, request]);

  return { status, location, request };
}
