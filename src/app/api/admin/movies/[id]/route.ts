import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '../../_guard';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

interface PutBody {
  title?: string;
  director?: string | null;
  release_year?: number | null;
  language?: string | null;
  rating_imdb?: number | null;
  description?: string | null;
  poster_url?: string | null;
  banner_url?: string | null;
  is_active?: boolean;
}

const ALLOWED_KEYS: Array<keyof PutBody> = [
  'title',
  'director',
  'release_year',
  'language',
  'rating_imdb',
  'description',
  'poster_url',
  'banner_url',
  'is_active',
];

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;

  const movieId = parseInt(params.id, 10);
  if (!Number.isFinite(movieId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  ALLOWED_KEYS.forEach((k) => {
    if (k in body) update[k] = body[k];
  });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('movies')
    .update(update)
    .eq('movie_id', movieId)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
  return NextResponse.json({ movie: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;

  const movieId = parseInt(params.id, 10);
  if (!Number.isFinite(movieId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('movies')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('movie_id', movieId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
