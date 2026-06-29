import React, { useState, useEffect } from 'react';
import { Profile, Movie, UserMovieList } from '../types';
import { getProfile, getUserMovieLists, getFriendships } from '../supabaseApi';
import { fetchMovieDetails } from '../api';
import MovieList from './MovieList';
import { Avatar, Modal, Spinner } from './ui';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  currentUserMovieLists: UserMovieList[];
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

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  onClose,
  currentUserMovieLists,
  onListUpdate,
  onSelectMovie,
  onSelectProfile,
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [userProfile, movieLists, friendships] = await Promise.all([
          getProfile(userId),
          getUserMovieLists(userId),
          getFriendships(userId),
        ]);
        if (!userProfile) throw new Error('User profile not found.');
        setProfile(userProfile);

        const watchedIds = movieLists.filter((i) => i.list_type === 'watched').map((i) => i.tmdb_movie_id);
        const watchlistIds = movieLists.filter((i) => i.list_type === 'watchlist').map((i) => i.tmdb_movie_id);

        const [watchedMovies, watchlistMovies] = await Promise.all([
          fetchMoviesInChunks(watchedIds),
          fetchMoviesInChunks(watchlistIds),
        ]);

        setFriends(
          friendships
            .filter((f) => f.status === 'accepted')
            .map((f) => (f.requester_id === userId ? f.addressee : f.requester))
        );
        setWatched(watchedMovies);
        setWatchlist(watchlistMovies);
      } catch (err: any) {
        setError(err.message || 'Failed to load user profile.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) load();
  }, [userId]);

  return (
    <Modal isOpen onClose={onClose} maxWidth="max-w-4xl">
      {loading ? (
        <div className="flex h-[50vh] items-center justify-center">
          <Spinner size="h-12 w-12" className="text-brand-500" />
        </div>
      ) : error || !profile ? (
        <div className="p-8 text-center text-brand-500">{error || 'User not found.'}</div>
      ) : (
        <div className="p-4 sm:p-6">
          <div className="mb-8 flex items-center gap-4">
            <Avatar src={profile.avatar_url} name={profile.username} size="h-20 w-20" />
            <h1 className="text-3xl font-bold">{profile.username}</h1>
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

          <div className="mt-8">
            <h2 className="mb-4 px-4 text-2xl font-bold md:px-0 md:text-3xl">{profile.username}'s Friends</h2>
            {friends.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:px-0 lg:grid-cols-3">
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => onSelectProfile(friend.id)}
                    className="flex w-full items-center gap-3 rounded-xl bg-surface-100 p-3 text-left transition-colors hover:bg-surface-200 dark:bg-surface-800/60 dark:hover:bg-surface-800"
                  >
                    <Avatar src={friend.avatar_url} name={friend.username} size="h-10 w-10" />
                    <span className="truncate font-semibold">{friend.username}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-4 text-surface-500 dark:text-surface-400 md:px-0">This list is currently empty.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default UserProfileModal;
