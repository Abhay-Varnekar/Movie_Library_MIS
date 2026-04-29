import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchActorWithMovies, fetchAllGenres } from '@/lib/queries';
import { MovieGrid } from '@/components/MovieGrid';

export const dynamic = 'force-dynamic';

interface Props {
  params: { actorId: string };
  searchParams: Record<string, string | string[] | undefined>;
}

function intParam(sp: Props['searchParams'], key: string): number | undefined {
  const v = sp[key];
  if (typeof v !== 'string' || v === '') return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

export async function generateMetadata({ params }: Props) {
  const id = parseInt(params.actorId, 10);
  if (!Number.isFinite(id)) return { title: 'Actor' };
  const result = await fetchActorWithMovies(id, { page: 1 });
  if (!result) return { title: 'Actor not found' };
  return { title: `${result.actor.actor_name} — Movie Library` };
}

export default async function ActorPage({ params, searchParams }: Props) {
  const id = parseInt(params.actorId, 10);
  if (!Number.isFinite(id)) notFound();

  const yearFrom = intParam(searchParams, 'year_from');
  const yearTo = intParam(searchParams, 'year_to');
  const genreId = intParam(searchParams, 'genre');
  const page = intParam(searchParams, 'page') ?? 1;

  const [result, genres] = await Promise.all([
    fetchActorWithMovies(id, { yearFrom, yearTo, genreId, page }),
    fetchAllGenres(),
  ]);
  if (!result) notFound();

  const { actor, movies, total, totalPages } = result;
  const birthYear = actor.birth_date ? new Date(actor.birth_date).getFullYear() : null;

  // Build pagination links preserving filter params
  function pageHref(p: number) {
    const sp = new URLSearchParams();
    if (yearFrom != null) sp.set('year_from', String(yearFrom));
    if (yearTo != null) sp.set('year_to', String(yearTo));
    if (genreId != null) sp.set('genre', String(genreId));
    if (p > 1) sp.set('page', String(p));
    const qs = sp.toString();
    return `/movies/actor/${id}${qs ? '?' + qs : ''}`;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <section className="flex flex-col gap-6 rounded-lg bg-surface p-6 sm:flex-row">
        <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-full bg-zinc-800 sm:h-40 sm:w-40">
          {actor.profile_image_url && (
            <Image
              src={actor.profile_image_url}
              alt={actor.actor_name}
              fill
              sizes="160px"
              className="object-cover"
            />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{actor.actor_name}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
            {birthYear && <span>Born {birthYear}</span>}
            {actor.country && <span>{actor.country}</span>}
            <span>{total} movies</span>
          </div>
          {actor.biography && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
              {actor.biography}
            </p>
          )}
        </div>
      </section>

      {/* Filter bar */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Filmography</h2>
        <form
          action={`/movies/actor/${id}`}
          method="get"
          className="mb-5 flex flex-wrap items-end gap-3 text-sm"
        >
          <div>
            <label className="block text-xs uppercase tracking-wide text-zinc-400">
              Genre
            </label>
            <select
              name="genre"
              defaultValue={genreId ?? ''}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
            >
              <option value="">All</option>
              {genres.map((g) => (
                <option key={g.genre_id} value={g.genre_id}>
                  {g.genre_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-zinc-400">
              Year from
            </label>
            <input
              name="year_from"
              type="number"
              defaultValue={yearFrom ?? ''}
              className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-zinc-400">
              Year to
            </label>
            <input
              name="year_to"
              type="number"
              defaultValue={yearTo ?? ''}
              className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-accent px-4 py-1.5 text-white hover:opacity-90"
          >
            Apply
          </button>
          <Link
            href={`/movies/actor/${id}`}
            className="text-xs text-zinc-400 hover:text-accent"
          >
            Reset
          </Link>
        </form>

        <MovieGrid movies={movies} />

        {totalPages > 1 && (
          <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="rounded border border-zinc-800 px-3 py-1 hover:border-accent"
              >
                ‹ Prev
              </Link>
            )}
            <span className="text-zinc-400">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="rounded border border-zinc-800 px-3 py-1 hover:border-accent"
              >
                Next ›
              </Link>
            )}
          </nav>
        )}
      </section>
    </main>
  );
}
