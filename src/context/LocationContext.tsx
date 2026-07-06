import React, { createContext, useContext, ReactNode } from 'react';
import { useLocation } from '../hooks/useLocation';
import { GeoPoint } from '../types';
import { LocationStatus } from '../hooks/useLocation';

interface LocationContextValue {
  status: LocationStatus;
  location: GeoPoint | null;
  request: () => Promise<void>;
}

const LocationContext = createContext<LocationContextValue | null>(null);

/**
 * Shares a single location/permission state across all screens, so requesting
 * location on Home (e.g. "מה יש סביבי?") is reflected on Map, List and Detail.
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const value = useLocation(true); // auto-request on mount
  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useSharedLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useSharedLocation must be used within a LocationProvider');
  }
  return ctx;
}
