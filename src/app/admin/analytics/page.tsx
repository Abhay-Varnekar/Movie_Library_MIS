import { createAdminClient } from '@/lib/supabase-admin';
import {
  RatingHistogramChart,
  ReviewsTimelineChart,
  DirectorsBarChart,
  GenreDonutChart,
} from '@/components/admin/charts/AnalyticsCharts';
import { PrintButton } from '@/components/admin/charts/PrintButton';

export const dynamic = 'force-dynamic';

interface KPI {
  users: number;
  movies: number;
  reviews: number;
  avgRating: number | null;
  newReviews30d: number;
  newUsers30d: number;
}

const TIMELINE_DAYS = 90;
const DIRECTORS_TOP = 10;
const REVIEWERS_TOP = 10;
const DIRECTOR_MIN_MOVIES = 2;

export default async function AdminAnalyticsPage() {
  const admin = createAdminClient();

  const [
    usersHeadRes,
    moviesHeadRes,
    reviewsHeadRes,
    moviesRes,
    reviewsRes,
    movieGenresRes,
    genresRes,
    usersForLeaderboardRes,
  ] = await Promise.all([
    admin.from('users').select('user_id', { count: 'exact', head: true }),
    admin.from('movies').select('movie_id', { count: 'exact', head: true }),
    admin.from('reviews').select('review_id', { count: 'exact', head: true }),
    admin
      .from('movies')
      .select('movie_id, director, rating_imdb, release_year'),
    admin.from('reviews').select('rating, created_at, user_id'),
    admin.from('movie_genres').select('movie_id, genre_id'),
    admin.from('genres').select('genre_id, genre_name'),
    admin.from('users').select('user_id, username, created_at'),
  ]);

  const movies = (moviesRes.data ?? []) as Array<{
    movie_id: number;
    director: string | null;
    rating_imdb: number | null;
    release_year: number | null;
  }>;
  const reviews = (reviewsRes.data ?? []) as Array<{
    rating: number;
    created_at: string;
    user_id: string;
  }>;
  const movieGenres = (movieGenresRes.data ?? []) as Array<{
    movie_id: number;
    genre_id: number;
  }>;
  const genres = (genresRes.data ?? []) as Array<{
    genre_id: number;
    genre_name: string;
  }>;
  const usersList = (usersForLeaderboardRes.data ?? []) as Array<{
    user_id: string;
    username: string;
    created_at: string;
  }>;

  // ---- KPI ----
  const totalRatingSum = reviews.reduce((s, r) => s + r.rating, 0);
  const avgRating =
    reviews.length > 0 ? Number((totalRatingSum / reviews.length).toFixed(2)) : null;

  const cutoff30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newReviews30d = reviews.filter(
    (r) => new Date(r.created_at).getTime() >= cutoff30
  ).length;
  const newUsers30d = usersList.filter(
    (u) => new Date(u.created_at).getTime() >= cutoff30
  ).length;

  const kpi: KPI = {
    users: usersHeadRes.count ?? 0,
    movies: moviesHeadRes.count ?? 0,
    reviews: reviewsHeadRes.count ?? 0,
    avgRating,
    newReviews30d,
    newUsers30d,
  };

  // ---- Rating histogram (movies.rating_imdb) ----
  const ratingBuckets = Array.from({ length: 10 }, (_, i) => ({
    bucket: String(i + 1),
    count: 0,
  }));
  for (const m of movies) {
    if (m.rating_imdb == null) continue;
    const b = Math.min(10, Math.max(1, Math.round(m.rating_imdb)));
    ratingBuckets[b - 1].count += 1;
  }

  // ---- Reviews timeline (last N days) ----
  const dayBuckets: Array<{ key: string; day: string; count: number }> = [];
  const now = new Date();
  for (let i = TIMELINE_DAYS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = isoDay(d);
    dayBuckets.push({
      key,
      day: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      count: 0,
    });
  }
  const dayIndex = new Map(dayBuckets.map((b, i) => [b.key, i] as const));
  for (const r of reviews) {
    const key = isoDay(new Date(r.created_at));
    const i = dayIndex.get(key);
    if (i != null) dayBuckets[i].count += 1;
  }
  const timelineData = dayBuckets.map(({ day, count }) => ({ day, count }));

  // ---- Top directors (avg rating, min N movies) ----
  const dirAgg = new Map<string, { sum: number; n: number }>();
  for (const m of movies) {
    if (!m.director || m.rating_imdb == null) continue;
    const a = dirAgg.get(m.director) ?? { sum: 0, n: 0 };
    a.sum += m.rating_imdb;
    a.n += 1;
    dirAgg.set(m.director, a);
  }
  const directors = Array.from(dirAgg.entries())
    .filter(([, a]) => a.n >= DIRECTOR_MIN_MOVIES)
    .map(([director, a]) => ({
      director,
      avg_rating: Number((a.sum / a.n).toFixed(2)),
      count: a.n,
    }))
    .sort((a, b) => b.avg_rating - a.avg_rating)
    .slice(0, DIRECTORS_TOP);

  // ---- Top reviewers ----
  const reviewerAgg = new Map<string, { count: number; sum: number }>();
  for (const r of reviews) {
    const a = reviewerAgg.get(r.user_id) ?? { count: 0, sum: 0 };
    a.count += 1;
    a.sum += r.rating;
    reviewerAgg.set(r.user_id, a);
  }
  const usernameMap = new Map(usersList.map((u) => [u.user_id, u.username] as const));
  const reviewers = Array.from(reviewerAgg.entries())
    .map(([user_id, a]) => ({
      user_id,
      username: usernameMap.get(user_id) ?? user_id.slice(0, 8),
      count: a.count,
      avg_rating: Number((a.sum / a.count).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, REVIEWERS_TOP);

  // ---- Genre share + Genre × decade heatmap ----
  const movieIdToYear = new Map(
    movies.map((m) => [m.movie_id, m.release_year] as const)
  );
  const genreNameById = new Map(
    genres.map((g) => [g.genre_id, g.genre_name] as const)
  );
  const genreCount = new Map<number, number>();
  // decade key like "1990s"; cell = count of movie_genres
  const heatmap = new Map<number, Map<string, number>>(); // genre_id -> decade -> count
  const decadeSet = new Set<string>();
  for (const link of movieGenres) {
    genreCount.set(link.genre_id, (genreCount.get(link.genre_id) ?? 0) + 1);
    const year = movieIdToYear.get(link.movie_id);
    if (year == null) continue;
    const decade = `${Math.floor(year / 10) * 10}s`;
    decadeSet.add(decade);
    let row = heatmap.get(link.genre_id);
    if (!row) {
      row = new Map();
      heatmap.set(link.genre_id, row);
    }
    row.set(decade, (row.get(decade) ?? 0) + 1);
  }

  const genreShare = genres
    .map((g) => ({
      genre: g.genre_name,
      count: genreCount.get(g.genre_id) ?? 0,
    }))
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count);

  const decades = Array.from(decadeSet).sort();
  const heatmapRows = genres
    .map((g) => ({
      genre_id: g.genre_id,
      genre_name: g.genre_name,
      cells: decades.map((d) => ({
        decade: d,
        count: heatmap.get(g.genre_id)?.get(d) ?? 0,
      })),
      total: genreCount.get(g.genre_id) ?? 0,
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
  const heatmapMax = Math.max(
    1,
    ...heatmapRows.flatMap((r) => r.cells.map((c) => c.count))
  );

  return (
    <section className="space-y-8 print:space-y-6">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-lg font-semibold">Analytics 2.0</h2>
          <p className="text-xs text-zinc-500">
            Live aggregations across the catalogue, users, and reviews.
          </p>
        </div>
        <PrintButton />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Users" value={kpi.users} sub={`+${kpi.newUsers30d} / 30d`} />
        <Kpi label="Movies" value={kpi.movies} />
        <Kpi label="Reviews" value={kpi.reviews} sub={`+${kpi.newReviews30d} / 30d`} />
        <Kpi
          label="Avg review"
          value={kpi.avgRating != null ? kpi.avgRating.toFixed(2) : '—'}
          sub="Across all reviews"
        />
        <Kpi
          label="Genres covered"
          value={genreShare.length}
          sub={`${genres.length} total`}
        />
        <Kpi
          label="Active directors"
          value={dirAgg.size}
          sub={`≥${DIRECTOR_MIN_MOVIES} for ranking`}
        />
      </div>

      {/* Two-column row: timeline + rating histogram */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Reviews per day"
          subtitle={`Last ${TIMELINE_DAYS} days · platform engagement signal`}
        >
          <ReviewsTimelineChart data={timelineData} />
        </Panel>
        <Panel
          title="Movie rating distribution"
          subtitle="IMDb rating bucketed 1–10"
        >
          <RatingHistogramChart data={ratingBuckets} />
        </Panel>
      </div>

      {/* Heatmap */}
      <Panel
        title="Genre × decade heatmap"
        subtitle="How each genre is represented across decades. Darker = more titles."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-surface px-2 py-1 text-left text-zinc-400">
                  Genre
                </th>
                {decades.map((d) => (
                  <th key={d} className="px-2 py-1 text-center text-zinc-400">
                    {d}
                  </th>
                ))}
                <th className="px-2 py-1 text-right text-zinc-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {heatmapRows.map((row) => (
                <tr key={row.genre_id}>
                  <td className="sticky left-0 bg-surface px-2 py-1 text-zinc-200">
                    {row.genre_name}
                  </td>
                  {row.cells.map((c) => (
                    <td
                      key={c.decade}
                      className="px-2 py-1 text-center"
                      style={{
                        backgroundColor:
                          c.count === 0
                            ? '#111317'
                            : `rgba(229,9,20,${0.15 + 0.85 * (c.count / heatmapMax)})`,
                        color: c.count > heatmapMax * 0.5 ? '#fff' : '#d4d4d8',
                        borderRadius: 3,
                        minWidth: 44,
                      }}
                      title={`${row.genre_name} — ${c.decade}: ${c.count}`}
                    >
                      {c.count > 0 ? c.count : ''}
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right text-zinc-300">
                    {row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Two-col: directors + donut */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <Panel
          title={`Top ${DIRECTORS_TOP} directors`}
          subtitle={`Ranked by avg rating · min ${DIRECTOR_MIN_MOVIES} movies`}
        >
          {directors.length === 0 ? (
            <Empty />
          ) : (
            <DirectorsBarChart data={directors} />
          )}
        </Panel>
        <Panel
          title="Genre share"
          subtitle="Movie-genre links per genre"
        >
          {genreShare.length === 0 ? (
            <Empty />
          ) : (
            <GenreDonutChart data={genreShare} />
          )}
        </Panel>
      </div>

      {/* Reviewers leaderboard */}
      <Panel
        title={`Top ${REVIEWERS_TOP} reviewers`}
        subtitle="Most active by review count"
      >
        {reviewers.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-2 py-1.5 text-left">#</th>
                  <th className="px-2 py-1.5 text-left">Username</th>
                  <th className="px-2 py-1.5 text-right">Reviews</th>
                  <th className="px-2 py-1.5 text-right">Avg rating</th>
                </tr>
              </thead>
              <tbody>
                {reviewers.map((r, i) => (
                  <tr
                    key={r.user_id}
                    className="border-t border-zinc-800/60 text-zinc-200"
                  >
                    <td className="px-2 py-1.5 text-zinc-500">{i + 1}</td>
                    <td className="px-2 py-1.5">{r.username}</td>
                    <td className="px-2 py-1.5 text-right">{r.count}</td>
                    <td className="px-2 py-1.5 text-right">
                      {r.avg_rating.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </section>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-surface px-4 py-3 print:border-zinc-300">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-zinc-100">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-surface p-4 print:break-inside-avoid">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-32 items-center justify-center text-xs text-zinc-500">
      No data yet.
    </div>
  );
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}
