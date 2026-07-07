import React, { createContext, useContext, useState, ReactNode } from 'react';
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
    if (typeof window !== 'undefined') (window as any).__karovLoc = loc;
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
