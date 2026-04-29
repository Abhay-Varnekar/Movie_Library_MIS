import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '../../_guard';
import { createAdminClient } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface PutBody {
  is_active?: boolean;
  is_admin?: boolean;
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

  // Disallow self-demote / self-deactivate so an admin can't lock themselves out.
  const me = await getCurrentUser();
  if (me?.user_id === params.id) {
    if (body.is_admin === false || body.is_active === false) {
      return NextResponse.json(
        { error: 'You cannot demote or deactivate yourself.' },
        { status: 400 }
      );
    }
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active;
  if (typeof body.is_admin === 'boolean') update.is_admin = body.is_admin;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('users')
    .update(update)
    .eq('user_id', params.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({ user: data });
}
