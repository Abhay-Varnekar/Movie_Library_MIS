'use client';

import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Browser-side Supabase client. Uses @supabase/ssr to read/write the
 * auth-token cookies that the middleware + server clients also see.
 *
 * Cached as a module-level singleton so onAuthStateChange listeners stay
 * subscribed across renders.
 */
export function createBrowserClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.'
    );
  }
  cached = createSsrBrowserClient(url, anon);
  return cached;
}
