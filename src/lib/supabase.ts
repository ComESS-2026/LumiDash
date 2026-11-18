import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Fallback dummy values allow the app to preview without a `.env` file.
// Real values should be provided via VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
