/**
 * Supabase Admin Client Configuration
 * 
 * Creates the Supabase admin client for server-side operations.
 * This client uses the service role key and BYPASSES RLS.
 * 
 * IMPORTANT: Only use this for:
 * - User creation during signup
 * - Agency creation during signup
 * - System-level operations
 * - Audit logging
 * 
 * NEVER expose this client to the frontend.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase admin environment variables');
}

/**
 * Supabase admin client - BYPASSES RLS
 * Only use for trusted server-side operations
 */
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
