import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tazivpvmkljomlzrnlxv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheml2cHZta2xqb21senJubHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTMzMTMsImV4cCI6MjA3NzEyOTMxM30.GpmwHuE65RdPfOMzP-1MaHnQg8JWnz0LjrIfh_SMCmQ';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);