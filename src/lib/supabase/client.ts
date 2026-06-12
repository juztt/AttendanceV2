import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL: string = ((import.meta as any).env?.VITE_SUPABASE_URL ?? '') as string;
const SUPABASE_ANON_KEY: string = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? '') as string;

// In demo mode (no env vars) we use a localStorage-backed mock so the UI
// can run end-to-end without a Supabase project. This keeps the app
// fully functional for evaluation without any backend setup.
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let _client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'mini-timepay-auth',
    },
  });
  return _client;
}
