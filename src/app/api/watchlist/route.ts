import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import type { WatchlistStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: WatchlistStatus[] = ['plan_to_watch', 'watching', 'completed'];

export async function GET() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('watchlist')
    .select('*, movies(*)')
    .eq('user_id', user.id)
    .order('date_added', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}

interface PostBody {
  movie_id?: number;
  status?: WatchlistStatus;
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const movieId = Number(body.movie_id);
  const status = body.status ?? 'plan_to_watch';
  if (!Number.isFinite(movieId) || movieId <= 0) {
    return NextResponse.json({ error: 'movie_id required' }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('watchlist')
    .insert({ user_id: user.id, movie_id: movieId, status })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data }, { status: 201 });
}
