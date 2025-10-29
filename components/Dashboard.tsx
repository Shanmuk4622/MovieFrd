import React, { useState, useEffect } from 'react';
import MovieList from './MovieList';
import ActivityCard from './ActivityCard';
import { Movie, UserActivity, UserMovieList } from '../types';
import { fetchMovies, fetchMovieDetails } from '../api';
import { getFriendActivity } from '../supabaseApi';
import { MovieListSkeleton, ActivitySkeleton } from './skeletons';
import { useAuth } from '../contexts/AuthContext';
import { formatTimeAgo } from '../utils';

interface DashboardProps {
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  onSelectMovie: (movieId: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userMovieLists, onListUpdate, onSelectMovie }) => {
  const { user } = useAuth();
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [friendActivity, setFriendActivity] = useState<UserActivity[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

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

        // FIX: Argument of type 'unknown' is not assignable to parameter of type 'number'.
        // Explicitly convert tmdb_movie_id to a number to fix type inference issues.
        const movieIds = [...new Set(activitiesFromDb.map(a => Number(a.tmdb_movie_id)))];
        
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
            const movie = movieDetailsMap.get(Number(activity.tmdb_movie_id));
            if (!movie || !activity.profiles) {
              return null;
            }

            return {
              id: activity.id,
              userName: activity.profiles.username,
              userAvatarUrl: activity.profiles.avatar_url || `https://i.pravatar.cc/100?u=${activity.profiles.id}`,
              action: activity.list_type === 'watched' ? 'watched' : 'added to watchlist',
              movie: movie,
              timestamp: formatTimeAgo(activity.created_at),
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
                <MovieList 
                  title="Popular on TMDB" 
                  movies={popularMovies} 
                  userMovieLists={userMovieLists}
                  onListUpdate={onListUpdate}
                  onSelectMovie={onSelectMovie}
                />
                <MovieList 
                  title="Trending at VITAP" 
                  movies={trendingMovies} 
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
                <ActivityCard key={activity.id} activity={activity} />
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