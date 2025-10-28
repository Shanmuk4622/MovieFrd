import React, { useState, useEffect } from 'react';
import { MovieDetail as MovieDetailType } from '../types';
import { fetchMovieDetailsExtended } from '../api';
import { View } from '../App';
import { StarIcon, UserIcon } from './icons';

interface MovieDetailProps {
    movieId: number;
    setView: (view: View) => void;
}

const MovieDetail: React.FC<MovieDetailProps> = ({ movieId, setView }) => {
    const [movie, setMovie] = useState<MovieDetailType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            }
        };
        loadDetails();
    }, [movieId]);

    if (loading) {
        return <div className="flex items-center justify-center h-[calc(100vh-200px)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>;
    }

    if (error || !movie) {
        return <div className="text-center p-8 text-red-400">{error || "Movie not found."}</div>;
    }

    const releaseYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A';

    return (
        <div className="px-4 md:px-0 animate-fade-in">
            <button onClick={() => setView('dashboard')} className="mb-6 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold py-2 px-4 rounded-md transition-colors">
                &larr; Back to Dashboard
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {/* Left Column: Poster */}
                <div className="md:col-span-1 lg:col-span-1">
                    <img src={movie.posterUrl} alt={movie.title} className="w-full h-auto rounded-lg shadow-lg shadow-gray-400/30 dark:shadow-black/30" />
                </div>

                {/* Right Column: Details */}
                <div className="md:col-span-2 lg:col-span-3">
                    <h1 className="text-4xl font-bold">{movie.title} <span className="text-3xl font-light text-gray-500 dark:text-gray-400">({releaseYear})</span></h1>
                    
                    <div className="flex items-center flex-wrap space-x-4 my-3 text-gray-600 dark:text-gray-300">
                        <span>{movie.releaseDate}</span>
                        <span>&bull;</span>
                        <span className="max-w-xs truncate">{movie.genres.map(g => g.name).join(', ')}</span>
                         <div className="flex items-center">
                            <StarIcon className="w-5 h-5 text-yellow-400" />
                            <span className="ml-1 font-semibold">{movie.rating.toFixed(1)}</span>
                        </div>
                    </div>

                    <h2 className="text-2xl font-semibold mt-8 mb-2 border-l-4 border-red-500 pl-3">Synopsis</h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{movie.overview}</p>

                    {movie.trailerUrl && (
                        <>
                            <h2 className="text-2xl font-semibold mt-8 mb-3 border-l-4 border-red-500 pl-3">Trailer</h2>
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

                    <h2 className="text-2xl font-semibold mt-8 mb-3 border-l-4 border-red-500 pl-3">Cast</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {movie.cast.map(member => (
                            <div key={member.id} className="text-center">
                                {member.profileUrl && member.profileUrl.includes('placeholder') ? (
                                    <div className="w-full aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-2">
                                        <UserIcon className="w-10 h-10 text-gray-400 dark:text-gray-500"/>
                                    </div>
                                ) : (
                                    <img src={member.profileUrl!} alt={member.name} className="w-full aspect-[2/3] object-cover rounded-lg mb-2 shadow-md"/>
                                )}
                                <p className="font-bold text-sm">{member.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{member.character}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MovieDetail;