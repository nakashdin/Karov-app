import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { emptyFilters, PlaceFilters } from '../types';

interface FiltersContextValue {
  filters: PlaceFilters;
  setFilter: <K extends keyof PlaceFilters>(
    key: K,
    value: PlaceFilters[K],
  ) => void;
  setFilters: (next: PlaceFilters) => void;
  reset: () => void;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

/**
 * App-wide filter/search state, shared between the List, Map and Home screens
 * so a filter set in one place is reflected everywhere.
 */
export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<PlaceFilters>(emptyFilters);

  const value = useMemo<FiltersContextValue>(
    () => ({
      filters,
      setFilter: (key, val) =>
        setFiltersState((prev) => ({ ...prev, [key]: val })),
      setFilters: (next) => setFiltersState(next),
      reset: () => setFiltersState(emptyFilters),
    }),
    [filters],
  );

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return ctx;
}
