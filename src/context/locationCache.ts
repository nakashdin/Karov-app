import { GeoPoint } from '../types';

/**
 * Last known device location, readable outside React.
 *
 * This replaces `(window as any).__karovLoc`, which was written from seven
 * places across two files. That global was untyped, mutable by anything on the
 * page, and semantically wrong on native — `window` exists there but is not
 * where app state belongs.
 *
 * Module scope gives the same lifetime with none of that: the value lives as
 * long as the JS context, is typed, and can only be changed through these two
 * functions. It is a cache, not a source of truth — `LocationContext` owns the
 * real state, and React components must read it through `useSharedLocation()`
 * so they re-render when it changes.
 */
let cached: GeoPoint | null = null;

/** For code that runs outside a React render — splash bootstrap, screen setup. */
export function getCachedLocation(): GeoPoint | null {
  return cached;
}

export function setCachedLocation(location: GeoPoint | null): void {
  cached = location;
}
