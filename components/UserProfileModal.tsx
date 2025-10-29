import React, { useState, useEffect } from 'react';
import { Profile, Movie, UserMovieList } from '../types';
import { getProfile, getUserMovieLists } from '../supabaseApi';
import { fetchMovieDetails } from '../api';
import MovieList from './MovieList';
import { UserIcon, XIcon } from './icons';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  // Props for nested MovieList interactivity
  currentUserMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  onSelectMovie: (movieId: number) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose, currentUserMovieLists, onListUpdate, onSelectMovie }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const userProfile = await getProfile(userId);
        if (!userProfile) {
          throw new Error("User profile not found.");
        }
        setProfile(userProfile);

        const movieLists = await getUserMovieLists(userId);
        const watchedIds = movieLists.filter(item => item.list_type === 'watched').map(item => item.tmdb_movie_id);
        const watchlistIds = movieLists.filter(item => item.list_type === 'watchlist').map(item => item.tmdb_movie_id);

        const watchedMovies = await Promise.all(watchedIds.map(id => fetchMovieDetails(id)));
        const watchlistMovies = await Promise.all(watchlistIds.map(id => fetchMovieDetails(id)));

        setWatched(watchedMovies.filter((m): m is Movie => m !== null));
        setWatchlist(watchlistMovies.filter((m): m is Movie => m !== null));

      } catch (err: any) {
        setError(err.message || "Failed to load user profile.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUserProfile();
    }
  }, [userId]);
  
  // Effect to handle 'Escape' key press to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const renderContent = () => {
    if (loading) {
      return <div className="flex items-center justify-center h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>;
    }

    if (error || !profile) {
      return <div className="text-center p-8 text-red-400">{error || "User not found."}</div>;
    }

    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center space-x-4 mb-8">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} className="w-20 h-20 rounded-full object-cover shadow-lg" />
          ) : (
            <UserIcon className="w-20 h-20 text-gray-500 dark:text-gray-400" />
          )}
          <div>
            <h1 className="text-3xl font-bold">{profile.username}</h1>
          </div>
        </div>
        
        <MovieList
            title={`${profile.username}'s Watched List`}
            movies={watched}
            userMovieLists={currentUserMovieLists}
            onListUpdate={onListUpdate}
            onSelectMovie={onSelectMovie}
        />
        <MovieList
            title={`${profile.username}'s Watchlist`}
            movies={watchlist}
            userMovieLists={currentUserMovieLists}
            onListUpdate={onListUpdate}
            onSelectMovie={onSelectMovie}
        />
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-auto max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-gray-100 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-600 z-10 transition-colors"
          aria-label="Close user profile"
        >
          <XIcon className="w-5 h-5" />
        </button>
        {renderContent()}
      </div>
    </div>
  );
};

export default UserProfileModal;