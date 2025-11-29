import React, { useState, useEffect, useMemo, useRef } from 'react';
// FIX: UserMovieList is now imported from types.ts
import { MovieDetail as MovieDetailType, UserMovieList } from '../types';
import { fetchMovieDetailsExtended } from '../api';
import { StarIcon, UserIcon, XIcon, PlusIcon, CheckIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { addMovieToList, removeMovieFromList } from '../supabaseApi';
import { formatTimeAgo } from '../utils';

interface MovieDetailProps {
    movieId: number;
    onClose: () => void;
    userMovieLists: UserMovieList[];
    onListUpdate: (message: string) => void;
    onSelectMovie: (movieId: number) => void;
}

const MovieDetail: React.FC<MovieDetailProps> = ({ movieId, onClose, userMovieLists, onListUpdate, onSelectMovie }) => {
    const [movie, setMovie] = useState<MovieDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const [loadingAction, setLoadingAction] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const details = await fetchMovieDetailsExtended(movieId);
                if (details) {
                    setMovie(details);
                } else {
                    setError("Could not find details for this movie.");
                }
            } catch (err) {
                setError("Failed to fetch movie details.");
                console.error(err);
            } finally {
                setLoading(false);
                // Reset scroll position when movie changes
                if (containerRef.current) {
                    containerRef.current.scrollTop = 0;
                }
            }
        };
        loadDetails();
    }, [movieId]);

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

    const listInfo = useMemo(() => {
        return userMovieLists.find(item => item.tmdb_movie_id === movieId);
    }, [userMovieLists, movieId]);

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
            } else if (action === 'add_watched') {
                await addMovieToList(user.id, movieId, 'watched');
                onListUpdate(`'${movie.title}' marked as Watched`);
            }
        } catch (error) {
            console.error("Failed to update list from details", error);
        } finally {
            setLoadingAction(false);
        }
    };

    const renderContent = () => {
        if (loading) {
            return <div className="flex items-center justify-center h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>;
        }

        if (error || !movie) {
            return <div className="text-center p-8 text-red-400">{error || "Movie not found."}</div>;
        }

        const releaseYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A';

        return (
            <div className="p-4 sm:p-6 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {/* Left Column: Poster */}
                    <div className="md:col-span-1 lg:col-span-1">
                        <img src={movie.posterUrl} alt={movie.title} className="w-full h-auto rounded-lg shadow-lg shadow-gray-400/30 dark:shadow-black/30 sticky top-4" />
                    </div>

                    {/* Right Column: Details */}
                    <div className="md:col-span-2 lg:col-span-3">
                        <h1 className="text-2xl md:text-3xl font-bold">{movie.title} <span className="text-xl md:text-2xl font-light text-gray-500 dark:text-gray-400">({releaseYear})</span></h1>
                        
                        <div className="flex items-center flex-wrap gap-x-4 mt-3 text-gray-600 dark:text-gray-300">
                            <span>{movie.releaseDate}</span>
                            <span>&bull;</span>
                            <div className="flex items-center">
                                <StarIcon className="w-5 h-5 text-yellow-400" />
                                <span className="ml-1 font-semibold">{movie.rating.toFixed(1)}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                            {movie.genres.map(g => (
                                <button 
                                  key={g.id} 
                                  className="bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 dark:border-red-500/40 text-red-600 dark:text-red-300 text-xs font-semibold px-3 py-1 rounded-full transition-colors duration-200 hover:bg-red-500/20 dark:hover:bg-red-500/30 cursor-default"
                                >
                                    {g.name}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex items-center justify-between mt-6 mb-2">
                          <h2 className="text-xl font-semibold border-l-4 border-red-500 pl-3">Synopsis</h2>
                          <div className="flex items-center space-x-2">
                            {isInWatched ? (
                              <button
                                onClick={() => handleAction('remove')}
                                disabled={loadingAction}
                                className="flex items-center justify-center bg-red-600/80 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-md text-xs transition-colors disabled:opacity-50"
                              >
                                <XIcon className="w-4 h-4 mr-1" /> Remove
                              </button>
                            ) : isInWatchlist ? (
                              <>
                                <button
                                  onClick={() => handleAction('add_watched')}
                                  disabled={loadingAction}
                                  className="flex items-center justify-center bg-green-600/80 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-md text-xs transition-colors disabled:opacity-50"
                                >
                                  <CheckIcon className="w-4 h-4 mr-1" /> Watched
                                </button>
                                <button
                                  onClick={() => handleAction('remove')}
                                  disabled={loadingAction}
                                  className="flex items-center justify-center bg-red-600/80 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-md text-xs transition-colors disabled:opacity-50"
                                >
                                  <XIcon className="w-4 h-4 mr-1" /> Remove
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleAction('add_watched')}
                                  disabled={loadingAction}
                                  className="flex items-center justify-center bg-green-600/80 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-md text-xs transition-colors disabled:opacity-50"
                                >
                                  <CheckIcon className="w-4 h-4 mr-1" /> Watched
                                </button>
                                <button
                                  onClick={() => handleAction('add_watchlist')}
                                  disabled={loadingAction}
                                  className="flex items-center justify-center bg-blue-600/80 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-md text-xs transition-colors disabled:opacity-50"
                                >
                                  <PlusIcon className="w-4 h-4 mr-1" /> Watchlist
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed max-h-36 overflow-y-auto">{movie.overview}</p>

                        {movie.trailerUrl && (
                            <>
                                <h2 className="text-xl font-semibold mt-6 mb-3 border-l-4 border-red-500 pl-3">Trailer</h2>
                                <div className="relative pt-[56.25%] rounded-lg overflow-hidden shadow-lg shadow-gray-400/30 dark:shadow-black/30">
                                    <iframe 
                                        src={movie.trailerUrl}
                                        title={`${movie.title} Trailer`}
                                        frameBorder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                        className="absolute top-0 left-0 w-full h-full"
                                    ></iframe>
                                </div>
                            </>
                        )}

                        <h2 className="text-xl font-semibold mt-6 mb-3 border-l-4 border-red-500 pl-3">Cast</h2>
                        <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
                            {movie.cast.map(member => (
                                <div key={member.id} className="text-center w-24 md:w-28 flex-shrink-0">
                                    {member.profileUrl && member.profileUrl.includes('placeholder') ? (
                                        <div className="w-full aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-2">
                                            <UserIcon className="w-8 h-8 text-gray-400 dark:text-gray-500"/>
                                        </div>
                                    ) : (
                                        <img src={member.profileUrl!} alt={member.name} className="w-full aspect-[2/3] object-cover rounded-lg mb-2 shadow-md"/>
                                    )}
                                    <p className="font-bold text-sm truncate">{member.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.character}</p>
                                </div>
                            ))}
                        </div>

                        {/* Similar Movies Section */}
                        {movie.similar && movie.similar.length > 0 && (
                            <>
                                <h2 className="text-xl font-semibold mt-6 mb-3 border-l-4 border-red-500 pl-3">You Might Also Like</h2>
                                <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
                                    {movie.similar.map(sim => (
                                        <button 
                                            key={sim.id} 
                                            onClick={() => onSelectMovie(sim.id)}
                                            className="text-left w-32 md:w-36 flex-shrink-0 group"
                                        >
                                            <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2 shadow-md group-hover:shadow-lg transition-all group-hover:scale-105">
                                                <img 
                                                    src={sim.posterUrl} 
                                                    alt={sim.title} 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/200x300.png?text=No+Image'; }}
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-white text-xs font-bold px-2 py-1 border border-white rounded-full">View</span>
                                                </div>
                                            </div>
                                            <p className="font-bold text-xs truncate group-hover:text-red-500 transition-colors">{sim.title}</p>
                                            <div className="flex items-center mt-1">
                                                <StarIcon className="w-3 h-3 text-yellow-400" />
                                                <span className="ml-1 text-[10px] text-gray-500 dark:text-gray-400">{sim.rating.toFixed(1)}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Reviews Section */}
                        {movie.reviews && movie.reviews.length > 0 && (
                             <>
                                <h2 className="text-xl font-semibold mt-6 mb-3 border-l-4 border-red-500 pl-3">User Reviews</h2>
                                <div className="space-y-4">
                                    {movie.reviews.map(review => (
                                        <div key={review.id} className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    {review.avatarUrl ? (
                                                        <img src={review.avatarUrl} alt={review.author} className="w-8 h-8 rounded-full object-cover" onError={(e) => {e.currentTarget.style.display = 'none'}} />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{review.author.charAt(0).toUpperCase()}</span>
                                                        </div>
                                                    )}
                                                    <span className="font-bold text-sm">{review.author}</span>
                                                </div>
                                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                    {review.rating && (
                                                        <div className="flex items-center mr-2 bg-yellow-500/20 px-1.5 py-0.5 rounded">
                                                            <StarIcon className="w-3 h-3 text-yellow-500 mr-1" />
                                                            <span className="font-bold text-yellow-600 dark:text-yellow-400">{review.rating}/10</span>
                                                        </div>
                                                    )}
                                                    <span>{formatTimeAgo(review.createdAt)}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4 leading-relaxed italic">"{review.content}"</p>
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
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                ref={containerRef}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-5xl h-auto max-h-[90vh] overflow-y-auto relative scroll-smooth"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-gray-100 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-600 z-10 transition-colors"
                    aria-label="Close movie details"
                >
                    <XIcon className="w-5 h-5" />
                </button>
                {renderContent()}
            </div>
        </div>
    );
};

export default MovieDetail;