import { createClient } from '@supabase/supabase-js';

// --- Hardcoded Supabase Credentials for Development ---
// WARNING: These credentials are provided for development purposes in an environment
// where setting environment variables is not feasible. For any production deployment,
// these values MUST be replaced with secure environment variables.
const supabaseUrl = 'https://tazivpvmkljomlzrnlxv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheml2cHZta2xqb21senJubHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTMzMTMsImV4cCI6MjA3NzEyOTMxM30.GpmwHuE65RdPfOMzP-1MaHnQg8JWnz0LjrIfh_SMCmQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    // FIX: Disable automatic background refresh to handle it manually and more robustly.
    autoRefreshToken: false,
    detectSessionInUrl: true,
    // FIX: Enforce localStorage as the single, consistent storage source to prevent conflicts.
    storage: localStorage,
  },
});
