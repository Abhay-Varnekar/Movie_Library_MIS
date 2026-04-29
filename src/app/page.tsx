import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { MovieCard } from '@/components/MovieCard';
import type { Movie } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchSection(opts: {
  order: string;
  ascending: boolean;
  limit: number;
}): Promise<Movie[]> {
  const { data } = await supabase
    .from('movies')
    .select('*')
    .eq('is_active', true)
    .order(opts.order, { ascending: opts.ascending, nullsFirst: false })
    .limit(opts.limit);
  return (data as Movie[]) ?? [];
}

async function fetchRandomPick(): Promise<Movie | null> {
  const { count } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  const total = count ?? 0;
  if (!total) return null;
  const offset = Math.floor(Math.random() * total);
  const { data } = await supabase
    .from('movies')
    .select('*')
    .eq('is_active', true)
    .range(offset, offset);
  return ((data as Movie[]) ?? [])[0] ?? null;
}

export default async function HomePage() {
  const [hero, popular, recent] = await Promise.all([
    fetchRandomPick(),
    fetchSection({ order: 'rating_imdb', ascending: false, limit: 6 }),
    fetchSection({ order: 'release_year', ascending: false, limit: 6 }),
  ]);

  if (!hero && popular.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-lg border border-zinc-800 bg-surface p-8 text-center text-sm">
          Database appears empty. Run <code className="text-accent">npm run db:seed</code> after
          applying <code className="text-accent">supabase/migrations/001_initial_schema.sql</code>.
        </div>
      </main>
    );
  }

  return (
    <main>
      {/* Hero */}
      {hero && (
        <section className="relative h-72 overflow-hidden sm:h-96">
          {hero.banner_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hero.banner_url}
              alt={hero.title}
              className="absolute inset-0 h-full w-full object-cover opacity-50"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-6 pb-8">
            <div className="text-xs uppercase tracking-widest text-accent">
              Featured
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-5xl">
              {hero.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-300 line-clamp-2 sm:text-base">
              {hero.description}
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href={`/movies/${hero.movie_id}`}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                View details
              </Link>
              <Link
                href="/movies"
                className="rounded border border-zinc-600 px-4 py-2 text-sm hover:border-white"
              >
                Browse all
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-6 py-10">
        <Section title="Popular movies" movies={popular} />
        <Section title="Recent releases" movies={recent} />

        <div className="mt-10 rounded-lg bg-surface p-5 text-sm text-zinc-300">
          Looking for something specific?{' '}
          <Link href="/movies" className="text-accent hover:underline">
            Open the explore page
          </Link>{' '}
          to filter by genre, year, language, rating, and director.
        </div>
      </div>
    </main>
  );
}

function Section({ title, movies }: { title: string; movies: Movie[] }) {
  if (movies.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-zinc-200">{title}</h2>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {movies.map((m) => (
          <MovieCard key={m.movie_id} movie={m} />
        ))}
      </div>
    </section>
  );
}
