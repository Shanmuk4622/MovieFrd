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
    // Replaced real data fetching with mock data for demonstration purposes.
    const loadMockActivity = () => {
        setLoadingActivity(true);

        const mockData: UserActivity[] = [
          {
            id: 1,
            userName: 'Rohan',
            userAvatarUrl: 'https://i.pravatar.cc/100?u=rohan',
            action: 'added to watchlist',
            movie: {
              id: 693134,
              title: 'Salaar: Part 1 – Ceasefire',
              posterUrl: 'https://image.tmdb.org/t/p/w500/iPAc1x0l27FEnMk3d2eUaK4a2KI.jpg',
              rating: 7.8,
            },
            timestamp: '2 hours ago',
          },
          {
            id: 2,
            userName: 'Priya',
            userAvatarUrl: 'https://i.pravatar.cc/100?u=priya',
            action: 'watched',
            movie: {
              id: 872585,
              title: 'Oppenheimer',
              posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
              rating: 8.6,
            },
            timestamp: '5 hours ago',
          },
          {
            id: 3,
            userName: 'Amit',
            userAvatarUrl: 'https://i.pravatar.cc/100?u=amit',
            action: 'watched',
            movie: {
              id: 157336,
              title: 'Interstellar',
              posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
              rating: 9.2,
            },
            timestamp: '1 day ago',
          },
        ];
        
        // Simulate a short network delay
        const timer = setTimeout(() => {
            setFriendActivity(mockData);
            setLoadingActivity(false);
        }, 750);

        return () => clearTimeout(timer);
    };

    loadMockActivity();
  }, []);

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