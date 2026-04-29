import Image from 'next/image';
import Link from 'next/link';
import type { Movie } from '@/lib/types';

export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link
      href={`/movies/${movie.movie_id}`}
      className="group block overflow-hidden rounded-lg bg-surface shadow-sm transition hover:ring-1 hover:ring-accent/40"
    >
      <div className="relative aspect-[2/3] w-full bg-zinc-800">
        {movie.poster_url && (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-medium" title={movie.title}>
          {movie.title}
        </h3>
        <div className="mt-1 flex items-center justify-between text-xs text-zinc-400">
          <span>{movie.release_year ?? '—'}</span>
          <span className="text-amber-300">
            ★ {movie.rating_imdb?.toFixed(1) ?? '—'}
          </span>
        </div>
        {movie.language && (
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
            {movie.language}
          </div>
        )}
      </div>
    </Link>
  );
}
