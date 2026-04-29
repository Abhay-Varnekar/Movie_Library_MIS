import { MovieCard } from './MovieCard';
import type { Movie } from '@/lib/types';

interface Props {
  title: string;
  movies: Movie[];
}

export function Carousel({ title, movies }: Props) {
  if (movies.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-zinc-200">{title}</h2>
      <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3">
        {movies.map((m) => (
          <div key={m.movie_id} className="w-40 flex-shrink-0 snap-start sm:w-48">
            <MovieCard movie={m} />
          </div>
        ))}
      </div>
    </section>
  );
}
