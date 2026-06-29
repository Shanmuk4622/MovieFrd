import React, { useState, useMemo } from 'react';
import { Movie, ListType, UserMovieList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { addMovieToList, removeMovieFromList } from '../supabaseApi';
import { StarIcon, PlusIcon, CheckIcon, XIcon } from './icons';
import { fetchMovieDetailsExtended } from '../api';
import { cn } from '../utils/cn';
import { POSTER_FALLBACK, handleImageError } from '../utils/images';
import Spinner from './ui/Spinner';

interface MovieCardProps {
  movie: Movie;
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  onSelectMovie: (movieId: number) => void;
}

type Action = 'add_watchlist' | 'add_watched' | 'remove';

const overlayButton =
  'flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60';

const MovieCard: React.FC<MovieCardProps> = ({ movie, userMovieLists, onListUpdate, onSelectMovie }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [genres, setGenres] = useState<{ id: number; name: string }[] | null>(null);
  const [loadingGenres, setLoadingGenres] = useState(false);

  const listInfo = useMemo(
    () => userMovieLists.find((item) => item.tmdb_movie_id === movie.id),
    [userMovieLists, movie.id]
  );
  const isInWatchlist = listInfo?.list_type === 'watchlist';
  const isInWatched = listInfo?.list_type === 'watched';

  const handleAction = async (action: Action) => {
    if (!user || loading) return;
    setLoading(true);
    try {
      if (action === 'remove') {
        await removeMovieFromList(user.id, movie.id);
        onListUpdate(`'${movie.title}' removed from your lists`);
      } else {
        const listType: ListType = action === 'add_watched' ? 'watched' : 'watchlist';
        await addMovieToList(user.id, movie.id, listType);
        onListUpdate(
          listType === 'watched'
            ? `'${movie.title}' marked as Watched`
            : `'${movie.title}' added to your Watchlist`
        );
      }
    } catch (error) {
      console.error('Failed to update list', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = async () => {
    if (genres || loadingGenres) return;
    setLoadingGenres(true);
    try {
      const details = await fetchMovieDetailsExtended(movie.id);
      if (details) setGenres(details.genres);
    } catch (error) {
      console.error('Failed to fetch genres for movie card', error);
    } finally {
      setLoadingGenres(false);
    }
  };

  return (
    <div
      className="group relative aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-2xl shadow-card transition-transform duration-300 hover:z-10 hover:scale-[1.04] dark:shadow-card-dark"
      onClick={() => onSelectMovie(movie.id)}
      onMouseEnter={handleMouseEnter}
    >
      <img
        src={movie.posterUrl}
        alt={movie.title}
        loading="lazy"
        onError={handleImageError(POSTER_FALLBACK)}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      <div className="absolute bottom-0 left-0 w-full p-3 text-white">
        <h3 className="truncate text-sm font-bold md:text-base">{movie.title}</h3>
        <div className="mt-1 flex items-center gap-1 text-xs font-semibold">
          <StarIcon className="h-4 w-4 text-amber-400" />
          {movie.rating.toFixed(1)}
        </div>
      </div>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/75 p-3 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="line-clamp-3 cursor-pointer text-center text-base font-bold text-white hover:underline"
          onClick={() => onSelectMovie(movie.id)}
        >
          {movie.title}
        </h3>

        <div className="flex h-7 items-center justify-center">
          {loadingGenres ? (
            <Spinner size="h-4 w-4" className="text-white/60" />
          ) : (
            <div className="flex flex-wrap justify-center gap-1">
              {genres?.slice(0, 2).map((genre) => (
                <span key={genre.id} className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                  {genre.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-1 w-full space-y-2">
          {isInWatched ? (
            <button onClick={() => handleAction('remove')} disabled={loading} className={cn(overlayButton, 'bg-brand-600/90 hover:bg-brand-600')}>
              <XIcon className="h-4 w-4" /> Remove
            </button>
          ) : isInWatchlist ? (
            <>
              <button onClick={() => handleAction('add_watched')} disabled={loading} className={cn(overlayButton, 'bg-emerald-600/90 hover:bg-emerald-600')}>
                <CheckIcon className="h-4 w-4" /> Mark as Watched
              </button>
              <button onClick={() => handleAction('remove')} disabled={loading} className={cn(overlayButton, 'bg-brand-600/90 hover:bg-brand-600')}>
                <XIcon className="h-4 w-4" /> Remove
              </button>
            </>
          ) : (
            <>
              <button onClick={() => handleAction('add_watched')} disabled={loading} className={cn(overlayButton, 'bg-emerald-600/90 hover:bg-emerald-600')}>
                <CheckIcon className="h-4 w-4" /> Watched
              </button>
              <button onClick={() => handleAction('add_watchlist')} disabled={loading} className={cn(overlayButton, 'bg-sky-600/90 hover:bg-sky-600')}>
                <PlusIcon className="h-4 w-4" /> Watchlist
              </button>
            </>
          )}
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Spinner size="h-8 w-8" className="text-white" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieCard;
