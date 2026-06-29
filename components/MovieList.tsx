import React from 'react';
import { Movie, UserMovieList } from '../types';
import MovieCard from './MovieCard';

interface MovieListProps {
  title?: string;
  movies: Movie[];
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  onSelectMovie: (movieId: number) => void;
}

const MovieList: React.FC<MovieListProps> = ({
  title,
  movies,
  userMovieLists,
  onListUpdate,
  onSelectMovie,
}) => (
  <section className="mb-10">
    {title && (
      <h2 className="mb-4 px-4 text-2xl font-bold tracking-tight md:px-0 md:text-3xl">{title}</h2>
    )}
    {movies.length === 0 ? (
      <p className="px-4 text-surface-500 dark:text-surface-400 md:px-0">This list is currently empty.</p>
    ) : (
      <div className="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 pl-4 scrollbar-thin md:pl-0">
        {movies.map((movie) => (
          <div key={movie.id} className="w-40 flex-shrink-0 md:w-48">
            <MovieCard
              movie={movie}
              userMovieLists={userMovieLists}
              onListUpdate={onListUpdate}
              onSelectMovie={onSelectMovie}
            />
          </div>
        ))}
        <div className="w-1 flex-shrink-0 md:w-0" />
      </div>
    )}
  </section>
);

export default MovieList;
