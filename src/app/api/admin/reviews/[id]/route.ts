import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '../../_guard';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

interface PutBody {
  is_approved?: boolean;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof body.is_approved !== 'boolean') {
    return NextResponse.json({ error: 'is_approved required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('reviews')
    .update({ is_approved: body.is_approved, updated_at: new Date().toISOString() })
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
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;

  const admin = createAdminClient();
  const { error } = await admin
    .from('reviews')
    .delete()
    .eq('review_id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
