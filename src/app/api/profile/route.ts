import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface PutBody {
  username?: string;
  full_name?: string | null;
  bio?: string | null;
  profile_image_url?: string | null;
}

export async function PUT(req: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.username === 'string') {
    const username = body.username.trim();
    if (!/^[a-z0-9_]{3,50}$/i.test(username)) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }
    const { data: clash } = await supabase
      .from('users')
      .select('user_id')
      .eq('username', username)
      .neq('user_id', user.id)
      .maybeSingle();
    if (clash) {
      return NextResponse.json({ error: 'Username taken' }, { status: 409 });
    }
    update.username = username;
  }
  if ('full_name' in body) {
    update.full_name = body.full_name?.toString().trim() || null;
  }
  if ('bio' in body) {
    update.bio = body.bio?.toString() ?? null;
  }
  if ('profile_image_url' in body) {
    const url = body.profile_image_url?.toString().trim() || null;
    update.profile_image_url = url;
  }

  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('user_id', user.id)
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username taken' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ profile: data });
}
