import React, { useState, useMemo } from 'react';
import { Movie, UserMovieList } from '../types';
import MovieCard from './MovieCard';
import { SearchIcon } from './icons';
import { cn } from '../utils/cn';
import { EmptyState, Spinner } from './ui';

interface SearchResultsProps {
  query: string;
  movies: Movie[];
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  isLoading: boolean;
  onSelectMovie: (movieId: number) => void;
}

type SortBy = 'relevance' | 'rating' | 'popularity' | 'date';

const ratingOptions = [
  { label: 'All', value: 0 },
  { label: '7+', value: 7 },
  { label: '8+', value: 8 },
  { label: '9+', value: 9 },
];

const sortOptions: { label: string; value: SortBy }[] = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Rating', value: 'rating' },
  { label: 'Popularity', value: 'popularity' },
  { label: 'Newest', value: 'date' },
];

const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  movies,
  userMovieLists,
  onListUpdate,
  isLoading,
  onSelectMovie,
}) => {
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>('relevance');

  const filteredAndSorted = useMemo(() => {
    let result = ratingFilter > 0 ? movies.filter((m) => m.rating >= ratingFilter) : [...movies];
    result = [...result];
    result.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'popularity':
          return b.popularity - a.popularity;
        case 'date': {
          const dA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const dB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return dB - dA;
        }
        default:
          return 0;
      }
    });
    return result;
  }, [movies, ratingFilter, sortBy]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Spinner size="h-12 w-12" className="text-brand-500" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-0">
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Search results for <span className="text-brand-500">{query}</span>
          </h2>
          <p className="mt-1 text-surface-500 dark:text-surface-400">
            {filteredAndSorted.length} movie{filteredAndSorted.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {movies.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-2 rounded-full bg-surface-100 p-1.5 dark:bg-surface-800/60">
              <span className="px-2 text-xs font-semibold text-surface-500 dark:text-surface-400">Rating</span>
              {ratingOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setRatingFilter(option.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-semibold transition-colors sm:px-4',
                    ratingFilter === option.value
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-surface-600 hover:bg-surface-200 dark:text-surface-300 dark:hover:bg-surface-700'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-full bg-surface-100 px-3 py-1.5 dark:bg-surface-800/60">
              <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">Sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="cursor-pointer bg-transparent text-sm font-semibold text-surface-700 focus:outline-none dark:text-surface-300"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {movies.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-16 w-16" />}
          title="No movies found"
          description={`We couldn't find any movies matching "${query}". Try checking the spelling or searching for a different title.`}
          className="min-h-[400px]"
        />
      ) : filteredAndSorted.length === 0 ? (
        <EmptyState
          title="No movies match your filter"
          description="Try selecting a different rating or clearing the filter."
          className="min-h-[400px]"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredAndSorted.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              userMovieLists={userMovieLists}
              onListUpdate={onListUpdate}
              onSelectMovie={onSelectMovie}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
