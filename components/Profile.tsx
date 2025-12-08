import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
// FIX: UserMovieList is now imported from types.ts
import { getFriendships, uploadAvatar } from '../supabaseApi';
import { Movie, Friendship, UserMovieList } from '../types';
import { fetchMovieDetails } from '../api';
import MovieList from './MovieList';
import UserDiscovery from './UserSearch';
import FriendList from './FriendList';
import FriendRecommendations from './FriendRecommendations';
import MyReviews from './MyReviews';
import { UserIcon, SunIcon, MoonIcon, PencilIcon } from './icons';
import { MovieListSkeleton } from './skeletons';

interface ProfileProps {
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  onSelectMovie: (movieId: number) => void;
  onSelectProfile: (userId: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ userMovieLists, onListUpdate, onSelectMovie, onSelectProfile }) => {
  const { user, profile, refreshProfile, signOut, theme, toggleTheme } = useAuth();
  const [watched, setWatched] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loadingFriendships, setLoadingFriendships] = useState(true);

  // Avatar upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Sign out state
  const [isSigningOut, setIsSigningOut] = useState(false);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;
    setLoadingFriendships(true);
    try {
        const data = await getFriendships(user.id);
        setFriendships(data);
    } catch (error) {
        console.error("Failed to fetch friendships", error);
    } finally {
        setLoadingFriendships(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchFriendships();
    }
  }, [user, fetchFriendships]);

  useEffect(() => {
    const fetchMoviesInChunks = async (ids: number[]): Promise<Movie[]> => {
        const allMovies: Movie[] = [];
        const chunkSize = 10; // Fetch 10 movies at a time
        for (let i = 0; i < ids.length; i += chunkSize) {
            const chunkIds = ids.slice(i, i + chunkSize);
            const moviePromises = chunkIds.map(id => fetchMovieDetails(id));
            const moviesInChunk = await Promise.all(moviePromises);
            allMovies.push(...moviesInChunk.filter((m): m is Movie => m !== null));
        }
        return allMovies;
    };

    const fetchMovieDataForLists = async () => {
      setLoadingMovies(true);
      const watchedIds = userMovieLists.filter(item => item.list_type === 'watched').map(item => item.tmdb_movie_id);
      const watchlistIds = userMovieLists.filter(item => item.list_type === 'watchlist').map(item => item.tmdb_movie_id);

      try {
        const [watchedMovies, watchlistMovies] = await Promise.all([
          fetchMoviesInChunks(watchedIds),
          fetchMoviesInChunks(watchlistIds)
        ]);
        
        setWatched(watchedMovies);
        setWatchlist(watchlistMovies);

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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;

    const file = files[0];
    setUploading(true);
    setUploadError(null);

    try {
      await uploadAvatar(user.id, file);
      await refreshProfile(); // Refresh global profile state
    } catch (error: any) {
      setUploadError(error.message || "Failed to upload avatar. Please ensure the 'avatars' storage bucket exists and has the correct policies.");
      console.error(error);
    } finally {
      setUploading(false);
      // Reset file input to allow re-uploading the same file
      if (event.target) {
        event.target.value = '';
      }
    }
  };
  
  const handleSignOut = async () => {
    setIsSigningOut(true);
    const { error } = await signOut();
    if (error) {
        console.error("Error signing out:", error);
        // Optionally show a notification to the user here
        setIsSigningOut(false);
    }
    // On success, the component will unmount due to auth state change,
    // so we don't need to explicitly set signing out to false.
  };

  if (!user || !profile) {
    return <div className="text-center p-8">Loading profile...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 md:px-0">
        <div className="md:col-span-2">
            <div className="flex items-center justify-between space-x-4 mb-8 p-4 bg-white dark:bg-gray-800/50 rounded-lg shadow-sm">
                <div className="flex items-center space-x-4 min-w-0">
                    <div className="relative group flex-shrink-0">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt={profile.username} className="w-16 h-16 rounded-full object-cover" />
                        ) : (
                            <UserIcon className="w-16 h-16 text-gray-500 dark:text-gray-400" />
                        )}
                        {uploading ? (
                            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Update profile picture"
                            >
                                <PencilIcon className="w-7 h-7 text-white" />
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                            accept="image/png, image/jpeg"
                            className="hidden"
                            disabled={uploading}
                        />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-3xl font-bold truncate">{profile.username}</h1>
                      <p className="text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      {uploadError && <p className="text-red-400 text-xs mt-1">{uploadError}</p>}
                    </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="p-3 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:text-red-500 transition-colors flex-shrink-0"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                </button>
            </div>
            
            {loadingMovies ? (
                <>
                    <MovieListSkeleton />
                    <MovieListSkeleton />
                </>
            ) : (
                <>
                {/* My Reviews Section */}
                <MyReviews userId={user.id} onSelectMovie={onSelectMovie} />
                
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

            <div className="mt-8">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-red-800 disabled:cursor-not-allowed"
              >
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
        </div>
        <div className="md:col-span-1">
            <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 space-y-6 shadow-sm">
                <FriendList 
                  currentUser={user} 
                  friendships={friendships} 
                  onFriendAction={fetchFriendships} 
                  isLoading={loadingFriendships} 
                  onSelectProfile={onSelectProfile}
                />
                <FriendRecommendations 
                  currentUser={user} 
                  currentUserProfile={profile}
                  userMovieLists={userMovieLists}
                  onFriendAction={fetchFriendships} 
                />
                <UserDiscovery currentUser={user} friendships={friendships} onFriendAction={fetchFriendships} />
            </div>
        </div>
    </div>
  );
};

export default Profile;