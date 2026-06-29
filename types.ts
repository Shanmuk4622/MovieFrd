// ---------------------------------------------------------------------------
// Shared domain types. Field names mirror the Supabase schema and the TMDB
// mapping in api.ts — do not rename DB-backed fields without a migration.
// ---------------------------------------------------------------------------

export interface Movie {
  id: number;
  title: string;
  posterUrl: string;
  rating: number;
  releaseDate?: string;
  popularity: number;
}

export type ListType = 'watched' | 'watchlist';

export interface UserMovieList {
  id: number;
  user_id: string;
  tmdb_movie_id: number;
  list_type: ListType;
}

export interface MovieReview {
  id: number;
  user_id: string;
  tmdb_movie_id: number;
  rating: number; // 1-10
  review_text: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile | null;
}

export type ActivityAction = 'watched' | 'added to watchlist' | 'reviewed';

export interface UserActivity {
  id: number;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  action: ActivityAction;
  movie: Movie;
  timestamp: string;
  rating?: number; // review activities only
  reviewText?: string; // review activities only
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

// --- Friendship & direct messages ---

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
  requester: Profile;
  addressee: Profile;
}

export interface DirectMessage {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  profiles: Profile | null;
  seen_by?: string[];
  reply_to_message_id: number | null;
}

// --- Movie detail view ---

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

// Renamed from `MovieDetail` to avoid colliding with the `MovieDetail` component.
export interface MovieDetailData extends Movie {
  overview: string;
  releaseDate: string;
  genres: { id: number; name: string }[];
  cast: CastMember[];
  trailerUrl: string | null;
  similar: Movie[];
  reviews: Review[];
}

// --- Anonymous chat ---

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
  id: number | string; // server rows use numeric/uuid ids; optimistic ones use a temp string
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

// --- App-wide UI types ---

export type NotificationType = 'success' | 'info' | 'dm' | 'error';

export interface AppNotification {
  message: string;
  type: NotificationType;
  senderProfile?: Profile;
}
