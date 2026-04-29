import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-server';

/**
 * Verifies the cookie session belongs to an admin. Returns a 404 response
 * for non-admins (mirrors the page-level treatment so the route's existence
 * isn't leaked).
 */
export async function requireAdmin(): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const profile = await getCurrentUser();
  if (!profile?.is_admin) {
    return { ok: false, res: new NextResponse('Not found', { status: 404 }) };
  }
  return { ok: true };
}
