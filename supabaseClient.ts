import { createClient } from '@supabase/supabase-js';

// --- Supabase Credentials ---
// Primary values are read from environment variables; fall back to development defaults if not set.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tazivpvmkljomlzrnlxv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheml2cHZta2xqb21senJubHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTMzMTMsImV4cCI6MjA3NzEyOTMxM30.GpmwHuE65RdPfOMzP-1MaHnQg8JWnz0LjrIfh_SMCmQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
  },
});
