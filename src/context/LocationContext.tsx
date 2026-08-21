import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { GeoPoint } from '../types';
import {
  checkLocationPermission,
  requestLocation,
  resolveLocationSilently,
} from '../utils/locationPermission';

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

  // On mount: silently pick the location up if permission was already granted.
  useEffect(() => {
    let cancelled = false;
    checkLocationPermission().then((state) => {
      if (cancelled) return;
      if (state !== 'unknown') setPermissionState(state as PermissionState);
      if (state === 'denied') {
        setStatus('denied');
        return;
      }
      // 'unknown' is what Safari always answers, so probe rather than give up —
      // otherwise every reload on an iPhone would lose an approved location.
      if (state !== 'granted' && state !== 'unknown') return;

      setStatus('requesting');
      resolveLocationSilently().then((loc) => {
        if (cancelled) return;
        if (loc) {
          if (typeof window !== 'undefined') (window as any).__karovLoc = loc;
          setLocation(loc);
          setStatus('granted');
        } else {
          setStatus(state === 'granted' ? 'denied' : 'idle');
        }
      });
    });

    // Keep `permissionState` in sync when the user flips it in settings.
    let permStatus: PermissionStatus | null = null;
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          if (cancelled) return;
          permStatus = result;
          result.onchange = () => setPermissionState(result.state);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      if (permStatus) permStatus.onchange = null;
    };
  }, []);

  const request = () => {
    if (status === 'granted' && location) return;
    setStatus('requesting');
    requestLocation().then((result) => {
      if (result.ok) {
        if (typeof window !== 'undefined') (window as any).__karovLoc = result.location;
        setLocation(result.location);
        setStatus('granted');
      } else {
        setStatus('denied');
      }
    });
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
