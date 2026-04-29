import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Supabase redirects to this URL after OAuth / magic-link / email-confirm
 * flows with a `?code=...` query param. We exchange it for a session.
 *
 * For the demo, email confirmation is OFF and we don't ship OAuth, so this
 * is a no-op fallback — included so the project keeps working if either is
 * enabled in the Supabase Dashboard later.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (code) {
    const supabase = createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL('/', req.url));
}
