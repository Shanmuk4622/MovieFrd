
export interface Movie {
  id: number;
  title: string;
  posterUrl: string;
  rating: number;
}

export interface UserActivity {
  id: number;
  userName: string;
  userAvatarUrl: string;
  action: 'watched' | 'added to watchlist';
  movie: Movie;
  timestamp: string;
}
