import React, { useState, useEffect } from 'react';
import MovieList from './MovieList';
import ActivityCard from './ActivityCard';
// FIX: UserMovieList is now imported from types.ts
import { Movie, UserActivity, UserMovieList } from '../types';
import { fetchMovies } from '../api';
import { MovieListSkeleton, ActivitySkeleton } from './skeletons';

// Friend activity will remain mocked for now, as it requires user auth and a database.
const mockActivities: UserActivity[] = [
    { 
        id: 1, 
        userName: "Rohan", 
        userAvatarUrl: "https://picsum.photos/seed/rohan/100", 
        action: "added to watchlist", 
        movie: { id: 9, title: "Salaar: Part 1 – Ceasefire", posterUrl: "https://picsum.photos/seed/salaar/400/600", rating: 7.8 },
        timestamp: "2 hours ago" 
    },
    { 
        id: 2, 
        userName: "Priya", 
        userAvatarUrl: "https://picsum.photos/seed/priya/100", 
        action: "watched", 
        movie: { id: 5, title: "Oppenheimer", posterUrl: "https://picsum.photos/seed/oppenheimer/400/600", rating: 8.6 },
        timestamp: "5 hours ago" 
    },
    { 
        id: 3, 
        userName: "Amit", 
        userAvatarUrl: "https://picsum.photos/seed/amit/100", 
        action: "watched", 
        movie: { id: 2, title: "Interstellar", posterUrl: "https://picsum.photos/seed/interstellar/400/600", rating: 9.2 },
        timestamp: "1 day ago" 
    },
];

interface DashboardProps {
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  onSelectMovie: (movieId: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userMovieLists, onListUpdate, onSelectMovie }) => {
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMovies = async () => {
      setLoading(true);
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
        setLoading(false);
      }
    };
    
    loadMovies();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 lg:px-0">
      <div className="lg:col-span-2">
        {loading ? (
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
        {loading ? (
            <ActivitySkeleton />
        ) : (
            <div className="space-y-4">
              {mockActivities.map(activity => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;