import { MovieCard } from './MovieCard';
import type { Movie } from '@/lib/types';

export function MovieGrid({ movies }: { movies: Movie[] }) {
  if (movies.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-surface p-12 text-center text-sm text-zinc-400">
        No movies match your filters. Try clearing some.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {movies.map((m) => (
        <MovieCard key={m.movie_id} movie={m} />
      ))}
    </div>
  );
}
