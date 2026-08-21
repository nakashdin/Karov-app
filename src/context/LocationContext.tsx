import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
} from 'react';
import { AppState, Platform } from 'react-native';
import { GeoPoint } from '../types';
import {
  checkLocationPermission,
  requestLocation,
  resolveLocationSilently,
  verifyLocationAccess,
} from '../utils/locationPermission';

/** Wall-clock helper kept in one place so the revalidation throttle is testable. */
const nowMs = () => Date.now();

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

  // Read inside listeners that outlive a render, so keep a live copy.
  const statusRef = useRef<LocationStatus>('idle');
  statusRef.current = status;

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

  // Catch a permission the user revoked in the settings app while we were in
  // the background. Nothing notifies us, so re-verify whenever we come back.
  useEffect(() => {
    let lastCheck = 0;

    const revalidate = () => {
      if (statusRef.current !== 'granted') return;
      // `focus` fires often on web; one real check every 10s is plenty.
      const now = nowMs();
      if (now - lastCheck < 10000) return;
      lastCheck = now;

      verifyLocationAccess().then((result) => {
        if (result.ok) {
          if (typeof window !== 'undefined') (window as any).__karovLoc = result.location;
          setLocation(result.location);
          return;
        }
        // A timeout or a momentarily unavailable fix is not a revocation.
        if (result.reason !== 'denied') return;
        if (typeof window !== 'undefined') (window as any).__karovLoc = null;
        setLocation(null);
        setStatus('denied');
      });
    };

    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') revalidate();
    });
    const cleanups: Array<() => void> = [() => sub.remove()];

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onReturn = () => {
        if (typeof document === 'undefined' || document.visibilityState === 'visible') revalidate();
      };
      document.addEventListener('visibilitychange', onReturn);
      window.addEventListener('pageshow', onReturn);
      window.addEventListener('focus', onReturn);
      cleanups.push(() => {
        document.removeEventListener('visibilitychange', onReturn);
        window.removeEventListener('pageshow', onReturn);
        window.removeEventListener('focus', onReturn);
      });
    }

    return () => cleanups.forEach((fn) => fn());
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
