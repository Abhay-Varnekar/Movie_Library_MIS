import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const supabase = createServerClient();

  const [
    moviesCount,
    actorsCount,
    usersCount,
    reviewsCount,
    pendingReviewsCount,
    avgRatingRes,
  ] = await Promise.all([
    supabase.from('movies').select('*', { count: 'exact', head: true }),
    supabase.from('actors').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', false),
    supabase.from('reviews').select('rating'),
  ]);

  const ratings = (avgRatingRes.data as { rating: number }[] | null) ?? [];
  const avgRating =
    ratings.length > 0
      ? Number((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(2))
      : null;

  const cards: Array<{ label: string; value: string | number; tone?: string }> = [
    { label: 'Movies', value: moviesCount.count ?? 0 },
    { label: 'Actors', value: actorsCount.count ?? 0 },
    { label: 'Users', value: usersCount.count ?? 0 },
    { label: 'Reviews', value: reviewsCount.count ?? 0 },
    {
      label: 'Pending reviews',
      value: pendingReviewsCount.count ?? 0,
      tone: (pendingReviewsCount.count ?? 0) > 0 ? 'warn' : undefined,
    },
    { label: 'Average rating', value: avgRating != null ? `★ ${avgRating}` : '—' },
  ];

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Overview</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-lg border p-5 ${
              c.tone === 'warn'
                ? 'border-amber-500/50 bg-amber-900/20'
                : 'border-zinc-800 bg-surface'
            }`}
          >
            <div className="text-xs uppercase tracking-wider text-zinc-400">
              {c.label}
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight">{c.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
