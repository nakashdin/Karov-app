import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GeoPoint } from '../types';

// Module-level cache — survives React re-renders and navigation
let _cachedLocation: GeoPoint | null = null;
export function getCachedLocation(): GeoPoint | null { return _cachedLocation; }

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error';

interface LocationContextValue {
  status: LocationStatus;
  location: GeoPoint | null;
  request: () => void;
  setGranted: (loc: GeoPoint) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [location, setLocation] = useState<GeoPoint | null>(null);

  const request = () => {
    if (!navigator.geolocation) { setStatus('denied'); return; }
    if (status === 'granted' && location) return; // already have location
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
    _cachedLocation = loc;
    setLocation(loc);
    setStatus('granted');
  };

  return (
    <LocationContext.Provider value={{ status, location, request, setGranted }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useSharedLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useSharedLocation must be used within LocationProvider');
  return ctx;
}
