-- Movie Library MIS — Phase 1 schema
-- Apply via Supabase dashboard → SQL Editor → paste this whole file → Run.
-- Idempotent where practical (uses IF NOT EXISTS).

-- =============================================
-- USERS  (linked 1:1 to auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  profile_image_url TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ,
  CONSTRAINT email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- =============================================
-- GENRES
-- =============================================
CREATE TABLE IF NOT EXISTS public.genres (
  genre_id SERIAL PRIMARY KEY,
  genre_name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_genre_name ON public.genres(genre_name);

-- =============================================
-- ACTORS
-- =============================================
CREATE TABLE IF NOT EXISTS public.actors (
  actor_id SERIAL PRIMARY KEY,
  actor_name VARCHAR(100) UNIQUE NOT NULL,
  biography TEXT,
  profile_image_url TEXT,
  birth_date DATE,
  country VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_actor_name ON public.actors(actor_name);
CREATE INDEX IF NOT EXISTS idx_actor_country ON public.actors(country);

-- =============================================
-- MOVIES  (with generated tsvector for full-text search)
-- =============================================
CREATE TABLE IF NOT EXISTS public.movies (
  movie_id SERIAL PRIMARY KEY,
  title VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  director VARCHAR(100),
  release_year INTEGER,
  release_date DATE,
  runtime INTEGER,
  language VARCHAR(50),
  country VARCHAR(100),
  rating_imdb NUMERIC(3,1),
  poster_url TEXT,
  banner_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  search tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(director, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) STORED
);
CREATE INDEX IF NOT EXISTS idx_movie_title ON public.movies(title);
CREATE INDEX IF NOT EXISTS idx_movie_year ON public.movies(release_year);
CREATE INDEX IF NOT EXISTS idx_movie_director ON public.movies(director);
CREATE INDEX IF NOT EXISTS idx_movie_language ON public.movies(language);
CREATE INDEX IF NOT EXISTS idx_movie_rating ON public.movies(rating_imdb DESC);
CREATE INDEX IF NOT EXISTS idx_movie_search ON public.movies USING GIN (search);

-- =============================================
-- MOVIE-GENRE
-- =============================================
CREATE TABLE IF NOT EXISTS public.movie_genres (
  movie_id INTEGER REFERENCES public.movies(movie_id) ON DELETE CASCADE,
  genre_id INTEGER REFERENCES public.genres(genre_id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, genre_id)
);
CREATE INDEX IF NOT EXISTS idx_movie_genres_genre ON public.movie_genres(genre_id);

-- =============================================
-- MOVIE-ACTOR
-- =============================================
CREATE TABLE IF NOT EXISTS public.movie_actors (
  movie_id INTEGER REFERENCES public.movies(movie_id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES public.actors(actor_id) ON DELETE CASCADE,
  character_name VARCHAR(100),
  role_order INTEGER DEFAULT 0,
  PRIMARY KEY (movie_id, actor_id)
);
CREATE INDEX IF NOT EXISTS idx_movie_actors_actor ON public.movie_actors(actor_id);
CREATE INDEX IF NOT EXISTS idx_movie_actors_movie ON public.movie_actors(movie_id);

-- =============================================
-- REVIEWS
-- =============================================
CREATE TABLE IF NOT EXISTS public.reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id INTEGER NOT NULL REFERENCES public.movies(movie_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 10),
  review_text TEXT,
  likes_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT TRUE,
  is_spoiler BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(movie_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_movie ON public.reviews(movie_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON public.reviews(created_at DESC);

-- =============================================
-- WATCHLIST
-- =============================================
CREATE TABLE IF NOT EXISTS public.watchlist (
  watchlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  movie_id INTEGER NOT NULL REFERENCES public.movies(movie_id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'plan_to_watch'
    CHECK (status IN ('plan_to_watch', 'watching', 'completed')),
  date_added TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, movie_id)
);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_movie ON public.watchlist(movie_id);

-- =============================================
-- AUTH TRIGGER: auto-create public.users row when auth.users row created
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  base_username := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  IF base_username = '' OR base_username IS NULL THEN
    base_username := 'user';
  END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.users (user_id, username, email, full_name)
  VALUES (
    NEW.id,
    final_username,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_genres  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_actors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist     ENABLE ROW LEVEL SECURITY;

-- Public read on catalog tables
DROP POLICY IF EXISTS "genres readable by all"        ON public.genres;
DROP POLICY IF EXISTS "actors readable by all"        ON public.actors;
DROP POLICY IF EXISTS "movies readable by all"        ON public.movies;
DROP POLICY IF EXISTS "movie_genres readable by all"  ON public.movie_genres;
DROP POLICY IF EXISTS "movie_actors readable by all"  ON public.movie_actors;

CREATE POLICY "genres readable by all"        ON public.genres        FOR SELECT USING (true);
CREATE POLICY "actors readable by all"        ON public.actors        FOR SELECT USING (true);
CREATE POLICY "movies readable by all"        ON public.movies        FOR SELECT USING (true);
CREATE POLICY "movie_genres readable by all"  ON public.movie_genres  FOR SELECT USING (true);
CREATE POLICY "movie_actors readable by all"  ON public.movie_actors  FOR SELECT USING (true);

-- Users: public profiles, own-row update
DROP POLICY IF EXISTS "users readable by all"       ON public.users;
DROP POLICY IF EXISTS "users update own row"        ON public.users;

CREATE POLICY "users readable by all" ON public.users FOR SELECT USING (true);
CREATE POLICY "users update own row"  ON public.users FOR UPDATE USING (auth.uid() = user_id);

-- Reviews: public read approved, owner CRUD
DROP POLICY IF EXISTS "reviews approved readable"   ON public.reviews;
DROP POLICY IF EXISTS "reviews owner insert"        ON public.reviews;
DROP POLICY IF EXISTS "reviews owner update"        ON public.reviews;
DROP POLICY IF EXISTS "reviews owner delete"        ON public.reviews;

CREATE POLICY "reviews approved readable" ON public.reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "reviews owner insert"      ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews owner update"      ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reviews owner delete"      ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- Watchlist: owner-only CRUD
DROP POLICY IF EXISTS "watchlist owner select" ON public.watchlist;
DROP POLICY IF EXISTS "watchlist owner insert" ON public.watchlist;
DROP POLICY IF EXISTS "watchlist owner update" ON public.watchlist;
DROP POLICY IF EXISTS "watchlist owner delete" ON public.watchlist;

CREATE POLICY "watchlist owner select" ON public.watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "watchlist owner insert" ON public.watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlist owner update" ON public.watchlist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "watchlist owner delete" ON public.watchlist FOR DELETE USING (auth.uid() = user_id);
