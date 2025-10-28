import React from 'react';
import { Movie } from '../types';
import MovieCard from './MovieCard';
import { UserMovieList } from '../supabaseApi';

interface SearchResultsProps {
  query: string;
  movies: Movie[];
  userMovieLists: UserMovieList[];
  onListUpdate: () => void;
  isLoading: boolean;
  onSelectMovie: (movieId: number) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ query, movies, userMovieLists, onListUpdate, isLoading, onSelectMovie }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-0">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">
        Search Results for: <span className="text-red-500">{query}</span>
      </h2>

      {movies.length > 0 ? (
        <div className="flex flex-wrap justify-center sm:justify-start -m-2">
          {movies.map(movie => (
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
      ) : (
        <div className="text-center text-gray-400 p-8 bg-gray-800/50 rounded-lg min-h-[400px] flex flex-col justify-center items-center">
            <h3 className="text-2xl font-bold text-white mb-2">No movies found</h3>
            <p className="max-w-md">We couldn't find any movies matching "{query}". Try checking the spelling or searching for a different title.</p>
        </div>
      )}
    </div>
  );
};

export default SearchResults;