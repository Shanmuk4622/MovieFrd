import React from 'react';
// FIX: UserMovieList is now imported from types.ts
import { Movie, UserMovieList } from '../types';
import MovieCard from './MovieCard';

interface MovieListProps {
  title?: string;
  movies: Movie[];
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  onSelectMovie: (movieId: number) => void;
}

const MovieList: React.FC<MovieListProps> = ({ title, movies, userMovieLists, onListUpdate, onSelectMovie }) => {
  if (movies.length === 0) {
    return (
      <section className="mb-12">
        {title && <h2 className="text-2xl md:text-3xl font-bold mb-4 px-4 md:px-0">{title}</h2>}
        <div className="px-4 md:px-0 text-gray-500 dark:text-gray-400">
          This list is currently empty.
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      {title && <h2 className="text-2xl md:text-3xl font-bold mb-4 px-4 md:px-0">{title}</h2>}
      <div className="flex space-x-4 overflow-x-auto overflow-y-hidden pb-4 pl-4 md:pl-0">
        {movies.map(movie => (
          <div key={movie.id} className="w-40 md:w-48 flex-shrink-0">
            <MovieCard 
              movie={movie} 
              userMovieLists={userMovieLists}
              onListUpdate={onListUpdate}
              onSelectMovie={onSelectMovie}
            />
          </div>
        ))}
        {/* Ghost element for end padding */}
        <div className="flex-shrink-0 w-1 md:w-0"></div>
      </div>
    </section>
  );
};

export default MovieList;