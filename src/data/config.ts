/**
 * Data-source configuration.
 *
 * Flip `DATA_SOURCE` to 'supabase' once the backend is wired up.
 * Everything else in the app talks to the repository interface, so this is the
 * only switch that needs to change.
 */
export type DataSource = 'mock' | 'osm' | 'supabase';

// 'osm'   = real OpenStreetMap data (src/data/generated/places.osm.json)
// 'mock'  = fictional demo seed (src/data/seed)
// 'supabase' = future backend
export const DATA_SOURCE: DataSource = 'osm';

/** Simulated network latency for the mock repository (ms). */
export const MOCK_LATENCY_MS = 250;

/**
 * Supabase connection details — read from env / app config when present.
 * Left blank for the MVP (no auth, no paid services yet).
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
