import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { WatchlistView, type WatchlistRow } from '@/components/WatchlistView';
import type { Movie, WatchlistItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My Watchlist — Movie Library',
};

export default async function WatchlistPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirectTo=/watchlist');

  const { data } = await supabase
    .from('watchlist')
    .select('*, movies(*)')
    .eq('user_id', user.id)
    .order('date_added', { ascending: false });

  const rows: WatchlistRow[] = (
    (data ?? []) as unknown as Array<WatchlistItem & { movies: Movie | null }>
  ).map((r) => ({
    watchlist_id: r.watchlist_id,
    user_id: r.user_id,
    movie_id: r.movie_id,
    status: r.status,
    date_added: r.date_added,
    movie: r.movies,
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">My Watchlist</h1>
      <WatchlistView initialRows={rows} />
    </main>
  );
}
