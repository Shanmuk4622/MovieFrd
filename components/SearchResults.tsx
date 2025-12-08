

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
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'popularity' | 'date'>('relevance');

  const filteredAndSortedMovies = useMemo(() => {
    let filtered = movies;
    
    // Apply rating filter
    if (ratingFilter > 0) {
      filtered = filtered.filter(movie => movie.rating >= ratingFilter);
    }
    
    // Apply sorting
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'popularity':
          return b.popularity - a.popularity;
        case 'date':
          const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return dateB - dateA;
        case 'relevance':
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [movies, ratingFilter, sortBy]);
  
  const ratingOptions = [
    { label: 'All', value: 0 },
    { label: '7+', value: 7 },
    { label: '8+', value: 8 },
    { label: '9+', value: 9 },
  ];

  const sortOptions = [
    { label: 'Relevance', value: 'relevance' },
    { label: 'Rating', value: 'rating' },
    { label: 'Popularity', value: 'popularity' },
    { label: 'Newest', value: 'date' },
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
      <div className="flex flex-col gap-4 mb-6">
        {/* Search Results Header */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">
            Search Results for: <span className="text-red-500">{query}</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {filteredAndSortedMovies.length} movie{filteredAndSortedMovies.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Filters & Sorting */}
        {movies.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Rating Filter */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-full">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 px-2">Rating:</span>
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

            {/* Sort Options */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-full">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 px-2">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-gray-600 dark:text-gray-300 text-sm font-semibold focus:outline-none cursor-pointer px-2"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Display */}
      {movies.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 p-8 bg-gray-100 dark:bg-gray-800/50 rounded-lg min-h-[400px] flex flex-col justify-center items-center animate-fade-in">
            <SearchIcon className="w-24 h-24 text-gray-400 dark:text-gray-600 mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No movies found</h3>
            <p className="max-w-md">We couldn't find any movies matching "{query}". Try checking the spelling or searching for a different title.</p>
        </div>
      ) : filteredAndSortedMovies.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 p-8 bg-gray-100 dark:bg-gray-800/50 rounded-lg min-h-[400px] flex flex-col justify-center items-center animate-fade-in">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No movies match your filter</h3>
          <p>Try selecting a different rating or clearing the filter.</p>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center sm:justify-start -m-2">
          {filteredAndSortedMovies.map(movie => (
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