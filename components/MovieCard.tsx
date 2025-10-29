import React, { useState, useMemo } from 'react';
// FIX: UserMovieList is now imported from types.ts
import { Movie, UserMovieList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addMovieToList, removeMovieFromList } from '../supabaseApi';
import { StarIcon, PlusIcon, CheckIcon, XIcon } from './icons';

interface MovieCardProps {
  movie: Movie;
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  onSelectMovie: (movieId: number) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, userMovieLists, onListUpdate, onSelectMovie }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const listInfo = useMemo(() => {
    return userMovieLists.find(item => item.tmdb_movie_id === movie.id);
  }, [userMovieLists, movie.id]);

  const isInWatchlist = listInfo?.list_type === 'watchlist';
  const isInWatched = listInfo?.list_type === 'watched';

  const handleAction = async (action: 'add_watchlist' | 'add_watched' | 'remove') => {
    if (!user || loading) return;

    setLoading(true);
    try {
      if (action === 'remove') {
        await removeMovieFromList(user.id, movie.id);
        onListUpdate(`'${movie.title}' removed from your lists`);
      } else if (action === 'add_watchlist') {
        await addMovieToList(user.id, movie.id, 'watchlist');
        onListUpdate(`'${movie.title}' added to your Watchlist`);
      } else if (action === 'add_watched') {
        await addMovieToList(user.id, movie.id, 'watched');
        onListUpdate(`'${movie.title}' marked as Watched`);
      }
    } catch (error) {
      console.error("Failed to update list", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="group relative flex-shrink-0 w-full rounded-lg overflow-hidden shadow-lg transform transition-transform duration-300 hover:scale-105 hover:z-10 cursor-pointer aspect-[2/3]"
      onClick={() => onSelectMovie(movie.id)}
    >
      <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
      
      {/* Title and Rating */}
      <div className="absolute bottom-0 left-0 p-3 w-full text-white">
        <h3 className="font-bold text-sm md:text-base truncate">{movie.title}</h3>
        <div className="flex items-center mt-1">
          <StarIcon className="w-4 h-4 text-yellow-400" />
          <span className="ml-1 text-xs font-semibold">{movie.rating.toFixed(1)}</span>
        </div>
      </div>
       
      {/* Hover Overlay with Actions */}
      <div 
        className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        onClick={(e) => e.stopPropagation()} // Prevent card click when clicking overlay buttons
      >
        <h3 
          className="font-bold text-base text-center line-clamp-3 mb-3 cursor-pointer hover:underline"
          onClick={() => onSelectMovie(movie.id)}
        >
          {movie.title}
        </h3>
        <div className="space-y-2 w-full">
            {isInWatched ? (
                <button
                    onClick={() => handleAction('remove')}
                    disabled={loading}
                    className="w-full flex items-center justify-center bg-red-600/80 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-md text-xs transition-colors"
                >
                    <XIcon className="w-4 h-4 mr-1" /> Remove
                </button>
            ) : isInWatchlist ? (
                 <>
                    <button
                        onClick={() => handleAction('add_watched')}
                        disabled={loading}
                        className="w-full flex items-center justify-center bg-green-600/80 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-md text-xs transition-colors"
                    >
                        <CheckIcon className="w-4 h-4 mr-1" /> Mark as Watched
                    </button>
                     <button
                        onClick={() => handleAction('remove')}
                        disabled={loading}
                        className="w-full flex items-center justify-center bg-red-600/80 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-md text-xs transition-colors"
                    >
                        <XIcon className="w-4 h-4 mr-1" /> Remove
                    </button>
                </>
            ) : (
                <>
                    <button
                        onClick={() => handleAction('add_watched')}
                        disabled={loading}
                        className="w-full flex items-center justify-center bg-green-600/80 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-md text-xs transition-colors"
                    >
                         <CheckIcon className="w-4 h-4 mr-1"/> Watched
                    </button>
                    <button
                        onClick={() => handleAction('add_watchlist')}
                        disabled={loading}
                        className="w-full flex items-center justify-center bg-blue-600/80 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-md text-xs transition-colors"
                    >
                        <PlusIcon className="w-4 h-4 mr-1"/> Watchlist
                    </button>
                </>
            )}
        </div>
        {loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>}
      </div>
    </div>
  );
};

export default MovieCard;