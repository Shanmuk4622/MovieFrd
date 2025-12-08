import React, { useState, useEffect, useMemo } from 'react';
import MovieList from './MovieList';
import ActivityCard from './ActivityCard';
import { Movie, UserActivity, UserMovieList } from '../types';
import { fetchMovies, fetchMovieDetails } from '../api';
import { getFriendActivity, FriendActivity, FriendReviewActivity } from '../supabaseApi';
import { MovieListSkeleton, ActivitySkeleton } from './skeletons';
import { useAuth } from '../contexts/AuthContext';
import { formatTimeAgo } from '../utils';
import SortControls, { SortKey } from './SortControls';

interface DashboardProps {
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  onSelectMovie: (movieId: number) => void;
  onSelectProfile: (userId: string) => void;
}


const Dashboard: React.FC<DashboardProps> = ({ userMovieLists, onListUpdate, onSelectMovie, onSelectProfile }) => {
  const { user } = useAuth();
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [friendActivity, setFriendActivity] = useState<UserActivity[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const [popularSort, setPopularSort] = useState<SortKey>('default');
  const [trendingSort, setTrendingSort] = useState<SortKey>('default');

  useEffect(() => {
    const loadMovies = async () => {
      setLoadingMovies(true);
      try {
        const [popular, trending, upcoming] = await Promise.all([
            fetchMovies('/movie/popular'),
            fetchMovies('/movie/top_rated'),
            fetchMovies('/movie/upcoming')
        ]);
        setPopularMovies(popular);
        setTrendingMovies(trending);
        setUpcomingMovies(upcoming);
      } catch (error) {
        console.error("Failed to load dashboard movies", error);
      } finally {
        setLoadingMovies(false);
      }
    };
    
    loadMovies();
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadRealActivity = async () => {
      setLoadingActivity(true);
      try {
        const activitiesFromDb = await getFriendActivity(user.id);
        
        if (!activitiesFromDb || activitiesFromDb.length === 0) {
          setFriendActivity([]);
          return;
        }

        const movieIds = [...new Set(activitiesFromDb.map(a => a.tmdb_movie_id))];
        
        const movieDetailsPromises = movieIds.map(id => fetchMovieDetails(id));
        const movieDetailsResults = await Promise.all(movieDetailsPromises);
        
        const movieDetailsMap = new Map<number, Movie>();
        movieDetailsResults.forEach(movie => {
          if (movie) {
            movieDetailsMap.set(movie.id, movie);
          }
        });

        const formattedActivities: UserActivity[] = activitiesFromDb
          .map(activity => {
            const movie = movieDetailsMap.get(activity.tmdb_movie_id);
            if (!movie || !activity.profiles) {
              return null;
            }

            // Check if this is a review activity (has rating field)
            const isReview = 'rating' in activity;

            return {
              id: activity.id,
              userId: activity.profiles.id,
              userName: activity.profiles.username,
              userAvatarUrl: activity.profiles.avatar_url || `https://i.pravatar.cc/100?u=${activity.profiles.id}`,
              action: isReview 
                ? 'reviewed' 
                : (activity as FriendActivity).list_type === 'watched' 
                  ? 'watched' 
                  : 'added to watchlist',
              movie: movie,
              timestamp: formatTimeAgo(activity.created_at),
              rating: isReview ? (activity as FriendReviewActivity).rating : undefined,
              reviewText: isReview ? (activity as FriendReviewActivity).review_text || undefined : undefined,
            };
          })
          .filter((activity): activity is UserActivity => activity !== null);

        setFriendActivity(formattedActivities);

      } catch (error) {
        console.error("Failed to load friend activity", error);
        setFriendActivity([]);
      } finally {
        setLoadingActivity(false);
      }
    };
    
    loadRealActivity();
  }, [user]);

  const sortedPopularMovies = useMemo(() => {
    const sorted = [...popularMovies];
    if (popularSort === 'release_date') {
      sorted.sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateB - dateA;
      });
    } else if (popularSort === 'popularity') {
      sorted.sort((a, b) => b.popularity - a.popularity);
    }
    return sorted;
  }, [popularMovies, popularSort]);

  const sortedTrendingMovies = useMemo(() => {
    const sorted = [...trendingMovies];
    if (trendingSort === 'release_date') {
      sorted.sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateB - dateA;
      });
    } else if (trendingSort === 'popularity') {
      sorted.sort((a, b) => b.popularity - a.popularity);
    }
    return sorted;
  }, [trendingMovies, trendingSort]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 lg:px-0">
      <div className="lg:col-span-2">
        {loadingMovies ? (
            <>
                <MovieListSkeleton />
                <MovieListSkeleton />
                <MovieListSkeleton />
            </>
        ) : (
            <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-4 md:px-0 gap-2">
                  <h2 className="text-2xl md:text-3xl font-bold">Popular on TMDB</h2>
                  <SortControls currentSort={popularSort} onSortChange={setPopularSort} />
                </div>
                <MovieList 
                  movies={sortedPopularMovies} 
                  userMovieLists={userMovieLists}
                  onListUpdate={onListUpdate}
                  onSelectMovie={onSelectMovie}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-4 md:px-0 mt-8 gap-2">
                  <h2 className="text-2xl md:text-3xl font-bold">Trending at VITAP</h2>
                  <SortControls currentSort={trendingSort} onSortChange={setTrendingSort} />
                </div>
                <MovieList 
                  movies={sortedTrendingMovies} 
                  userMovieLists={userMovieLists}
                  onListUpdate={onListUpdate}
                  onSelectMovie={onSelectMovie}
                />

                <MovieList 
                  title="Explore Upcoming Movies" 
                  movies={upcomingMovies} 
                  userMovieLists={userMovieLists}
                  onListUpdate={onListUpdate}
                  onSelectMovie={onSelectMovie}
                />
            </>
        )}
      </div>
      <div className="lg:col-span-1">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Friend Activity</h2>
        {loadingActivity ? (
            <ActivitySkeleton />
        ) : friendActivity.length > 0 ? (
            <div className="space-y-4">
              {friendActivity.map(activity => (
                <ActivityCard 
                    key={activity.id} 
                    activity={activity} 
                    onSelectMovie={onSelectMovie}
                    onSelectProfile={onSelectProfile}
                />
              ))}
            </div>
        ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
                <p className="font-semibold text-gray-800 dark:text-white">No recent activity</p>
                <p className="text-sm mt-1">Your friends haven't been active recently. Add some friends to see their updates here!</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
