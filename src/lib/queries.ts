import { supabase } from './supabase';
import { MovieFilters, PAGE_SIZE } from './filters';
import type { Movie, Actor, Genre, Review } from './types';

export interface MovieListResult {
  movies: Movie[];
  total: number;
  totalPages: number;
}

/**
 * List all genres (small table, no pagination).
 */
export async function fetchAllGenres(): Promise<Genre[]> {
  const { data } = await supabase.from('genres').select('*').order('genre_name');
  return (data as Genre[]) ?? [];
}

/**
 * List distinct languages currently in use on movies.
 */
export async function fetchAllLanguages(): Promise<string[]> {
  const { data } = await supabase
    .from('movies')
    .select('language')
    .not('language', 'is', null);
  const set = new Set<string>();
  (data ?? []).forEach((r: { language: string | null }) => {
    if (r.language) set.add(r.language);
  });
  return Array.from(set).sort();
}

/**
 * Year range available in DB (min..max). Used to bound year sliders.
 */
export async function fetchYearRange(): Promise<{ min: number; max: number }> {
  const { data: minRow } = await supabase
    .from('movies')
    .select('release_year')
    .not('release_year', 'is', null)
    .order('release_year', { ascending: true })
    .limit(1)
    .maybeSingle();
  const { data: maxRow } = await supabase
    .from('movies')
    .select('release_year')
    .not('release_year', 'is', null)
    .order('release_year', { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    min: minRow?.release_year ?? 1990,
    max: maxRow?.release_year ?? 2024,
  };
}

/**
 * Main filtered+paginated movie list. Used by /movies page.
 *
 * Genre filter joins via movie_genres. We resolve to movie_ids in a separate
 * step rather than chaining .in() on a subquery, because Supabase JS client
 * cannot express raw subqueries cleanly.
 */
export async function fetchMovies(filters: MovieFilters): Promise<MovieListResult> {
  let allowedIds: number[] | null = null;

  if (filters.genres.length > 0) {
    const { data } = await supabase
      .from('movie_genres')
      .select('movie_id')
      .in('genre_id', filters.genres);
    allowedIds = Array.from(new Set((data ?? []).map((r: { movie_id: number }) => r.movie_id)));
    if (allowedIds.length === 0) {
      return { movies: [], total: 0, totalPages: 0 };
    }
  }

  let q = supabase.from('movies').select('*', { count: 'exact' }).eq('is_active', true);

  if (allowedIds) q = q.in('movie_id', allowedIds);
  if (filters.q) {
    // Full-text search via tsvector column. Quote-escape user input.
    const tsQuery = filters.q
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => `${t}:*`)
      .join(' & ');
    if (tsQuery) {
      q = q.textSearch('search', tsQuery, { type: 'plain', config: 'simple' });
    }
  }
  if (filters.languages.length) q = q.in('language', filters.languages);
  if (filters.yearFrom != null) q = q.gte('release_year', filters.yearFrom);
  if (filters.yearTo != null) q = q.lte('release_year', filters.yearTo);
  if (filters.minRating != null) q = q.gte('rating_imdb', filters.minRating);
  if (filters.director) q = q.ilike('director', `%${filters.director}%`);

  switch (filters.sort) {
    case 'rating':
      q = q.order('rating_imdb', { ascending: false, nullsFirst: false });
      break;
    case 'year':
      q = q.order('release_year', { ascending: false, nullsFirst: false });
      break;
    case 'title':
      q = q.order('title', { ascending: true });
      break;
    case 'latest':
    default:
      q = q.order('created_at', { ascending: false });
  }

  const from = (filters.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  q = q.range(from, to);

  const { data, count, error } = await q;
  if (error) {
    console.error('fetchMovies error:', error.message);
    return { movies: [], total: 0, totalPages: 0 };
  }
  const total = count ?? 0;
  return {
    movies: (data as Movie[]) ?? [],
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/**
 * Single movie + its genres + cast (with actor name) + reviews summary.
 */
export interface MovieDetail {
  movie: Movie;
  genres: Genre[];
  cast: Array<{ actor: Actor; character_name: string | null; role_order: number }>;
  reviews: Review[];
  averageRating: number | null;
  reviewCount: number;
}

export async function fetchMovieDetail(movieId: number): Promise<MovieDetail | null> {
  const { data: movieRow } = await supabase
    .from('movies')
    .select('*')
    .eq('movie_id', movieId)
    .maybeSingle();
  if (!movieRow) return null;

  const [genresRes, castRes, reviewsRes, avgRes] = await Promise.all([
    supabase
      .from('movie_genres')
      .select('genres(*)')
      .eq('movie_id', movieId),
    supabase
      .from('movie_actors')
      .select('character_name, role_order, actors(*)')
      .eq('movie_id', movieId)
      .order('role_order', { ascending: true }),
    supabase
      .from('reviews')
      .select('*')
      .eq('movie_id', movieId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('reviews')
      .select('rating', { count: 'exact' })
      .eq('movie_id', movieId)
      .eq('is_approved', true),
  ]);

  // Supabase typegen treats nested selects as arrays. At runtime, FK-by-FK joins
  // return a single related row; cast through unknown to model that.
  const genres = ((genresRes.data ?? []) as unknown as Array<{ genres: Genre | null }>)
    .map((r) => r.genres)
    .filter((g): g is Genre => Boolean(g));

  const cast = ((castRes.data ?? []) as unknown as Array<{
    character_name: string | null;
    role_order: number;
    actors: Actor | null;
  }>)
    .filter((r) => r.actors)
    .map((r) => ({
      actor: r.actors as Actor,
      character_name: r.character_name,
      role_order: r.role_order,
    }));

  const reviews = (reviewsRes.data as Review[]) ?? [];
  const allRatings = (avgRes.data ?? []) as { rating: number }[];
  const averageRating =
    allRatings.length > 0
      ? Number((allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length).toFixed(1))
      : null;

  return {
    movie: movieRow as Movie,
    genres,
    cast,
    reviews,
    averageRating,
    reviewCount: avgRes.count ?? 0,
  };
}

/**
 * Three "related movies" lists for the detail page.
 */
export async function fetchRelated(movie: Movie): Promise<{
  byDirector: Movie[];
  byGenre: Movie[];
  similar: Movie[];
  primaryGenreName: string | null;
}> {
  const [directorRes, primaryGenreRes] = await Promise.all([
    movie.director
      ? supabase
          .from('movies')
          .select('*')
          .eq('director', movie.director)
          .neq('movie_id', movie.movie_id)
          .eq('is_active', true)
          .order('release_year', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] as Movie[] }),
    supabase
      .from('movie_genres')
      .select('genre_id, genres(genre_name)')
      .eq('movie_id', movie.movie_id)
      .limit(1)
      .maybeSingle(),
  ]);

  const byDirector = (directorRes.data as Movie[]) ?? [];

  let byGenre: Movie[] = [];
  let primaryGenreName: string | null = null;
  const primaryGenreData = primaryGenreRes.data as unknown as
    | { genre_id: number; genres: { genre_name: string } | null }
    | null;
  const primaryGenreId = primaryGenreData?.genre_id ?? null;
  primaryGenreName = primaryGenreData?.genres?.genre_name ?? null;

  if (primaryGenreId) {
    const { data: ids } = await supabase
      .from('movie_genres')
      .select('movie_id')
      .eq('genre_id', primaryGenreId);
    const movieIds = Array.from(
      new Set((ids ?? []).map((r: { movie_id: number }) => r.movie_id))
    ).filter((id) => id !== movie.movie_id);
    if (movieIds.length) {
      const { data: gMovies } = await supabase
        .from('movies')
        .select('*')
        .in('movie_id', movieIds)
        .eq('is_active', true)
        .order('rating_imdb', { ascending: false, nullsFirst: false })
        .limit(6);
      byGenre = (gMovies as Movie[]) ?? [];
    }
  }

  // "Similar" = same primary genre, rating within ±1.0, exclude already-shown ids
  const exclude = new Set<number>([
    movie.movie_id,
    ...byDirector.map((m) => m.movie_id),
    ...byGenre.map((m) => m.movie_id),
  ]);
  let similar: Movie[] = [];
  if (movie.rating_imdb && primaryGenreId) {
    const { data: ids } = await supabase
      .from('movie_genres')
      .select('movie_id')
      .eq('genre_id', primaryGenreId);
    const candidateIds = Array.from(
      new Set((ids ?? []).map((r: { movie_id: number }) => r.movie_id))
    ).filter((id) => !exclude.has(id));
    if (candidateIds.length) {
      const { data: sMovies } = await supabase
        .from('movies')
        .select('*')
        .in('movie_id', candidateIds)
        .gte('rating_imdb', movie.rating_imdb - 1)
        .lte('rating_imdb', movie.rating_imdb + 1)
        .eq('is_active', true)
        .order('rating_imdb', { ascending: false, nullsFirst: false })
        .limit(6);
      similar = (sMovies as Movie[]) ?? [];
    }
  }

  return { byDirector, byGenre, similar, primaryGenreName };
}

/**
 * Actor detail + filmography (paginated, with year/genre filter).
 */
export interface ActorPageResult {
  actor: Actor;
  movies: Movie[];
  total: number;
  totalPages: number;
}

export async function fetchActorWithMovies(
  actorId: number,
  opts: { yearFrom?: number; yearTo?: number; genreId?: number; page: number }
): Promise<ActorPageResult | null> {
  const { data: actor } = await supabase
    .from('actors')
    .select('*')
    .eq('actor_id', actorId)
    .maybeSingle();
  if (!actor) return null;

  // Get movie ids for this actor
  const { data: maRows } = await supabase
    .from('movie_actors')
    .select('movie_id')
    .eq('actor_id', actorId);
  let movieIds = Array.from(
    new Set((maRows ?? []).map((r: { movie_id: number }) => r.movie_id))
  );
  if (movieIds.length === 0) {
    return { actor: actor as Actor, movies: [], total: 0, totalPages: 0 };
  }

  if (opts.genreId) {
    const { data: g } = await supabase
      .from('movie_genres')
      .select('movie_id')
      .eq('genre_id', opts.genreId)
      .in('movie_id', movieIds);
    movieIds = Array.from(new Set((g ?? []).map((r: { movie_id: number }) => r.movie_id)));
    if (movieIds.length === 0) {
      return { actor: actor as Actor, movies: [], total: 0, totalPages: 0 };
    }
  }

  let q = supabase
    .from('movies')
    .select('*', { count: 'exact' })
    .in('movie_id', movieIds)
    .eq('is_active', true)
    .order('release_year', { ascending: false, nullsFirst: false });

  if (opts.yearFrom != null) q = q.gte('release_year', opts.yearFrom);
  if (opts.yearTo != null) q = q.lte('release_year', opts.yearTo);

  const from = (opts.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  q = q.range(from, to);

  const { data, count } = await q;
  const total = count ?? 0;
  return {
    actor: actor as Actor,
    movies: (data as Movie[]) ?? [],
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
