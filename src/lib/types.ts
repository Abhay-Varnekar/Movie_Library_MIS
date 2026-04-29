export interface Movie {
  movie_id: number;
  title: string;
  description: string | null;
  director: string | null;
  release_year: number | null;
  release_date: string | null;
  runtime: number | null;
  language: string | null;
  country: string | null;
  rating_imdb: number | null;
  poster_url: string | null;
  banner_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Actor {
  actor_id: number;
  actor_name: string;
  biography: string | null;
  profile_image_url: string | null;
  birth_date: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface Genre {
  genre_id: number;
  genre_name: string;
  description: string | null;
  created_at: string;
}

export interface MovieActor {
  movie_id: number;
  actor_id: number;
  character_name: string | null;
  role_order: number;
}

export interface MovieGenre {
  movie_id: number;
  genre_id: number;
}

export interface AppUser {
  user_id: string;
  username: string;
  email: string;
  full_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface Review {
  review_id: string;
  movie_id: number;
  user_id: string;
  rating: number;
  review_text: string | null;
  likes_count: number;
  is_approved: boolean;
  is_spoiler: boolean;
  created_at: string;
  updated_at: string;
}

export type WatchlistStatus = 'plan_to_watch' | 'watching' | 'completed';

export interface WatchlistItem {
  watchlist_id: string;
  user_id: string;
  movie_id: number;
  status: WatchlistStatus;
  date_added: string;
}
