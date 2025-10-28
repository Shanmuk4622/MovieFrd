

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
// FIX: The 'Friendship' type is defined in '../types' and should be imported from there.
import { getProfile, UserMovieList, getFriendships } from '../supabaseApi';
import { Movie, Friendship } from '../types';
import { fetchMovieDetails } from '../api';
import MovieList from './MovieList';
import UserSearch from './UserSearch';
import FriendList from './FriendList';
import { UserIcon } from './icons';

interface ProfileData {
  username: string;
  avatar_url: string | null;
}

interface ProfileProps {
  userMovieLists: UserMovieList[];
  onListUpdate: () => void;
  onSelectMovie: (movieId: number) => void;
}

const Profile: React.FC<ProfileProps> = ({ userMovieLists, onListUpdate, onSelectMovie }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendships, setFriendships] = useState<Friendship[]>([]);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;
    const data = await getFriendships(user.id);
    setFriendships(data);
  }, [user]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const profileData = await getProfile(user.id);
        if (profileData) setProfile(profileData);
        await fetchFriendships();
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };
    fetchProfileData();
  }, [user, fetchFriendships]);

  useEffect(() => {
    const fetchMovieDataForLists = async () => {
      setLoading(true);
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
        setLoading(false);
      }
    };

    if (user) {
        fetchMovieDataForLists();
    }
  }, [user, userMovieLists]);

  if (!user || !profile) {
    return <div className="text-center p-8">Loading profile...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 md:px-0">
        <div className="md:col-span-2">
            <div className="flex items-center space-x-4 mb-8 p-4 bg-gray-800/50 rounded-lg">
                <UserIcon className="w-16 h-16 text-gray-400" />
                <div>
                <h1 className="text-3xl font-bold">{profile.username}</h1>
                <p className="text-gray-400">{user.email}</p>
                </div>
            </div>
            
            {loading ? (
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
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-6">
                <UserSearch currentUser={user} friendships={friendships} onFriendAction={fetchFriendships} />
                <FriendList currentUser={user} friendships={friendships} onFriendAction={fetchFriendships} />
            </div>
        </div>
    </div>
  );
};

export default Profile;