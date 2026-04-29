import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export interface GraphNode {
  id: string;
  type: 'movie' | 'actor' | 'genre';
  label: string;
  val: number;
  rating?: number | null;
  year?: number | null;
  poster?: string | null;
  movieId?: number;
  actorId?: number;
  genreId?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: 'movie-genre' | 'movie-actor';
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    movies: number;
    actors: number;
    genres: number;
    edges: number;
  };
}

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const ACTORS_PER_MOVIE = 5;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limitRaw = parseInt(url.searchParams.get('limit') ?? '', 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(MAX_LIMIT, Math.max(5, limitRaw))
    : DEFAULT_LIMIT;
  const focusMovieIdRaw = parseInt(url.searchParams.get('movie') ?? '', 10);
  const focusMovieId = Number.isFinite(focusMovieIdRaw) ? focusMovieIdRaw : null;

  let movieRows: Array<{
    movie_id: number;
    title: string;
    rating_imdb: number | null;
    release_year: number | null;
    poster_url: string | null;
  }> = [];

  if (focusMovieId) {
    const { data } = await supabase
      .from('movies')
      .select('movie_id, title, rating_imdb, release_year, poster_url')
      .eq('movie_id', focusMovieId)
      .eq('is_active', true);
    movieRows = data ?? [];
  } else {
    const { data } = await supabase
      .from('movies')
      .select('movie_id, title, rating_imdb, release_year, poster_url')
      .eq('is_active', true)
      .order('rating_imdb', { ascending: false, nullsFirst: false })
      .limit(limit);
    movieRows = data ?? [];
  }

  if (movieRows.length === 0) {
    return NextResponse.json({
      nodes: [],
      edges: [],
      stats: { movies: 0, actors: 0, genres: 0, edges: 0 },
    } satisfies GraphPayload);
  }

  const movieIds = movieRows.map((m) => m.movie_id);

  const [genreLinksRes, actorLinksRes] = await Promise.all([
    supabase.from('movie_genres').select('movie_id, genre_id').in('movie_id', movieIds),
    supabase
      .from('movie_actors')
      .select('movie_id, actor_id, role_order')
      .in('movie_id', movieIds)
      .order('role_order', { ascending: true }),
  ]);

  const genreLinks = (genreLinksRes.data ?? []) as Array<{
    movie_id: number;
    genre_id: number;
  }>;
  const actorLinksRaw = (actorLinksRes.data ?? []) as Array<{
    movie_id: number;
    actor_id: number;
    role_order: number;
  }>;

  // Cap actors per movie to avoid hairball graph.
  const perMovie = new Map<number, number>();
  const actorLinks: typeof actorLinksRaw = [];
  for (const link of actorLinksRaw) {
    const seen = perMovie.get(link.movie_id) ?? 0;
    if (seen >= ACTORS_PER_MOVIE) continue;
    perMovie.set(link.movie_id, seen + 1);
    actorLinks.push(link);
  }

  const genreIds = Array.from(new Set(genreLinks.map((l) => l.genre_id)));
  const actorIds = Array.from(new Set(actorLinks.map((l) => l.actor_id)));

  const [genreRowsRes, actorRowsRes] = await Promise.all([
    genreIds.length
      ? supabase.from('genres').select('genre_id, genre_name').in('genre_id', genreIds)
      : Promise.resolve({ data: [] as Array<{ genre_id: number; genre_name: string }> }),
    actorIds.length
      ? supabase.from('actors').select('actor_id, actor_name').in('actor_id', actorIds)
      : Promise.resolve({ data: [] as Array<{ actor_id: number; actor_name: string }> }),
  ]);

  const genreRows = (genreRowsRes.data ?? []) as Array<{
    genre_id: number;
    genre_name: string;
  }>;
  const actorRows = (actorRowsRes.data ?? []) as Array<{
    actor_id: number;
    actor_name: string;
  }>;

  // Compute node degrees for sizing.
  const degrees = new Map<string, number>();
  function bump(id: string) {
    degrees.set(id, (degrees.get(id) ?? 0) + 1);
  }

  const edges: GraphEdge[] = [];
  for (const link of genreLinks) {
    const s = `m:${link.movie_id}`;
    const t = `g:${link.genre_id}`;
    edges.push({ source: s, target: t, kind: 'movie-genre' });
    bump(s);
    bump(t);
  }
  for (const link of actorLinks) {
    const s = `m:${link.movie_id}`;
    const t = `a:${link.actor_id}`;
    edges.push({ source: s, target: t, kind: 'movie-actor' });
    bump(s);
    bump(t);
  }

  const nodes: GraphNode[] = [
    ...movieRows.map<GraphNode>((m) => {
      const id = `m:${m.movie_id}`;
      return {
        id,
        type: 'movie',
        label: m.title,
        val: 4 + (degrees.get(id) ?? 0),
        rating: m.rating_imdb,
        year: m.release_year,
        poster: m.poster_url,
        movieId: m.movie_id,
      };
    }),
    ...actorRows.map<GraphNode>((a) => {
      const id = `a:${a.actor_id}`;
      return {
        id,
        type: 'actor',
        label: a.actor_name,
        val: 2 + (degrees.get(id) ?? 0),
        actorId: a.actor_id,
      };
    }),
    ...genreRows.map<GraphNode>((g) => {
      const id = `g:${g.genre_id}`;
      return {
        id,
        type: 'genre',
        label: g.genre_name,
        val: 4 + (degrees.get(id) ?? 0) * 0.5,
        genreId: g.genre_id,
      };
    }),
  ];

  const payload: GraphPayload = {
    nodes,
    edges,
    stats: {
      movies: movieRows.length,
      actors: actorRows.length,
      genres: genreRows.length,
      edges: edges.length,
    },
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
