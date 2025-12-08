

export interface Movie {
  id: number;
  title: string;
  posterUrl: string;
  rating: number;
  releaseDate?: string;
  popularity: number;
}

// FIX: Moved UserMovieList from supabaseApi.ts to centralize types and fix import error.
export interface UserMovieList {
  id: number;
  user_id: string;
  tmdb_movie_id: number;
  list_type: 'watched' | 'watchlist';
}

export interface MovieReview {
  id: number;
  user_id: string;
  tmdb_movie_id: number;
  rating: number; // 1-10
  review_text: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface UserActivity {
  id: number;
  userId: string;
  userName: string;
  userAvatarUrl: string;
  action: 'watched' | 'added to watchlist' | 'reviewed';
  movie: Movie;
  timestamp: string;
  rating?: number; // For review activities
  reviewText?: string; // For review activities
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
  reply_to_message_id: number | null;
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
  reply_to_message_id: number | null;
}

// --- Types for Movie Detail View ---

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string | null;
}

export interface Review {
  id: string;
  author: string;
  content: string;
  rating: number | null;
  createdAt: string;
  avatarUrl: string | null;
}

export interface MovieDetail extends Movie {
  overview: string;
  releaseDate: string;
  genres: { id: number; name: string }[];
  cast: CastMember[];
  trailerUrl: string | null;
  similar: Movie[];
  reviews: Review[];
}

// --- Anonymous Chat Types ---
export type AnonymousChatStatus = 'waiting' | 'paired' | 'ended';

export interface AnonymousChatSession {
  id: string;
  session_id: string;
  user1_id: string | null;
  user2_id: string | null;
  status: AnonymousChatStatus;
  created_at: string;
  paired_at: string | null;
  ended_at: string | null;
  ended_by: string | null;
}

export interface AnonymousChatMessage {
  id: number;
  session_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_typing?: boolean;
}

export interface AnonymousChatArchive {
  id: string;
  session_id: string;
  partner_id: string;
  message_count: number;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
}
