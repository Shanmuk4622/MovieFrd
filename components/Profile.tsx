import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFriendships, uploadAvatar } from '../supabaseApi';
import { Movie, Friendship, UserMovieList } from '../types';
import { fetchMovieDetails } from '../api';
import MovieList from './MovieList';
import UserDiscovery from './UserSearch';
import FriendList from './FriendList';
import FriendRecommendations from './FriendRecommendations';
import MyReviews from './MyReviews';
import { SunIcon, MoonIcon, PencilIcon } from './icons';
import { MovieListSkeleton } from './skeletons';
import { Avatar, Button, IconButton, Spinner } from './ui';

interface ProfileProps {
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  onSelectMovie: (movieId: number) => void;
  onSelectProfile: (userId: string) => void;
}

const fetchMoviesInChunks = async (ids: number[]): Promise<Movie[]> => {
  const all: Movie[] = [];
  const chunkSize = 10;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const movies = await Promise.all(chunk.map((id) => fetchMovieDetails(id)));
    all.push(...movies.filter((m): m is Movie => m !== null));
  }
  return all;
};

const Profile: React.FC<ProfileProps> = ({ userMovieLists, onListUpdate, onSelectMovie, onSelectProfile }) => {
  const { user, profile, refreshProfile, signOut, theme, toggleTheme } = useAuth();
  const [watched, setWatched] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loadingFriendships, setLoadingFriendships] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;
    setLoadingFriendships(true);
    try {
      setFriendships(await getFriendships(user.id));
    } catch (error) {
      console.error('Failed to fetch friendships', error);
    } finally {
      setLoadingFriendships(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchFriendships();
  }, [user, fetchFriendships]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingMovies(true);
      const watchedIds = userMovieLists.filter((i) => i.list_type === 'watched').map((i) => i.tmdb_movie_id);
      const watchlistIds = userMovieLists.filter((i) => i.list_type === 'watchlist').map((i) => i.tmdb_movie_id);
      try {
        const [watchedMovies, watchlistMovies] = await Promise.all([
          fetchMoviesInChunks(watchedIds),
          fetchMoviesInChunks(watchlistIds),
        ]);
        setWatched(watchedMovies);
        setWatchlist(watchlistMovies);
      } catch (error) {
        console.error('Error fetching movie details for lists:', error);
      } finally {
        setLoadingMovies(false);
      }
    };
    load();
  }, [user, userMovieLists]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadAvatar(user.id, file);
      await refreshProfile();
    } catch (error: any) {
      setUploadError(
        error.message ||
          "Failed to upload avatar. Ensure the 'avatars' storage bucket exists with the correct policies."
      );
      console.error(error);
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="h-8 w-8" className="text-brand-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 px-4 md:grid-cols-3 md:px-0">
      <div className="md:col-span-2">
        <div className="card-surface mb-8 flex items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="group relative flex-shrink-0">
              <Avatar src={profile.avatar_url} name={profile.username} size="h-16 w-16" />
              {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                  <Spinner size="h-7 w-7" className="text-white" />
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Update profile picture"
                >
                  <PencilIcon className="h-6 w-6 text-white" />
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
              <h1 className="truncate text-3xl font-bold">{profile.username}</h1>
              <p className="truncate text-surface-500 dark:text-surface-400">{user.email}</p>
              {uploadError && <p className="mt-1 text-xs text-brand-500">{uploadError}</p>}
            </div>
          </div>
          <IconButton
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="flex-shrink-0 hover:text-brand-500"
          >
            {theme === 'dark' ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
          </IconButton>
        </div>

        {loadingMovies ? (
          <>
            <MovieListSkeleton />
            <MovieListSkeleton />
          </>
        ) : (
          <>
            <MyReviews userId={user.id} onSelectMovie={onSelectMovie} />
            <MovieList title="My Watched List" movies={watched} userMovieLists={userMovieLists} onListUpdate={onListUpdate} onSelectMovie={onSelectMovie} />
            <MovieList title="My Watchlist" movies={watchlist} userMovieLists={userMovieLists} onListUpdate={onListUpdate} onSelectMovie={onSelectMovie} />
          </>
        )}

        <div className="mt-8">
          <Button variant="danger" fullWidth size="lg" onClick={handleSignOut} isLoading={isSigningOut}>
            Sign Out
          </Button>
        </div>
      </div>

      <div className="md:col-span-1">
        <div className="card-surface space-y-6 p-4">
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
