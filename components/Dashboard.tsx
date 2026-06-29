import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MovieList from './MovieList';
import ActivityCard from './ActivityCard';
import { Movie, UserActivity, UserMovieList } from '../types';
import { fetchMovies, fetchMovieDetails } from '../api';
import { getFriendActivity, FriendActivity, FriendReviewActivity } from '../supabaseApi';
import { MovieListSkeleton, ActivitySkeleton } from './skeletons';
import { useAuth } from '../contexts/AuthContext';
import { formatTimeAgo } from '../utils';
import SortControls, { SortKey } from './SortControls';
import { UserGroupIcon } from './icons';
import { EmptyState } from './ui';

interface DashboardProps {
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  onSelectMovie: (movieId: number) => void;
  onSelectProfile: (userId: string) => void;
  onActivityRefreshReady?: (refreshFn: () => void) => void;
}

const sortMovies = (movies: Movie[], sort: SortKey): Movie[] => {
  if (sort === 'default') return movies;
  const sorted = [...movies];
  if (sort === 'release_date') {
    sorted.sort((a, b) => {
      const dA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return dB - dA;
    });
  } else if (sort === 'popularity') {
    sorted.sort((a, b) => b.popularity - a.popularity);
  }
  return sorted;
};

const Dashboard: React.FC<DashboardProps> = ({
  userMovieLists,
  onListUpdate,
  onSelectMovie,
  onSelectProfile,
  onActivityRefreshReady,
}) => {
  const { user } = useAuth();
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [friendActivity, setFriendActivity] = useState<UserActivity[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [popularSort, setPopularSort] = useState<SortKey>('default');
  const [trendingSort, setTrendingSort] = useState<SortKey>('default');

  const loadFriendActivity = useCallback(async () => {
    if (!user) return;
    setLoadingActivity(true);
    try {
      const activities = await getFriendActivity(user.id);
      if (!activities || activities.length === 0) {
        setFriendActivity([]);
        return;
      }

      const movieIds = [...new Set(activities.map((a) => a.tmdb_movie_id))];
      const movieResults = await Promise.all(movieIds.map((id) => fetchMovieDetails(id)));
      const movieMap = new Map<number, Movie>();
      movieResults.forEach((m) => m && movieMap.set(m.id, m));

      const formatted: UserActivity[] = activities
        .map((activity): UserActivity | null => {
          const movie = movieMap.get(activity.tmdb_movie_id);
          if (!movie) return null;

          const profile = activity.profiles;
          const isReview = 'rating' in activity;
          return {
            id: activity.id,
            userId: profile?.id || (activity as FriendActivity | FriendReviewActivity).user_id,
            userName: profile?.username || 'Friend',
            userAvatarUrl: profile?.avatar_url ?? null,
            action: isReview
              ? 'reviewed'
              : (activity as FriendActivity).list_type === 'watched'
                ? 'watched'
                : 'added to watchlist',
            movie,
            timestamp: formatTimeAgo(activity.created_at),
            rating: isReview ? (activity as FriendReviewActivity).rating : undefined,
            reviewText: isReview ? (activity as FriendReviewActivity).review_text || undefined : undefined,
          };
        })
        .filter((a): a is UserActivity => a !== null);

      setFriendActivity(formatted);
    } catch (error) {
      console.error('Failed to load friend activity', error);
      setFriendActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  }, [user]);

  useEffect(() => {
    const loadMovies = async () => {
      setLoadingMovies(true);
      try {
        const [popular, trending, upcoming] = await Promise.all([
          fetchMovies('/movie/popular'),
          fetchMovies('/movie/top_rated'),
          fetchMovies('/movie/upcoming'),
        ]);
        setPopularMovies(popular);
        setTrendingMovies(trending);
        setUpcomingMovies(upcoming);
      } catch (error) {
        console.error('Failed to load dashboard movies', error);
      } finally {
        setLoadingMovies(false);
      }
    };
    loadMovies();
  }, []);

  useEffect(() => {
    if (user) loadFriendActivity();
  }, [user, loadFriendActivity]);

  useEffect(() => {
    onActivityRefreshReady?.(loadFriendActivity);
  }, [loadFriendActivity, onActivityRefreshReady]);

  const sortedPopular = useMemo(() => sortMovies(popularMovies, popularSort), [popularMovies, popularSort]);
  const sortedTrending = useMemo(() => sortMovies(trendingMovies, trendingSort), [trendingMovies, trendingSort]);

  return (
    <div className="grid grid-cols-1 gap-8 px-4 lg:grid-cols-3 lg:px-0">
      <div className="lg:col-span-2">
        {loadingMovies ? (
          <>
            <MovieListSkeleton />
            <MovieListSkeleton />
            <MovieListSkeleton />
          </>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between md:px-0">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Popular on TMDB</h2>
              <SortControls currentSort={popularSort} onSortChange={setPopularSort} />
            </div>
            <MovieList movies={sortedPopular} userMovieLists={userMovieLists} onListUpdate={onListUpdate} onSelectMovie={onSelectMovie} />

            <div className="mb-4 mt-8 flex flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between md:px-0">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Trending at VITAP</h2>
              <SortControls currentSort={trendingSort} onSortChange={setTrendingSort} />
            </div>
            <MovieList movies={sortedTrending} userMovieLists={userMovieLists} onListUpdate={onListUpdate} onSelectMovie={onSelectMovie} />

            <MovieList title="Explore Upcoming Movies" movies={upcomingMovies} userMovieLists={userMovieLists} onListUpdate={onListUpdate} onSelectMovie={onSelectMovie} />
          </>
        )}
      </div>

      <div className="px-4 lg:col-span-1 lg:px-0">
        <h2 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">Friend Activity</h2>
        {loadingActivity ? (
          <ActivitySkeleton />
        ) : friendActivity.length > 0 ? (
          <div className="space-y-4">
            {friendActivity.map((activity) => (
              <ActivityCard
                key={`${activity.action}-${activity.id}`}
                activity={activity}
                onSelectMovie={onSelectMovie}
                onSelectProfile={onSelectProfile}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<UserGroupIcon className="h-12 w-12" />}
            title="No recent activity"
            description="Your friends haven't been active recently. Add some friends to see their updates here!"
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
