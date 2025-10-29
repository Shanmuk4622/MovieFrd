

import React, { useState, useMemo } from 'react';
// FIX: UserMovieList is now imported from types.ts
import { Movie, UserMovieList } from '../types';
import MovieCard from './MovieCard';
import { SearchIcon } from './icons';

interface SearchResultsProps {
  query: string;
  movies: Movie[];
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  isLoading: boolean;
  onSelectMovie: (movieId: number) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ query, movies, userMovieLists, onListUpdate, isLoading, onSelectMovie }) => {
  const [ratingFilter, setRatingFilter] = useState<number>(0); // 0 for all

  const filteredMovies = useMemo(() => {
    if (ratingFilter === 0) {
      return movies;
    }
    return movies.filter(movie => movie.rating >= ratingFilter);
  }, [movies, ratingFilter]);
  
  const ratingOptions = [
    { label: 'All', value: 0 },
    { label: '7+', value: 7 },
    { label: '8+', value: 8 },
    { label: '9+', value: 9 },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h2 className="text-2xl md:text-3xl font-bold">
          Search Results for: <span className="text-red-500">{query}</span>
        </h2>
        
        {movies.length > 0 && (
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-full self-start md:self-center">
            {ratingOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setRatingFilter(option.value)}
                className={`px-3 sm:px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                  ratingFilter === option.value
                    ? 'bg-red-600 text-white shadow'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {movies.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 p-8 bg-gray-100 dark:bg-gray-800/50 rounded-lg min-h-[400px] flex flex-col justify-center items-center animate-fade-in">
            <SearchIcon className="w-24 h-24 text-gray-400 dark:text-gray-600 mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No movies found</h3>
            <p className="max-w-md">We couldn't find any movies matching "{query}". Try checking the spelling or searching for a different title.</p>
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 p-8 bg-gray-100 dark:bg-gray-800/50 rounded-lg min-h-[400px] flex flex-col justify-center items-center animate-fade-in">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No movies match your filter</h3>
          <p>Try selecting a different rating or clearing the filter.</p>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center sm:justify-start -m-2">
          {filteredMovies.map(movie => (
            <div key={movie.id} className="p-2 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-1/6">
                 <MovieCard 
                    movie={movie} 
                    userMovieLists={userMovieLists}
                    onListUpdate={onListUpdate}
                    onSelectMovie={onSelectMovie}
                />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;