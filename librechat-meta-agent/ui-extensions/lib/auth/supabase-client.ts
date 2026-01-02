import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Creates a Supabase client for use in browser/client components
 * This client handles authentication state and provides access to Supabase services
 */
export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  return client;
}

/**
 * Gets the current Supabase client instance
 * Creates a new one if it doesn't exist
 */
export function getClient() {
  return createClient();
}
