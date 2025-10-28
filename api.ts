import { Movie, MovieDetail, CastMember } from './types';

// IMPORTANT: Replace this with your actual TMDB API key.
// You can get one for free by signing up at https://www.themoviedb.org/.
const TMDB_API_KEY = 'YOUR_TMDB_API_KEY_HERE'; 
const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const IMAGE_BASE_URL_W200 = 'https://image.tmdb.org/t/p/w200';

interface TmdbMovie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
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


export const fetchMovieDetailsExtended = async (movieId: number): Promise<MovieDetail | null> => {
    if (TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
        return null;
    }

    try {
        const [detailsRes, creditsRes, videosRes] = await Promise.all([
            fetch(`${API_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`),
            fetch(`${API_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`),
            fetch(`${API_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`)
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

        return {
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

    } catch (error) {
        console.error(error);
        return null;
    }
};