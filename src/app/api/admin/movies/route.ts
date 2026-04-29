import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '../_guard';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

interface PostBody {
  title?: string;
  director?: string | null;
  release_year?: number | null;
  language?: string | null;
  rating_imdb?: number | null;
  description?: string | null;
  poster_url?: string | null;
  banner_url?: string | null;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('movies')
    .insert({
      title: body.title.trim(),
      director: body.director ?? null,
      release_year: body.release_year ?? null,
      language: body.language ?? null,
      rating_imdb: body.rating_imdb ?? null,
      description: body.description ?? null,
      poster_url: body.poster_url ?? null,
      banner_url: body.banner_url ?? null,
      is_active: true,
    })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ movie: data }, { status: 201 });
}
