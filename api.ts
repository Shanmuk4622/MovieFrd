import { Movie, MovieDetailData, CastMember, Review } from './types';
import { POSTER_FALLBACK, PROFILE_FALLBACK } from './utils/images';

// --- TMDB configuration (env-only; see .env.example) ---
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const IMAGE_BASE_URL_W200 = 'https://image.tmdb.org/t/p/w200';

if (!TMDB_API_KEY) {
  // Surfaced once at module load so misconfiguration is obvious during development.
  console.error('Missing VITE_TMDB_API_KEY. Movie data will not load. See .env.example.');
}

// Simple in-memory caches keyed by TMDB id.
const movieCache = new Map<number, Movie>();
const movieDetailCache = new Map<number, MovieDetailData>();

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

const posterFor = (path: string | null) => (path ? `${IMAGE_BASE_URL}${path}` : POSTER_FALLBACK);

const mapMovie = (m: TmdbMovie): Movie => ({
  id: m.id,
  title: m.title || m.name || 'Untitled',
  posterUrl: posterFor(m.poster_path),
  rating: m.vote_average,
  releaseDate: m.release_date || m.first_air_date,
  popularity: m.popularity,
});

const authHeaders = (): RequestInit => ({
  headers: {
    Authorization: `Bearer ${TMDB_API_KEY}`,
    'Content-Type': 'application/json;charset=utf-8',
  },
});

/** Fetch + parse JSON from a TMDB endpoint. Throws on non-OK responses. */
const tmdbGet = async <T>(endpoint: string): Promise<T> => {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, authHeaders());
  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status}): ${endpoint}`);
  }
  return res.json() as Promise<T>;
};

export const fetchMovies = async (endpoint: string): Promise<Movie[]> => {
  try {
    const data = await tmdbGet<{ results: TmdbMovie[] }>(endpoint);
    return (data.results || []).map(mapMovie);
  } catch (error) {
    console.error(error);
    return []; // Never crash the dashboard on a failed row.
  }
};

export const fetchMovieDetails = async (movieId: number): Promise<Movie | null> => {
  const cached = movieCache.get(movieId);
  if (cached) return cached;

  try {
    const data = await tmdbGet<TmdbMovie>(`/movie/${movieId}`);
    const movie = mapMovie(data);
    movieCache.set(movieId, movie);
    return movie;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const sortByDateThenPopularity = (a: Movie, b: Movie) => {
  const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
  const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
  if (dateA !== dateB) return dateB - dateA;
  return b.popularity - a.popularity;
};

export const searchMovies = async (query: string): Promise<Movie[]> => {
  try {
    const data = await tmdbGet<{ results: TmdbMovie[] }>(
      `/search/movie?query=${encodeURIComponent(query)}`
    );
    return (data.results || []).map(mapMovie).sort(sortByDateThenPopularity);
  } catch (error) {
    console.error(error);
    return [];
  }
};

export type MovieSortKey = 'relevance' | 'rating' | 'popularity' | 'date';

export const advancedSearchMovies = async (
  query: string,
  sortBy: MovieSortKey = 'relevance'
): Promise<Movie[]> => {
  try {
    const data = await tmdbGet<{ results: TmdbMovie[] }>(
      `/search/movie?query=${encodeURIComponent(query)}`
    );
    const movies = (data.results || []).map(mapMovie);
    switch (sortBy) {
      case 'rating':
        return movies.sort((a, b) => b.rating - a.rating);
      case 'popularity':
        return movies.sort((a, b) => b.popularity - a.popularity);
      case 'date':
        return movies.sort((a, b) => {
          const dA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const dB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return dB - dA;
        });
      default:
        return movies; // TMDB already returns relevance order.
    }
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const searchPerson = async (query: string): Promise<unknown[]> => {
  try {
    const data = await tmdbGet<{ results: unknown[] }>(
      `/search/person?query=${encodeURIComponent(query)}`
    );
    return data.results || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getMoviesByPerson = async (personId: number): Promise<Movie[]> => {
  try {
    const data = await tmdbGet<{ cast: TmdbMovie[] }>(`/person/${personId}/movie_credits`);
    return (data.cast || [])
      .filter((m) => m.poster_path)
      .map(mapMovie)
      .sort((a, b) => b.popularity - a.popularity);
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const fetchMovieDetailsExtended = async (
  movieId: number
): Promise<MovieDetailData | null> => {
  const cached = movieDetailCache.get(movieId);
  if (cached) return cached;

  try {
    // Optional resources should never break the main detail load.
    const safeGet = <T>(endpoint: string): Promise<T | null> =>
      tmdbGet<T>(endpoint).catch(() => null);

    const details = await tmdbGet<TmdbMovieDetail>(`/movie/${movieId}`);

    const [credits, videos, similarData, reviewsData] = await Promise.all([
      safeGet<{ cast: any[] }>(`/movie/${movieId}/credits`),
      safeGet<{ results: any[] }>(`/movie/${movieId}/videos`),
      safeGet<{ results: TmdbMovie[] }>(`/movie/${movieId}/similar`),
      safeGet<{ results: any[] }>(`/movie/${movieId}/reviews`),
    ]);

    const cast: CastMember[] = (credits?.cast ?? []).slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profileUrl: c.profile_path ? `${IMAGE_BASE_URL_W200}${c.profile_path}` : PROFILE_FALLBACK,
    }));

    const trailer = (videos?.results ?? []).find(
      (v) => v.site === 'YouTube' && v.type === 'Trailer'
    );
    const trailerUrl = trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;

    const similar: Movie[] = (similarData?.results ?? []).map(mapMovie).slice(0, 10);

    const reviews: Review[] = (reviewsData?.results ?? []).slice(0, 5).map((r) => {
      let avatar: string | null = r.author_details?.avatar_path ?? null;
      if (avatar && !avatar.startsWith('http')) avatar = `${IMAGE_BASE_URL_W200}${avatar}`;
      return {
        id: r.id,
        author: r.author,
        content: r.content,
        rating: r.author_details?.rating ?? null,
        createdAt: r.created_at,
        avatarUrl: avatar,
      };
    });

    const movieDetail: MovieDetailData = {
      id: details.id,
      title: details.title,
      posterUrl: posterFor(details.poster_path),
      rating: details.vote_average,
      popularity: details.popularity,
      overview: details.overview,
      releaseDate: details.release_date,
      genres: details.genres,
      cast,
      trailerUrl,
      similar,
      reviews,
    };

    movieDetailCache.set(movieId, movieDetail);
    return movieDetail;
  } catch (error) {
    console.error(error);
    return null;
  }
};
