/**
 * Supabase Client Configuration
 * 
 * Creates the Supabase client for frontend use.
 * Note: We use Firebase for auth, so Supabase auth is not used.
 * This client is for database operations via RLS.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Supabase client for frontend operations
 * Uses the anon key - all operations are subject to RLS
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

/**
 * Create a Supabase client with a custom access token
 * This is used to pass the Firebase JWT to Supabase for RLS
 */
export function createSupabaseClient(accessToken?: string): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    },
  });
}
