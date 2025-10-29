import { Movie, MovieDetail, CastMember } from './types';

// --- Hardcoded TMDB API Key for Development ---
// WARNING: This token is provided for development purposes in an environment
// where setting environment variables is not feasible. For any production deployment,
// this value MUST be replaced with a secure environment variable.
const TMDB_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwZDExYjAzM2Y3YjQ4ZTdjNzlkMjBlZDRmYzFiNzI4MSIsIm5iZiI6MTc2MTYzNzc5NC42MzYsInN1YiI6IjY5MDA3NWEyYjNjZDBjNjY1MWEzMTQ5YSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.m2CLiwb_qCkf5cjyfxyIqIemyNpUvK3mwLKE7r2TZ1o';
const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const IMAGE_BASE_URL_W200 = 'https://image.tmdb.org/t/p/w200';

// Simple in-memory cache
const movieDetailsCache = new Map<number, Movie>();
const movieDetailsExtendedCache = new Map<number, MovieDetail>();

interface TmdbMovie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  release_date: string;
}

interface TmdbMovieDetail extends TmdbMovie {
    overview: string;
    release_date: string;
    genres: { id: number; name: string }[];
}

interface TmdbCredits {
    cast: {
        id: number;
        name: string;
        character: string;
        profile_path: string | null;
    }[];
}

interface TmdbVideos {
    results: {
        id: string;
        key: string;
        name: string;
        site: string;
        type: string;
    }[];
}

const mapTmdbMovieToMovie = (tmdbMovie: TmdbMovie): Movie => ({
  id: tmdbMovie.id,
  title: tmdbMovie.title,
  posterUrl: tmdbMovie.poster_path ? `${IMAGE_BASE_URL}${tmdbMovie.poster_path}`: 'https://via.placeholder.com/500x750.png?text=No+Image',
  rating: tmdbMovie.vote_average,
  releaseDate: tmdbMovie.release_date,
});

const checkApiKey = () => {
  if (!TMDB_API_KEY) {
    const errorMsg = "TMDB API key is not configured. Please set the TMDB_API_KEY environment variable.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
};

const getFetchOptions = () => ({
    headers: {
        'Authorization': `Bearer ${TMDB_API_KEY}`,
        'Content-Type': 'application/json;charset=utf-8'
    }
});


export const fetchMovies = async (endpoint: string): Promise<Movie[]> => {
  checkApiKey();
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, getFetchOptions());
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
  checkApiKey();
  if (movieDetailsCache.has(movieId)) {
    return movieDetailsCache.get(movieId)!;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/movie/${movieId}`, getFetchOptions());
    if (!response.ok) {
      throw new Error(`Failed to fetch movie details for ID ${movieId}`);
    }
    const data: TmdbMovie = await response.json();
    const movie = mapTmdbMovieToMovie(data);
    movieDetailsCache.set(movieId, movie);
    return movie;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const searchMovies = async (query: string): Promise<Movie[]> => {
  checkApiKey();
  try {
    const response = await fetch(`${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`, getFetchOptions());
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


export const fetchMovieDetailsExtended = async (movieId: number): Promise<MovieDetail | null> => {
    checkApiKey();
    if (movieDetailsExtendedCache.has(movieId)) {
        return movieDetailsExtendedCache.get(movieId)!;
    }
    try {
        const fetchOptions = getFetchOptions();
        const [detailsRes, creditsRes, videosRes] = await Promise.all([
            fetch(`${API_BASE_URL}/movie/${movieId}`, fetchOptions),
            fetch(`${API_BASE_URL}/movie/${movieId}/credits`, fetchOptions),
            fetch(`${API_BASE_URL}/movie/${movieId}/videos`, fetchOptions)
        ]);

        if (!detailsRes.ok || !creditsRes.ok || !videosRes.ok) {
            throw new Error(`Failed to fetch extended details for movie ID ${movieId}`);
        }
        
        const details: TmdbMovieDetail = await detailsRes.json();
        const credits: TmdbCredits = await creditsRes.json();
        const videos: TmdbVideos = await videosRes.json();

        const cast = credits.cast.slice(0, 10).map((c): CastMember => ({
            id: c.id,
            name: c.name,
            character: c.character,
            profileUrl: c.profile_path ? `${IMAGE_BASE_URL_W200}${c.profile_path}` : 'https://via.placeholder.com/200x300.png?text=No+Image',
        }));
        
        const officialTrailer = videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
        const trailerUrl = officialTrailer ? `https://www.youtube.com/embed/${officialTrailer.key}` : null;

        const movieDetail: MovieDetail = {
            id: details.id,
            title: details.title,
            posterUrl: details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : 'https://via.placeholder.com/500x750.png?text=No+Image',
            rating: details.vote_average,
            overview: details.overview,
            releaseDate: details.release_date,
            genres: details.genres,
            cast,
            trailerUrl,
        };
        
        movieDetailsExtendedCache.set(movieId, movieDetail);
        return movieDetail;

    } catch (error) {
        console.error(error);
        return null;
    }
};