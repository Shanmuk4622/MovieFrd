import React, { useState, useEffect } from 'react';
import MovieList from './MovieList';
import ActivityCard from './ActivityCard';
import { Movie, UserActivity, UserMovieList, Profile } from '../types';
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
  const [friendActivity, setFriendActivity] = useState<UserActivity[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    const loadMovies = async () => {
      setLoadingMovies(true);
      try {
        const [popular, trending] = await Promise.all([
            fetchMovies('/movie/popular'),
            fetchMovies('/movie/top_rated')
        ]);
        setPopularMovies(popular);
        setTrendingMovies(trending);
      } catch (error) {
        console.error("Failed to load dashboard movies", error);
      } finally {
        setLoadingMovies(false);
      }
    };
    
    loadMovies();
  }, []);

  useEffect(() => {
    const loadFriendActivity = async () => {
      if (!user) return;
      setLoadingActivity(true);

      try {
        const rawActivity = await getFriendActivity(user.id);
        
        if (rawActivity && rawActivity.length > 0) {
          const movieIds = [...new Set(rawActivity.map(a => a.tmdb_movie_id))];
          const moviePromises = movieIds.map(id => fetchMovieDetails(id));
          const movieResults = await Promise.all(moviePromises);
          
          const moviesMap = new Map<number, Movie>();
          movieResults.forEach(movie => {
            if (movie) moviesMap.set(movie.id, movie);
          });
          
          const formattedActivity: UserActivity[] = rawActivity
            .map(activity => {
              const movie = moviesMap.get(activity.tmdb_movie_id);
              // Supabase join returns the profile in a 'profiles' property
              const profile = activity.profiles as Profile | null;

              if (!movie || !profile) return null;

              return {
                id: activity.id,
                userName: profile.username,
                userAvatarUrl: profile.avatar_url || `https://picsum.photos/seed/${profile.id}/100`,
                action: activity.list_type === 'watched' ? 'watched' : 'added to watchlist',
                movie: movie,
                timestamp: formatTimeAgo(activity.created_at),
              };
            })
            .filter((a): a is UserActivity => a !== null);
          
          setFriendActivity(formattedActivity);
        } else {
            setFriendActivity([]);
        }

      } catch (error) {
        console.error("Failed to load friend activity:", error);
        setFriendActivity([]);
      } finally {
        setLoadingActivity(false);
      }
    };

    loadFriendActivity();
  }, [user]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 lg:px-0">
      <div className="lg:col-span-2">
        {loadingMovies ? (
            <>
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