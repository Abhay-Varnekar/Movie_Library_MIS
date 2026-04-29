import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { AdminReviewRow } from '@/components/admin/AdminReviewRow';
import type { Review } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  // Use the admin client so unapproved reviews are also visible (RLS would
  // hide them from a normal cookie session).
  const admin = createAdminClient();

  const [pendingRes, approvedRes] = await Promise.all([
    admin
      .from('reviews')
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false }),
    admin
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ]);

  const pending = (pendingRes.data as Review[] | null) ?? [];
  const approved = (approvedRes.data as Review[] | null) ?? [];
  const approvedTotal = approvedRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(approvedTotal / PAGE_SIZE));

  // Resolve movie titles + usernames in one batch (using the cookie client
  // is fine — `users` and `movies` are publicly readable).
  const cookieSb = createServerClient();
  const movieIds = Array.from(
    new Set([...pending, ...approved].map((r) => r.movie_id))
  );
  const userIds = Array.from(
    new Set([...pending, ...approved].map((r) => r.user_id))
  );
  const [moviesRes, usersRes] = await Promise.all([
    movieIds.length
      ? cookieSb.from('movies').select('movie_id, title').in('movie_id', movieIds)
      : Promise.resolve({ data: [] as Array<{ movie_id: number; title: string }> }),
    userIds.length
      ? cookieSb.from('users').select('user_id, username').in('user_id', userIds)
      : Promise.resolve({ data: [] as Array<{ user_id: string; username: string }> }),
  ]);
  const movieMap: Record<number, string> = {};
  (moviesRes.data ?? []).forEach((m: { movie_id: number; title: string }) => {
    movieMap[m.movie_id] = m.title;
  });
  const userMap: Record<string, string> = {};
  (usersRes.data ?? []).forEach((u: { user_id: string; username: string }) => {
    userMap[u.user_id] = u.username;
  });

  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Pending review queue ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-lg border border-zinc-800 bg-surface p-4 text-sm text-zinc-400">
            Nothing waiting for moderation.
          </p>
        ) : (
          <ul className="grid gap-3">
            {pending.map((r) => (
              <AdminReviewRow
                key={r.review_id}
                review={r}
                movieTitle={movieMap[r.movie_id]}
                username={userMap[r.user_id]}
              />
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Approved reviews ({approvedTotal})
        </h2>
        <ul className="grid gap-3">
          {approved.map((r) => (
            <AdminReviewRow
              key={r.review_id}
              review={r}
              movieTitle={movieMap[r.movie_id]}
              username={userMap[r.user_id]}
            />
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Page {page} of {totalPages}
          </span>
        </div>
      </div>
    </section>
  );
}
