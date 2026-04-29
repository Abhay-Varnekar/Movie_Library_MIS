import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface PutBody {
  rating?: number;
  review_text?: string | null;
  is_spoiler?: boolean;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
  if (body.rating != null) {
    const r = Number(body.rating);
    if (!Number.isFinite(r) || r < 1 || r > 10) {
      return NextResponse.json({ error: 'rating out of range' }, { status: 400 });
    }
    update.rating = r;
  }
  if ('review_text' in body) {
    update.review_text =
      typeof body.review_text === 'string' && body.review_text.trim()
        ? body.review_text.trim()
        : null;
  }
  if ('is_spoiler' in body) update.is_spoiler = Boolean(body.is_spoiler);

  const { data, error } = await supabase
    .from('reviews')
    .update(update)
    .eq('review_id', params.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  return NextResponse.json({ review: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { error } = await supabase.from('reviews').delete().eq('review_id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
