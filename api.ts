import { Movie, MovieDetail, CastMember, Review } from './types';

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
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  popularity: number;
}

interface TmdbMovieDetail extends TmdbMovie {
    overview: string;
    title: string;
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

interface TmdbReviews {
    results: {
        id: string;
        author: string;
        content: string;
        created_at: string;
        author_details: {
            rating: number | null;
            avatar_path: string | null;
        };
    }[];
}

const mapTmdbMovieToMovie = (tmdbMovie: TmdbMovie): Movie => ({
  id: tmdbMovie.id,
  title: tmdbMovie.title || tmdbMovie.name || 'Untitled',
  posterUrl: tmdbMovie.poster_path ? `${IMAGE_BASE_URL}${tmdbMovie.poster_path}`: 'https://via.placeholder.com/500x750.png?text=No+Image',
  rating: tmdbMovie.vote_average,
  releaseDate: tmdbMovie.release_date || tmdbMovie.first_air_date,
  popularity: tmdbMovie.popularity,
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
    const mappedMovies = movies.map(mapTmdbMovieToMovie);

    // Sort results: newer movies first, then by popularity.
    mappedMovies.sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate) : new Date(0);
        const dateB = b.releaseDate ? new Date(b.releaseDate) : new Date(0);

        if (dateA.getTime() !== dateB.getTime()) {
            return dateB.getTime() - dateA.getTime(); // Descending for date
        }

        return b.popularity - a.popularity; // Descending for popularity
    });
    
    return mappedMovies;
  } catch (error) {
    console.error(error);
    return [];
  }
};

// Advanced search with sorting and filtering
export const advancedSearchMovies = async (
  query: string,
  sortBy: 'relevance' | 'rating' | 'popularity' | 'date' = 'relevance'
): Promise<Movie[]> => {
  checkApiKey();
  try {
    const response = await fetch(`${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`, getFetchOptions());
    if (!response.ok) {
      throw new Error(`Failed to search movies on TMDB: ${response.statusText}`);
    }
    const data = await response.json();
    const movies: TmdbMovie[] = data.results;
    const mappedMovies = movies.map(mapTmdbMovieToMovie);

    // Sort based on selected criteria
    mappedMovies.sort((a, b) => {
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
          // TMDB already returns in relevance order
          return 0;
      }
    });
    
    return mappedMovies;
  } catch (error) {
    console.error(error);
    return [];
  }
};

// Search by person (actor, director, etc.)
export const searchPerson = async (query: string): Promise<any[]> => {
  checkApiKey();
  try {
    const response = await fetch(`${API_BASE_URL}/search/person?query=${encodeURIComponent(query)}`, getFetchOptions());
    if (!response.ok) {
      throw new Error(`Failed to search person on TMDB: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

// Get movies by a specific person (actor/director)
export const getMoviesByPerson = async (personId: number): Promise<Movie[]> => {
  checkApiKey();
  try {
    const response = await fetch(`${API_BASE_URL}/person/${personId}/movie_credits`, getFetchOptions());
    if (!response.ok) {
      throw new Error(`Failed to fetch movies for person: ${response.statusText}`);
    }
    const data = await response.json();
    const movies: TmdbMovie[] = data.cast || [];
    return movies
      .filter(m => m.poster_path) // Only include movies with posters
      .map(mapTmdbMovieToMovie)
      .sort((a, b) => (b.popularity - a.popularity));
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
        
        // Helper to safely fetch optional resources without breaking the main load
        const safeFetch = (url: string) => fetch(url, fetchOptions).then(res => res.ok ? res.json() : null).catch(() => null);

        // Main details (required)
        const detailsRes = await fetch(`${API_BASE_URL}/movie/${movieId}`, fetchOptions);
        if (!detailsRes.ok) {
            throw new Error(`Failed to fetch details for movie ID ${movieId}`);
        }
        const details: TmdbMovieDetail = await detailsRes.json();

        // Optional resources (parallel)
        const [credits, videos, similarData, reviewsData] = await Promise.all([
            safeFetch(`${API_BASE_URL}/movie/${movieId}/credits`),
            safeFetch(`${API_BASE_URL}/movie/${movieId}/videos`),
            safeFetch(`${API_BASE_URL}/movie/${movieId}/similar`),
            safeFetch(`${API_BASE_URL}/movie/${movieId}/reviews`)
        ]);

        const cast = credits?.cast ? credits.cast.slice(0, 10).map((c: any): CastMember => ({
            id: c.id,
            name: c.name,
            character: c.character,
            profileUrl: c.profile_path ? `${IMAGE_BASE_URL_W200}${c.profile_path}` : 'https://via.placeholder.com/200x300.png?text=No+Image',
        })) : [];
        
        const officialTrailer = videos?.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer');
        const trailerUrl = officialTrailer ? `https://www.youtube.com/embed/${officialTrailer.key}` : null;

        const similar: Movie[] = similarData?.results 
            ? (similarData.results as TmdbMovie[]).map(mapTmdbMovieToMovie).slice(0, 10)
            : [];

        const reviews: Review[] = reviewsData?.results 
            ? reviewsData.results.slice(0, 5).map((r: any) => {
                 let avatar = r.author_details?.avatar_path;
                 if (avatar && !avatar.startsWith('http')) {
                     avatar = `${IMAGE_BASE_URL_W200}${avatar}`;
                 }
                 return {
                    id: r.id,
                    author: r.author,
                    content: r.content,
                    rating: r.author_details?.rating,
                    createdAt: r.created_at,
                    avatarUrl: avatar
                };
            }) 
            : [];

        const movieDetail: MovieDetail = {
            id: details.id,
            title: details.title,
            posterUrl: details.poster_path ? `${IMAGE_BASE_URL}${details.poster_path}` : 'https://via.placeholder.com/500x750.png?text=No+Image',
            rating: details.vote_average,
            popularity: details.popularity,
            overview: details.overview,
            releaseDate: details.release_date,
            genres: details.genres,
            cast,
            trailerUrl,
            similar,
            reviews
        };
        
        movieDetailsExtendedCache.set(movieId, movieDetail);
        return movieDetail;

    } catch (error) {
        console.error(error);
        return null;
    }
};