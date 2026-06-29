import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MovieDetailData, UserMovieList, MovieReview } from '../types';
import { fetchMovieDetailsExtended } from '../api';
import { StarIcon, XIcon, PlusIcon, CheckIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import {
  addMovieToList,
  removeMovieFromList,
  getUserReview,
  addOrUpdateReview,
  getMovieReviews,
} from '../supabaseApi';
import { formatTimeAgo } from '../utils';
import { cn } from '../utils/cn';
import { POSTER_FALLBACK, PROFILE_FALLBACK, handleImageError } from '../utils/images';
import ReviewModal from './ReviewModal';
import { Avatar, Badge, IconButton, Spinner } from './ui';

interface MovieDetailProps {
  movieId: number;
  onClose: () => void;
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  onSelectMovie: (movieId: number) => void;
  onActivityRefresh?: () => void;
}

const actionButton =
  'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50';

const sectionHeading = 'mt-6 mb-3 border-l-4 border-brand-500 pl-3 text-xl font-semibold';

const MovieDetail: React.FC<MovieDetailProps> = ({
  movieId,
  onClose,
  userMovieLists,
  onListUpdate,
  onSelectMovie,
  onActivityRefresh,
}) => {
  const { user } = useAuth();
  const [movie, setMovie] = useState<MovieDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userReview, setUserReview] = useState<MovieReview | null>(null);
  const [dbReviews, setDbReviews] = useState<MovieReview[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const details = await fetchMovieDetailsExtended(movieId);
        if (details) setMovie(details);
        else setError('Could not find details for this movie.');

        if (user) setUserReview(await getUserReview(user.id, movieId));
        setDbReviews(await getMovieReviews(movieId));
      } catch (err) {
        setError('Failed to fetch movie details.');
        console.error(err);
      } finally {
        setLoading(false);
        if (containerRef.current) containerRef.current.scrollTop = 0;
      }
    };
    load();
  }, [movieId, user]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const listInfo = useMemo(
    () => userMovieLists.find((item) => item.tmdb_movie_id === movieId),
    [userMovieLists, movieId]
  );
  const isInWatchlist = listInfo?.list_type === 'watchlist';
  const isInWatched = listInfo?.list_type === 'watched';

  const handleAction = async (action: 'add_watchlist' | 'add_watched' | 'remove') => {
    if (!user || loadingAction || !movie) return;
    setLoadingAction(true);
    try {
      if (action === 'remove') {
        await removeMovieFromList(user.id, movieId);
        onListUpdate(`'${movie.title}' removed from your lists`);
      } else if (action === 'add_watchlist') {
        await addMovieToList(user.id, movieId, 'watchlist');
        onListUpdate(`'${movie.title}' added to your Watchlist`);
      } else {
        await addMovieToList(user.id, movieId, 'watched');
        onListUpdate(`'${movie.title}' marked as Watched`);
      }
    } catch (err) {
      console.error('Failed to update list from details', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReviewSubmit = async (rating: number, reviewText: string) => {
    if (!user || !movie) return;
    const review = await addOrUpdateReview(user.id, movieId, rating, reviewText);
    const wasExisting = !!userReview;
    setUserReview(review);
    setDbReviews(await getMovieReviews(movieId));
    onActivityRefresh?.();
    onListUpdate(`Review for '${movie.title}' ${wasExisting ? 'updated' : 'submitted'} successfully!`);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-[50vh] items-center justify-center">
          <Spinner size="h-12 w-12" className="text-brand-500" />
        </div>
      );
    }
    if (error || !movie) {
      return <div className="p-8 text-center text-brand-500">{error || 'Movie not found.'}</div>;
    }

    const releaseYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A';

    return (
      <div className="p-4 pb-20 sm:p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
          <div className="md:col-span-1">
            <img
              src={movie.posterUrl}
              alt={movie.title}
              onError={handleImageError(POSTER_FALLBACK)}
              className="sticky top-4 h-auto w-full rounded-2xl shadow-card dark:shadow-card-dark"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <h1 className="text-2xl font-bold md:text-3xl">
              {movie.title}{' '}
              <span className="text-xl font-light text-surface-500 dark:text-surface-400 md:text-2xl">
                ({releaseYear})
              </span>
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 text-surface-600 dark:text-surface-300">
              <span>{movie.releaseDate}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <StarIcon className="h-5 w-5 text-amber-400" />
                <span className="font-semibold">{movie.rating.toFixed(1)}</span>
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {movie.genres.map((g) => (
                <Badge key={g.id} tone="brand">
                  {g.name}
                </Badge>
              ))}
            </div>

            <div className="mb-2 mt-6 flex flex-wrap items-center justify-between gap-2">
              <h2 className="border-l-4 border-brand-500 pl-3 text-xl font-semibold">Synopsis</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowReviewModal(true)}
                  disabled={loadingAction}
                  className={cn(actionButton, 'bg-purple-600/90 hover:bg-purple-600')}
                >
                  <StarIcon className="h-4 w-4" />
                  {userReview ? `${userReview.rating}/10` : 'Write Review'}
                </button>

                {isInWatched ? (
                  <button onClick={() => handleAction('remove')} disabled={loadingAction} className={cn(actionButton, 'bg-brand-600/90 hover:bg-brand-600')}>
                    <XIcon className="h-4 w-4" /> Remove
                  </button>
                ) : isInWatchlist ? (
                  <>
                    <button onClick={() => handleAction('add_watched')} disabled={loadingAction} className={cn(actionButton, 'bg-emerald-600/90 hover:bg-emerald-600')}>
                      <CheckIcon className="h-4 w-4" /> Watched
                    </button>
                    <button onClick={() => handleAction('remove')} disabled={loadingAction} className={cn(actionButton, 'bg-brand-600/90 hover:bg-brand-600')}>
                      <XIcon className="h-4 w-4" /> Remove
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleAction('add_watched')} disabled={loadingAction} className={cn(actionButton, 'bg-emerald-600/90 hover:bg-emerald-600')}>
                      <CheckIcon className="h-4 w-4" /> Watched
                    </button>
                    <button onClick={() => handleAction('add_watchlist')} disabled={loadingAction} className={cn(actionButton, 'bg-sky-600/90 hover:bg-sky-600')}>
                      <PlusIcon className="h-4 w-4" /> Watchlist
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="max-h-36 overflow-y-auto leading-relaxed text-surface-700 scrollbar-thin dark:text-surface-300">
              {movie.overview}
            </p>

            {movie.trailerUrl && (
              <>
                <h2 className={sectionHeading}>Trailer</h2>
                <div className="relative overflow-hidden rounded-2xl pt-[56.25%] shadow-card dark:shadow-card-dark">
                  <iframe
                    src={movie.trailerUrl}
                    title={`${movie.title} Trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute left-0 top-0 h-full w-full"
                  />
                </div>
              </>
            )}

            <h2 className={sectionHeading}>Cast</h2>
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-thin sm:-mx-6 sm:px-6">
              {movie.cast.map((member) => (
                <div key={member.id} className="w-24 flex-shrink-0 text-center md:w-28">
                  <img
                    src={member.profileUrl || PROFILE_FALLBACK}
                    alt={member.name}
                    onError={handleImageError(PROFILE_FALLBACK)}
                    className="mb-2 aspect-[2/3] w-full rounded-xl object-cover shadow-md"
                  />
                  <p className="truncate text-sm font-bold">{member.name}</p>
                  <p className="truncate text-xs text-surface-500 dark:text-surface-400">{member.character}</p>
                </div>
              ))}
            </div>

            {movie.similar.length > 0 && (
              <>
                <h2 className={sectionHeading}>You Might Also Like</h2>
                <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-thin sm:-mx-6 sm:px-6">
                  {movie.similar.map((sim) => (
                    <button key={sim.id} onClick={() => onSelectMovie(sim.id)} className="group w-32 flex-shrink-0 text-left md:w-36">
                      <div className="relative mb-2 aspect-[2/3] overflow-hidden rounded-xl shadow-md transition-transform group-hover:scale-[1.04]">
                        <img
                          src={sim.posterUrl}
                          alt={sim.title}
                          onError={handleImageError(POSTER_FALLBACK)}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="truncate text-xs font-bold transition-colors group-hover:text-brand-500">{sim.title}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-surface-500 dark:text-surface-400">
                        <StarIcon className="h-3 w-3 text-amber-400" /> {sim.rating.toFixed(1)}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {dbReviews.length > 0 && (
              <>
                <h2 className={sectionHeading}>User Reviews ({dbReviews.length})</h2>
                <div className="space-y-4">
                  {dbReviews.map((review) => (
                    <div key={review.id} className="rounded-xl bg-surface-100 p-4 dark:bg-surface-800/60">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar src={review.profiles?.avatar_url} name={review.profiles?.username} size="h-8 w-8" />
                          <span className="text-sm font-bold">{review.profiles?.username || 'Anonymous'}</span>
                          {review.user_id === user?.id && (
                            <span className="text-xs font-medium text-purple-500">(You)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                          <Badge tone="amber">
                            <StarIcon className="h-3 w-3" /> {review.rating}/10
                          </Badge>
                          <span>{formatTimeAgo(review.created_at)}</span>
                        </div>
                      </div>
                      {review.review_text && (
                        <p className="text-sm italic leading-relaxed text-surface-700 dark:text-surface-300">
                          “{review.review_text}”
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {movie.reviews.length > 0 && (
              <>
                <h2 className="mb-3 mt-6 border-l-4 border-sky-500 pl-3 text-xl font-semibold">TMDB Reviews</h2>
                <div className="space-y-4">
                  {movie.reviews.map((review) => (
                    <div key={review.id} className="rounded-xl bg-surface-100 p-4 dark:bg-surface-800/60">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar src={review.avatarUrl} name={review.author} size="h-8 w-8" />
                          <span className="text-sm font-bold">{review.author}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                          {review.rating != null && (
                            <Badge tone="amber">
                              <StarIcon className="h-3 w-3" /> {review.rating}/10
                            </Badge>
                          )}
                          <span>{formatTimeAgo(review.createdAt)}</span>
                        </div>
                      </div>
                      <p className="line-clamp-4 text-sm italic leading-relaxed text-surface-700 dark:text-surface-300">
                        “{review.content}”
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in-fast"
        onClick={onClose}
        role="presentation"
      >
        <div
          ref={containerRef}
          className="card-surface relative h-auto max-h-[90vh] w-full max-w-5xl overflow-y-auto scroll-smooth scrollbar-thin animate-scale-in"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <IconButton
            aria-label="Close movie details"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 bg-surface-100/90 dark:bg-surface-800/90"
          >
            <XIcon className="h-5 w-5" />
          </IconButton>
          {renderContent()}
        </div>
      </div>

      {showReviewModal && movie && (
        <ReviewModal
          movie={{
            id: movie.id,
            title: movie.title,
            posterUrl: movie.posterUrl,
            rating: movie.rating,
            releaseDate: movie.releaseDate,
            popularity: movie.popularity,
          }}
          existingReview={userReview}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
        />
      )}
    </>
  );
};

export default MovieDetail;
