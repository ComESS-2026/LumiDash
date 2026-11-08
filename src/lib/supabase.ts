import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function missingClient(): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get() {
      throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use club data.');
    },
  });
}

export const supabase: SupabaseClient =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : missingClient();
