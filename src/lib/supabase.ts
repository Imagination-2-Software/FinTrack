import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Priority to VITE_SUPABASE_PUBLISHABLE_KEY, with backwards compatibility for VITE_SUPABASE_ANON_KEY
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabasePublishableKey !== 'your-publishable-key-here' &&
  supabasePublishableKey !== 'your-anon-key-here'
);

if (!isSupabaseConfigured) {
  console.warn(
    '[FinTrack] Supabase credentials are missing or unconfigured. Please create a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
  );
}

// Fallback dummy values prevent runtime initialization errors when credentials are not yet configured
const safeUrl = supabaseUrl || 'https://placeholder-fintrack.supabase.co';
const safeKey = supabasePublishableKey || 'placeholder-publishable-key';

export const supabase: SupabaseClient<Database> = createClient<Database>(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
