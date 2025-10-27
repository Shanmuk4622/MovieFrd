import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProfile, UserMovieList } from '../supabaseApi';
import { Movie } from '../types';
import { fetchMovieDetails } from '../api';
import MovieList from './MovieList';
import { UserIcon } from './icons';

interface ProfileData {
  username: string;
  avatar_url: string | null;
}

interface ProfileProps {
  userMovieLists: UserMovieList[];
  onListUpdate: () => void;
}

const Profile: React.FC<ProfileProps> = ({ userMovieLists, onListUpdate }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [watched, setWatched] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      try {
        const profileData = await getProfile(user.id);
        if (profileData) {
          setProfile(profileData);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfileData();
  }, [user]);

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

    fetchMovieDataForLists();
  }, [userMovieLists]);

  if (!user || !profile) {
    return <div className="text-center p-8">Loading profile...</div>;
  }

  return (
    <div className="px-4 md:px-0">
      <div className="flex items-center space-x-4 mb-12 p-4 bg-gray-800/50 rounded-lg">
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
          />
          <MovieList 
            title="My Watchlist" 
            movies={watchlist}
            userMovieLists={userMovieLists}
            onListUpdate={onListUpdate}
          />
        </>
      )}
    </div>
  );
};

export default Profile;