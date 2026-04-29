import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface PostBody {
  movie_id?: number;
  rating?: number;
  review_text?: string;
  is_spoiler?: boolean;
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
  const rating = Number(body.rating);
  if (!Number.isFinite(movieId) || movieId <= 0) {
    return NextResponse.json({ error: 'movie_id required' }, { status: 400 });
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
    return NextResponse.json({ error: 'rating must be between 1 and 10' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      movie_id: movieId,
      user_id: user.id,
      rating,
      review_text: body.review_text?.trim() || null,
      is_spoiler: Boolean(body.is_spoiler),
    })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ review: data }, { status: 201 });
}
