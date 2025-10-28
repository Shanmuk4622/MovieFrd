import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserMovieList, getFriendships, uploadAvatar } from '../supabaseApi';
import { Movie, Friendship } from '../types';
import { fetchMovieDetails } from '../api';
import MovieList from './MovieList';
import UserSearch from './UserSearch';
import FriendList from './FriendList';
import { UserIcon } from './icons';

interface ProfileProps {
  userMovieLists: UserMovieList[];
  onListUpdate: () => void;
  onSelectMovie: (movieId: number) => void;
}

const Profile: React.FC<ProfileProps> = ({ userMovieLists, onListUpdate, onSelectMovie }) => {
  const { user, profile, refreshProfile, theme, toggleTheme } = useAuth();
  const [watched, setWatched] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [friendships, setFriendships] = useState<Friendship[]>([]);

  // Avatar upload states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;
    const data = await getFriendships(user.id);
    setFriendships(data);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchFriendships();
    }
  }, [user, fetchFriendships]);

  useEffect(() => {
    const fetchMovieDataForLists = async () => {
      setLoadingMovies(true);
      const watchedIds = userMovieLists.filter(item => item.list_type === 'watched').map(item => item.tmdb_movie_id);
      const watchlistIds = userMovieLists.filter(item => item.list_type === 'watchlist').map(item => item.tmdb_movie_id);

      try {
        const watchedMovies = await Promise.all(watchedIds.map(id => fetchMovieDetails(id)));
        const watchlistMovies = await Promise.all(watchlistIds.map(id => fetchMovieDetails(id)));
        
        setWatched(watchedMovies.filter((m): m is Movie => m !== null));
        setWatchlist(watchlistMovies.filter((m): m is Movie => m !== null));

      } catch (error) {
        console.error("Error fetching movie details for lists:", error);
      } finally {
        setLoadingMovies(false);
      }
    };

    if (user) {
        fetchMovieDataForLists();
    }
  }, [user, userMovieLists]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setAvatarFile(files[0]);
      setUploadError(null);
    }
  };

  const handleAvatarUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!avatarFile || !user) return;

    setUploading(true);
    setUploadError(null);
    try {
      await uploadAvatar(user.id, avatarFile);
      await refreshProfile(); // Refresh global profile state
      setAvatarFile(null); // Clear selection
      const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      setUploadError(error.message || "Failed to upload avatar.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  if (!user || !profile) {
    return <div className="text-center p-8">Loading profile...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 md:px-0">
        <div className="md:col-span-2">
            <div className="flex items-center space-x-4 mb-8 p-4 bg-white dark:bg-gray-800/50 rounded-lg shadow-sm">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <UserIcon className="w-16 h-16 text-gray-500 dark:text-gray-400" />
                )}
                <div>
                  <h1 className="text-3xl font-bold">{profile.username}</h1>
                  <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg mb-8 shadow-sm">
              <form onSubmit={handleAvatarUpload}>
                  <label htmlFor="avatar-upload" className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">Update Profile Picture</label>
                  <div className="flex items-center space-x-3">
                      <input
                          type="file"
                          id="avatar-upload"
                          accept="image/png, image/jpeg"
                          onChange={handleFileChange}
                          disabled={uploading}
                          className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-600/20 file:text-red-300 hover:file:bg-red-600/30 cursor-pointer"
                      />
                      <button
                          type="submit"
                          disabled={!avatarFile || uploading}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0"
                      >
                          {uploading ? 'Uploading...' : 'Upload'}
                      </button>
                  </div>
                  {uploadError && <p className="text-red-400 text-sm mt-2">{uploadError}</p>}
              </form>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg mb-8 shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-3">Appearance</h3>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">Dark Mode</span>
                <label htmlFor="theme-toggle" className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="theme-toggle" 
                    className="sr-only peer"
                    checked={theme === 'dark'}
                    onChange={toggleTheme}
                  />
                  <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-red-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>
            
            {loadingMovies ? (
                <div className="text-center p-8">Fetching your movie lists...</div>
            ) : (
                <>
                <MovieList 
                    title="My Watched List" 
                    movies={watched}
                    userMovieLists={userMovieLists}
                    onListUpdate={onListUpdate} 
                    onSelectMovie={onSelectMovie}
                />
                <MovieList 
                    title="My Watchlist" 
                    movies={watchlist}
                    userMovieLists={userMovieLists}
                    onListUpdate={onListUpdate}
                    onSelectMovie={onSelectMovie}
                />
                </>
            )}
        </div>
        <div className="md:col-span-1">
            <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 space-y-6 shadow-sm">
                <UserSearch currentUser={user} friendships={friendships} onFriendAction={fetchFriendships} />
                <FriendList currentUser={user} friendships={friendships} onFriendAction={fetchFriendships} />
            </div>
        </div>
    </div>
  );
};

export default Profile;