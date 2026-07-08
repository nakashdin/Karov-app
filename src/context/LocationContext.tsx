import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { GeoPoint } from '../types';

export function getCachedLocation(): GeoPoint | null {
  return (typeof window !== 'undefined' ? (window as any).__karovLoc : null) ?? null;
}

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

interface LocationContextValue {
  status: LocationStatus;
  location: GeoPoint | null;
  request: () => void;
  setGranted: (loc: GeoPoint) => void;
  permissionState: PermissionState | null;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);

  // On mount: silently check if location permission was already granted
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      setPermissionState(result.state);
      if (result.state === 'granted' && navigator.geolocation) {
        setStatus('requesting');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            if (typeof window !== 'undefined') (window as any).__karovLoc = loc;
            setLocation(loc);
            setStatus('granted');
          },
          () => setStatus('denied'),
          { enableHighAccuracy: false, timeout: 10000 },
        );
      } else if (result.state === 'denied') {
        setStatus('denied');
      }
      result.onchange = () => setPermissionState(result.state);
    }).catch(() => {});
  }, []);

  const request = () => {
    if (!navigator.geolocation) { setStatus('denied'); return; }
    if (status === 'granted' && location) return;
    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setStatus('granted');
      },
      () => {
        setStatus('denied');
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const setGranted = (loc: GeoPoint) => {
    if (typeof window !== 'undefined') (window as any).__karovLoc = loc;
    setLocation(loc);
    setStatus('granted');
  };

  return (
    <LocationContext.Provider value={{ status, location, request, setGranted, permissionState }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useSharedLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useSharedLocation must be used within LocationProvider');
  return ctx;
}
