import Link from 'next/link';
import { createServerClient } from '@/lib/supabase-server';
import { AdminMovieRow } from '@/components/admin/AdminMovieRow';
import { AdminMovieCreate } from '@/components/admin/AdminMovieCreate';
import type { Movie } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function AdminMoviesPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const q = searchParams.q?.trim() ?? '';

  const supabase = createServerClient();
  let query = supabase
    .from('movies')
    .select('*', { count: 'exact' })
    .order('movie_id', { ascending: false });

  if (q) query = query.ilike('title', `%${q}%`);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, count } = await query.range(from, to);
  const movies = (data as Movie[] | null) ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Movies ({total})</h2>
        <form className="flex items-center gap-2" action="/admin/movies">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search title…"
            className="rounded border border-zinc-700 bg-bg px-2 py-1 text-sm"
          />
          <button className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-accent">
            Search
          </button>
        </form>
      </div>

      <AdminMovieCreate />

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Director</th>
              <th className="px-3 py-2">Year</th>
              <th className="px-3 py-2">Lang</th>
              <th className="px-3 py-2">Rating</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {movies.map((m) => (
              <AdminMovieRow key={m.movie_id} movie={m} />
            ))}
            {movies.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-sm text-zinc-500"
                >
                  No movies match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <PageLink page={page - 1} q={q} disabled={page === 1}>
            ← Prev
          </PageLink>
          <PageLink page={page + 1} q={q} disabled={page >= totalPages}>
            Next →
          </PageLink>
        </div>
      </div>
    </section>
  );
}

function PageLink({
  page,
  q,
  disabled,
  children,
}: {
  page: number;
  q: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded border border-zinc-800 px-2 py-1 text-zinc-600">
        {children}
      </span>
    );
  }
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (q) params.set('q', q);
  return (
    <Link
      href={`/admin/movies${params.toString() ? `?${params.toString()}` : ''}`}
      className="rounded border border-zinc-700 px-2 py-1 hover:border-accent"
    >
      {children}
    </Link>
  );
}
