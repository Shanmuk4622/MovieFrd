
export interface Movie {
  id: number;
  title: string;
  posterUrl: string;
  rating: number;
}

// FIX: Moved UserMovieList from supabaseApi.ts to centralize types and fix import error.
export interface UserMovieList {
  id: number;
  user_id: string;
  tmdb_movie_id: number;
  list_type: 'watched' | 'watchlist';
}

export interface UserActivity {
  id: number;
  userName: string;
  userAvatarUrl: string;
  action: 'watched' | 'added to watchlist';
  movie: Movie;
  timestamp: string;
}

export interface ChatRoom {
  id: number;
  name: string;
  description: string | null;
  is_anonymous: boolean;
}

export interface ChatMessage {
  id: number;
  room_id: number;
  sender_id: string;
  content: string;
  created_at: string;
  profiles: Profile | null;
  seen_by?: string[];
}

// --- New Types for Friendship and DMs ---

export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface Friendship {
  id: number;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  // The profiles object will be joined in our queries
  requester: Profile;
  addressee: Profile;
}

export interface DirectMessage {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  // This will be joined for displaying sender info
  profiles: Profile | null;
  seen_by?: string[];
}

// --- Types for Movie Detail View ---

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string | null;
}

export interface MovieDetail extends Movie {
  overview: string;
  releaseDate: string;
  genres: { id: number; name: string }[];
  cast: CastMember[];
  trailerUrl: string | null;
}
