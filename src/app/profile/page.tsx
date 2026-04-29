import { redirect } from 'next/navigation';
import { createServerClient, getCurrentUser } from '@/lib/supabase-server';
import { ProfileEditForm } from '@/components/ProfileEditForm';
import type { Review } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Profile — Movie Library',
};

export default async function ProfilePage() {
  const profile = await getCurrentUser();
  if (!profile) redirect('/login?redirectTo=/profile');

  const supabase = createServerClient();

  const [reviewsRes, watchlistCountRes, ratingsRes] = await Promise.all([
    supabase
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('watchlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.user_id),
    supabase
      .from('reviews')
      .select('rating')
      .eq('user_id', profile.user_id),
  ]);

  const reviews = ((reviewsRes.data as Review[] | null) ?? []).slice(0, 5);
  const reviewCount = reviewsRes.count ?? 0;
  const watchlistCount = watchlistCountRes.count ?? 0;
  const ratings = ((ratingsRes.data as { rating: number }[] | null) ?? []);
  const avgRating =
    ratings.length > 0
      ? Number((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1))
      : null;

  const joined = new Date(profile.created_at).toLocaleDateString();

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Your profile</h1>
      <p className="mb-8 text-sm text-zinc-400">
        Member since {joined}
        {profile.is_admin && (
          <span className="ml-2 rounded-full border border-amber-500/40 bg-amber-900/30 px-2 py-0.5 text-xs text-amber-200">
            Admin
          </span>
        )}
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        {/* Left: edit form */}
        <section className="rounded-lg bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">Edit profile</h2>
          <ProfileEditForm profile={profile} />
          <div className="mt-6 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
            Email (read-only): <span className="text-zinc-300">{profile.email}</span>
          </div>
        </section>

        {/* Right: stats card */}
        <aside className="space-y-3">
          <Stat label="Reviews written" value={reviewCount} />
          <Stat label="Watchlist size" value={watchlistCount} />
          <Stat
            label="Avg. rating given"
            value={avgRating != null ? `★ ${avgRating.toFixed(1)}` : '—'}
          />
        </aside>
      </div>

      {/* Recent reviews */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Your latest reviews</h2>
        {reviews.length === 0 ? (
          <p className="rounded-lg bg-surface p-4 text-sm text-zinc-400">
            You haven&apos;t written a review yet.
          </p>
        ) : (
          <ul className="grid gap-3">
            {reviews.map((r) => (
              <li
                key={r.review_id}
                className="rounded-lg bg-surface p-4 text-sm"
              >
                <div className="mb-1 flex items-center justify-between">
                  <a
                    href={`/movies/${r.movie_id}`}
                    className="font-medium hover:text-accent"
                  >
                    Movie #{r.movie_id}
                  </a>
                  <span className="text-amber-300 text-xs">
                    ★ {r.rating.toFixed(1)}
                  </span>
                </div>
                {r.review_text && (
                  <p className="text-zinc-300 line-clamp-3">{r.review_text}</p>
                )}
                <div className="mt-2 text-xs text-zinc-500">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-surface p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
