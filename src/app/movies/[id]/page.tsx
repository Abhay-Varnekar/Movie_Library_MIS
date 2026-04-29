import Image from 'next/image';
import { notFound } from 'next/navigation';
import { fetchMovieDetail, fetchRelated } from '@/lib/queries';
import { ActorChip } from '@/components/ActorChip';
import { ReviewCard } from '@/components/ReviewCard';
import { ReviewForm } from '@/components/ReviewForm';
import { Carousel } from '@/components/Carousel';
import { WatchlistButton } from '@/components/WatchlistButton';
import { supabase } from '@/lib/supabase';
import { createServerClient } from '@/lib/supabase-server';
import type { Review } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) return { title: 'Movie' };
  const detail = await fetchMovieDetail(id);
  if (!detail) return { title: 'Movie not found' };
  return {
    title: `${detail.movie.title} — Movie Library`,
    description: detail.movie.description?.slice(0, 160) ?? '',
  };
}

export default async function MovieDetailPage({ params }: Props) {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) notFound();

  const detail = await fetchMovieDetail(id);
  if (!detail) notFound();

  const { movie, genres, cast, reviews, averageRating, reviewCount } = detail;
  const related = await fetchRelated(movie);

  // Identify whether the current viewer has a review on this movie. We pull
  // it via the cookie-aware client so RLS-friendly queries work correctly.
  const authedSupabase = createServerClient();
  const {
    data: { user },
  } = await authedSupabase.auth.getUser();
  let myReview: Review | null = null;
  if (user) {
    const { data } = await authedSupabase
      .from('reviews')
      .select('*')
      .eq('movie_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    myReview = (data as Review | null) ?? null;
  }

  // Enrich review list with usernames.
  const otherReviews = user ? reviews.filter((r) => r.user_id !== user.id) : reviews;
  const userIds = Array.from(new Set(otherReviews.map((r) => r.user_id)));
  const userMap: Record<string, { username: string; profile_image_url: string | null }> = {};
  if (userIds.length) {
    const { data } = await supabase
      .from('users')
      .select('user_id, username, profile_image_url')
      .in('user_id', userIds);
    (data ?? []).forEach(
      (u: { user_id: string; username: string; profile_image_url: string | null }) => {
        userMap[u.user_id] = {
          username: u.username,
          profile_image_url: u.profile_image_url,
        };
      }
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 pb-16">
      {/* Banner */}
      <div className="relative -mx-6 h-64 overflow-hidden bg-zinc-900 sm:h-80">
        {movie.banner_url && (
          <Image
            src={movie.banner_url}
            alt={movie.title}
            fill
            sizes="100vw"
            className="object-cover opacity-50"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
      </div>

      {/* Header */}
      <div className="-mt-24 flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="relative h-64 w-44 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-800 shadow-xl">
          {movie.poster_url && (
            <Image
              src={movie.poster_url}
              alt={movie.title}
              fill
              sizes="176px"
              className="object-cover"
              priority
            />
          )}
        </div>
        <div className="pb-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{movie.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
            {movie.release_year && <span>{movie.release_year}</span>}
            {movie.runtime && <span>{movie.runtime} min</span>}
            {movie.language && <span>{movie.language}</span>}
            {movie.country && <span>{movie.country}</span>}
          </div>
          {genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {genres.map((g) => (
                <span
                  key={g.genre_id}
                  className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-300"
                >
                  {g.genre_name}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-amber-300">★ IMDb {movie.rating_imdb?.toFixed(1) ?? '—'}</span>
            {averageRating != null && (
              <span className="text-zinc-300">
                Users: ★ {averageRating.toFixed(1)}{' '}
                <span className="text-xs text-zinc-500">({reviewCount})</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description + side panel */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <div>
          {movie.description && (
            <p className="text-base leading-relaxed text-zinc-200">{movie.description}</p>
          )}
          {movie.director && (
            <p className="mt-4 text-sm text-zinc-400">
              <span className="text-zinc-500">Director:</span>{' '}
              <span className="text-zinc-200">{movie.director}</span>
            </p>
          )}
        </div>

        <aside className="rounded-lg bg-surface p-4 text-sm">
          <h3 className="mb-3 font-semibold">Watchlist</h3>
          <WatchlistButton movieId={movie.movie_id} />
        </aside>
      </div>

      {/* Cast */}
      {cast.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Cast</h2>
          <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3">
            {cast.map(({ actor, character_name }) => (
              <ActorChip key={actor.actor_id} actor={actor} characterName={character_name} />
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Reviews</h2>

        {user && (
          <div className="mb-6">
            <ReviewForm movieId={movie.movie_id} existingReview={myReview} />
          </div>
        )}

        {!user && (
          <p className="mb-4 rounded-lg bg-surface p-4 text-sm text-zinc-400">
            Sign in to leave a review.
          </p>
        )}

        {myReview && (
          <div className="mb-6">
            <h3 className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
              Your review
            </h3>
            <ReviewCard review={myReview} username="You" />
          </div>
        )}

        {otherReviews.length === 0 ? (
          !myReview && (
            <p className="rounded-lg bg-surface p-4 text-sm text-zinc-400">
              No reviews yet — be the first.
            </p>
          )
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {otherReviews.slice(0, 6).map((r) => {
              const u = userMap[r.user_id];
              return (
                <ReviewCard
                  key={r.review_id}
                  review={r}
                  username={u?.username}
                  profileImage={u?.profile_image_url ?? undefined}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Related carousels */}
      {movie.director && (
        <Carousel title={`More from ${movie.director}`} movies={related.byDirector} />
      )}
      {related.primaryGenreName && (
        <Carousel title={`More ${related.primaryGenreName} movies`} movies={related.byGenre} />
      )}
      <Carousel title="You might also like" movies={related.similar} />
    </main>
  );
}
