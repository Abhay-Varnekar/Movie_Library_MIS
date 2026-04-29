import { cookies } from 'next/headers';
import { createServerClient as createSsrServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppUser } from './types';

/**
 * Cookie-aware Supabase client for server components and route handlers.
 * Reads/writes the `sb-*` cookies that @supabase/ssr expects, so
 * `auth.getUser()` resolves to the currently signed-in user and RLS
 * applies to all queries.
 *
 * Server components cannot mutate cookies (Next.js will throw); we
 * swallow those errors, the middleware refreshes the session anyway.
 */
export function createServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.'
    );
  }
  const cookieStore = cookies();
  return createSsrServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // server components are read-only for cookies; safe to ignore
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // see above
        }
      },
    },
  });
}

/**
 * Returns the current user's joined `public.users` row (the AppUser),
 * or null if no session. Used by route handlers and admin guard.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return (data as AppUser | null) ?? null;
}
