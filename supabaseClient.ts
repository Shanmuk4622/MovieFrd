import { createClient } from '@supabase/supabase-js';

// --- Hardcoded Supabase Credentials for Development ---
// WARNING: These credentials are provided for development purposes in an environment
// where setting environment variables is not feasible. For any production deployment,
// these values MUST be replaced with secure environment variables.
const supabaseUrl = typeof process !== 'undefined' && (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)
  ? (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)
  : 'https://tazivpvmkljomlzrnlxv.supabase.co';
const supabaseAnonKey = typeof process !== 'undefined' && (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)
  ? (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheml2cHZta2xqb21senJubHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTMzMTMsImV4cCI6MjA3NzEyOTMxM30.GpmwHuE65RdPfOMzP-1MaHnQg8JWnz0LjrIfh_SMCmQ';

// Ensure a single Supabase client across HMR / module reloads by attaching it to globalThis.
// This prevents multiple GoTrueClient instances competing over localStorage and multiple
// auth listeners being created during development with HMR or in embedded runtimes.
const globalObj = (globalThis as any) || window;
if (!globalObj.__supabase) {
  globalObj.__supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      // Let Supabase manage refreshing tokens automatically
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Use localStorage consistently in the browser
      storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
    },
  });
}

export const supabase = globalObj.__supabase;