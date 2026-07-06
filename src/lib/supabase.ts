import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../data/config';

/**
 * Supabase client — PLACEHOLDER.
 *
 * The app currently runs on mock data (see data/placesRepository.ts), so we do
 * NOT bundle supabase-js yet. When you're ready to connect a real backend:
 *
 *   1. npx expo install @supabase/supabase-js
 *   2. Fill EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (.env)
 *   3. Replace getSupabaseClient() below with a real createClient(...) call:
 *
 *        import { createClient } from '@supabase/supabase-js';
 *        export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 *
 *   4. Implement SupabasePlacesRepository and flip DATA_SOURCE to 'supabase'
 *      in data/config.ts.
 */
export function getSupabaseClient(): never {
  throw new Error(
    `Supabase is not configured yet (URL="${SUPABASE_URL}"). ` +
      'Install @supabase/supabase-js and wire up lib/supabase.ts first.',
  );
}

/** True once both env vars are present. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
