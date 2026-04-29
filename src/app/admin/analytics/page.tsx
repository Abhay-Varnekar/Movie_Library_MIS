import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

interface GenreCount {
  genre_id: number;
  genre_name: string;
  count: number;
}

export default async function AdminAnalyticsPage() {
  const admin = createAdminClient();

  // ---- Genre distribution ----
  const [genresRes, movieGenresRes, usersByMonthRes, ratingsRes] = await Promise.all([
    admin.from('genres').select('genre_id, genre_name'),
    admin.from('movie_genres').select('genre_id'),
    admin
      .from('users')
      .select('created_at')
      .order('created_at', { ascending: false }),
    admin.from('reviews').select('rating'),
  ]);

  const genreCounts = new Map<number, number>();
  (movieGenresRes.data ?? []).forEach((row: { genre_id: number }) => {
    genreCounts.set(row.genre_id, (genreCounts.get(row.genre_id) ?? 0) + 1);
  });
  const genreData: GenreCount[] = (
    (genresRes.data as Array<{ genre_id: number; genre_name: string }> | null) ?? []
  )
    .map((g) => ({
      genre_id: g.genre_id,
      genre_name: g.genre_name,
      count: genreCounts.get(g.genre_id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
  const maxGenre = Math.max(1, ...genreData.map((g) => g.count));

  // ---- Signup curve (last 12 months) ----
  const monthBuckets: Array<{ key: string; label: string; count: number }> = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthBuckets.push({
      key,
      label: d.toLocaleString('en', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(2),
      count: 0,
    });
  }
  ((usersByMonthRes.data as Array<{ created_at: string }> | null) ?? []).forEach((u) => {
    const d = new Date(u.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = monthBuckets.find((b) => b.key === key);
    if (bucket) bucket.count += 1;
  });
  const maxSignup = Math.max(1, ...monthBuckets.map((b) => b.count));

  // ---- Rating histogram (10 buckets, 1..10 inclusive) ----
  const ratingBuckets = Array.from({ length: 10 }, (_, i) => ({
    label: String(i + 1),
    count: 0,
  }));
  ((ratingsRes.data as Array<{ rating: number }> | null) ?? []).forEach((r) => {
    const bucket = Math.min(10, Math.max(1, Math.round(r.rating)));
    ratingBuckets[bucket - 1].count += 1;
  });
  const maxRating = Math.max(1, ...ratingBuckets.map((b) => b.count));

  return (
    <section className="space-y-10">
      {/* Genre distribution */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Genre distribution</h2>
        <div className="space-y-2 rounded-lg border border-zinc-800 bg-surface p-4">
          {genreData.length === 0 && (
            <div className="text-sm text-zinc-500">No data.</div>
          )}
          {genreData.map((g) => {
            const pct = (g.count / maxGenre) * 100;
            return (
              <div key={g.genre_id} className="text-xs">
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-zinc-300">{g.genre_name}</span>
                  <span className="text-zinc-500">{g.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Signup curve */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Signups (last 12 months)
        </h2>
        <div className="rounded-lg border border-zinc-800 bg-surface p-4">
          <div className="flex h-48 items-end gap-2">
            {monthBuckets.map((b) => {
              const pct = (b.count / maxSignup) * 100;
              return (
                <div key={b.key} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t bg-accent/80"
                      style={{ height: `${Math.max(2, pct)}%` }}
                      title={`${b.count} in ${b.label}`}
                    />
                  </div>
                  <div className="text-[10px] text-zinc-500">{b.label}</div>
                  <div className="text-[10px] text-zinc-300">{b.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rating histogram */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Rating histogram</h2>
        <div className="rounded-lg border border-zinc-800 bg-surface p-4">
          <div className="flex h-48 items-end gap-2">
            {ratingBuckets.map((b) => {
              const pct = (b.count / maxRating) * 100;
              return (
                <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t bg-amber-400/80"
                      style={{ height: `${Math.max(2, pct)}%` }}
                      title={`${b.count} reviews rated ${b.label}`}
                    />
                  </div>
                  <div className="text-[10px] text-zinc-500">{b.label}</div>
                  <div className="text-[10px] text-zinc-300">{b.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
