import Link from 'next/link';
import { createServerClient, getCurrentUser } from '@/lib/supabase-server';
import { AdminUserRow } from '@/components/admin/AdminUserRow';
import type { AppUser } from '@/lib/types';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const q = searchParams.q?.trim() ?? '';

  const supabase = createServerClient();
  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (q) {
    query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, count } = await query.range(from, to);
  const users = (data as AppUser[] | null) ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const me = await getCurrentUser();

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Users ({total})</h2>
        <form className="flex items-center gap-2" action="/admin/users">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search email or username…"
            className="rounded border border-zinc-700 bg-bg px-2 py-1 text-sm"
          />
          <button className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-accent">
            Search
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Full name</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Admin</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <AdminUserRow
                key={u.user_id}
                user={u}
                isCurrentUser={me?.user_id === u.user_id}
              />
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-sm text-zinc-500"
                >
                  No users match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
      href={`/admin/users${params.toString() ? `?${params.toString()}` : ''}`}
      className="rounded border border-zinc-700 px-2 py-1 hover:border-accent"
    >
      {children}
    </Link>
  );
}
