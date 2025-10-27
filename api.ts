import { Movie } from './types';

// IMPORTANT: Replace this with your actual TMDB API key.
// You can get one for free by signing up at https://www.themoviedb.org/.
const TMDB_API_KEY = 'YOUR_TMDB_API_KEY_HERE'; 
const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface TmdbMovie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
}

const mapTmdbMovieToMovie = (tmdbMovie: TmdbMovie): Movie => ({
  id: tmdbMovie.id,
  title: tmdbMovie.title,
  posterUrl: tmdbMovie.poster_path ? `${IMAGE_BASE_URL}${tmdbMovie.poster_path}`: 'https://via.placeholder.com/500x750.png?text=No+Image',
  rating: tmdbMovie.vote_average,
});

export const fetchMovies = async (endpoint: string): Promise<Movie[]> => {
  if (TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
    console.warn("Please replace 'YOUR_TMDB_API_KEY_HERE' in api.ts with your actual TMDB API key.");
    return [];
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch movies from TMDB: ${response.statusText}`);
    }
    const data = await response.json();
    const movies: TmdbMovie[] = data.results;
    return movies.map(mapTmdbMovieToMovie);
  } catch (error) {
    console.error(error);
    return []; // Return an empty array on error to prevent app crash
  }
};

export const fetchMovieDetails = async (movieId: number): Promise<Movie | null> => {
  if (TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch movie details for ID ${movieId}`);
    }
    const data: TmdbMovie = await response.json();
    return mapTmdbMovieToMovie(data);
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const searchMovies = async (query: string): Promise<Movie[]> => {
  if (TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
    console.warn("Please replace 'YOUR_TMDB_API_KEY_HERE' in api.ts with your actual TMDB API key.");
    return [];
  }

  try {
    const response = await fetch(`${API_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`Failed to search movies on TMDB: ${response.statusText}`);
    }
    const data = await response.json();
    const movies: TmdbMovie[] = data.results;
    return movies.map(mapTmdbMovieToMovie);
  } catch (error) {
    console.error(error);
    return [];
  }
};
