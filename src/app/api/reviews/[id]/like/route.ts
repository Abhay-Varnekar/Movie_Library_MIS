import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/reviews/[id]/like
 * Public endpoint — no per-user dedupe (academic shortcut, see Phase 3 spec).
 * Uses service-role to bypass RLS so anonymous visitors can also like.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();

  const { data: existing, error: fetchErr } = await admin
    .from('reviews')
    .select('review_id, likes_count')
    .eq('review_id', params.id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 });
  if (!existing) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

  const next = (existing.likes_count ?? 0) + 1;
  const { error } = await admin
    .from('reviews')
    .update({ likes_count: next })
    .eq('review_id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ likes_count: next });
}
