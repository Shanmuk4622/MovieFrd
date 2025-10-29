import React, { useState, useEffect, useCallback } from 'react';
// import { GoogleGenAI, Type } from "@google/genai";
import MovieList from './MovieList';
import ActivityCard from './ActivityCard';
import { Movie, UserActivity, UserMovieList } from '../types';
import { fetchMovies, fetchMovieDetails, searchMovies } from '../api';
import { getFriendActivity } from '../supabaseApi';
import { MovieListSkeleton, ActivitySkeleton } from './skeletons';
import { useAuth } from '../contexts/AuthContext';
import { formatTimeAgo } from '../utils';
// import { SparklesIcon } from './icons';

interface DashboardProps {
  userMovieLists: UserMovieList[];
  onListUpdate: (message: string) => void;
  onSelectMovie: (movieId: number) => void;
  onSelectProfile: (userId: string) => void;
}

/*
const GeminiRecommender: React.FC<Pick<DashboardProps, 'userMovieLists' | 'onListUpdate' | 'onSelectMovie'>> = ({ userMovieLists, onListUpdate, onSelectMovie }) => {
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [watchedMovies, setWatchedMovies] = useState<Movie[]>([]);

  useEffect(() => {
    const fetchWatchedMovies = async () => {
        const watchedIds = userMovieLists.filter(item => item.list_type === 'watched').map(item => item.tmdb_movie_id);
        if (watchedIds.length > 0) {
            const moviePromises = watchedIds.slice(0, 15).map(id => fetchMovieDetails(id)); // Get up to 15 movies for context
            const movies = await Promise.all(moviePromises);
            setWatchedMovies(movies.filter((m): m is Movie => m !== null));
        } else {
            setWatchedMovies([]);
        }
    };
    fetchWatchedMovies();
  }, [userMovieLists]);

  const handleGetRecommendations = useCallback(async () => {
    if (watchedMovies.length < 3) {
      setError("Watch at least 3 movies to get personalized AI recommendations!");
      setRecommendations([]);
      setHasFetched(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasFetched(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      const watchedTitles = watchedMovies.map(m => m.title).join(', ');
      const prompt = `Based on the fact that I've watched and enjoyed these movies: ${watchedTitles}. Please recommend 5 other movies I might like. Do not recommend any of the movies I've already watched. Provide the movie title and the year of release.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    year: { type: Type.INTEGER },
                  },
                  required: ["title", "year"]
                }
              }
            }
          }
        }
      });
      
      const jsonResponse = JSON.parse(response.text);
      const recommendedTitles: {title: string, year: number}[] = jsonResponse.recommendations;

      if (!recommendedTitles || recommendedTitles.length === 0) {
        throw new Error("The AI couldn't generate recommendations at this time. Please try again later.");
      }

      const movieDetailsPromises = recommendedTitles.map(rec => searchMovies(rec.title));
      const searchResultsArrays = await Promise.all(movieDetailsPromises);

      const finalRecommendations = recommendedTitles.map((rec, index) => {
          const resultsForTitle = searchResultsArrays[index];
          if (!resultsForTitle || resultsForTitle.length === 0) return null;
          
          const perfectMatch = resultsForTitle.find(movie => movie.releaseDate && new Date(movie.releaseDate).getFullYear() === rec.year);
          return perfectMatch || resultsForTitle[0];
      }).filter((m): m is Movie => m !== null);
      
      setRecommendations(finalRecommendations);

    } catch (err: any) {
      console.error("Gemini recommendation error:", err);
      setError("Sorry, we couldn't fetch AI recommendations right now. Please try again later.");
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }, [watchedMovies]);
  
  const renderContent = () => {
    if (isLoading) {
      return <MovieListSkeleton />;
    }
    if (error) {
        return (
            <div className="text-center text-yellow-500 dark:text-yellow-400 p-6 bg-yellow-500/10 rounded-lg">
                <p>{error}</p>
            </div>
        );
    }
    if (recommendations.length > 0) {
        return (
             <MovieList 
                title=""
                movies={recommendations} 
                userMovieLists={userMovieLists}
                onListUpdate={onListUpdate}
                onSelectMovie={onSelectMovie}
            />
        );
    }
    if (hasFetched && recommendations.length === 0 && !error) {
         return (
            <div className="text-center text-gray-500 dark:text-gray-400 p-6">
                <p>The AI couldn't find any recommendations based on your list. Try watching a few more movies!</p>
            </div>
        );
    }
    return null;
  };
  
  return (
    <section className="mb-12 bg-white dark:bg-gray-800/50 rounded-lg p-4 sm:p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                <SparklesIcon className="w-8 h-8 text-red-500" />
                AI-Powered Recommendations
            </h2>
            <button
                onClick={handleGetRecommendations}
                disabled={isLoading}
                className="mt-3 sm:mt-0 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-red-800 disabled:cursor-not-allowed self-start sm:self-center"
            >
                {isLoading ? 'Thinking...' : (hasFetched ? 'Refresh Recommendations' : 'Get My Recommendations')}
            </button>
        </div>

        {!hasFetched && (
             <div className="text-center text-gray-500 dark:text-gray-400 p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <p>Click the button to get movie recommendations based on your watched list!</p>
            </div>
        )}
        
        {hasFetched && renderContent()}
    </section>
  );
};
*/

const Dashboard: React.FC<DashboardProps> = ({ userMovieLists, onListUpdate, onSelectMovie, onSelectProfile }) => {
  const { user } = useAuth();
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
  const [friendActivity, setFriendActivity] = useState<UserActivity[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    const loadMovies = async () => {
      setLoadingMovies(true);
      try {
        const [popular, trending, upcoming] = await Promise.all([
            fetchMovies('/movie/popular'),
            fetchMovies('/movie/top_rated'),
            fetchMovies('/movie/upcoming')
        ]);
        setPopularMovies(popular);
        setTrendingMovies(trending);
        setUpcomingMovies(upcoming);
      } catch (error) {
        console.error("Failed to load dashboard movies", error);
      } finally {
        setLoadingMovies(false);
      }
    };
    
    loadMovies();
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadRealActivity = async () => {
      setLoadingActivity(true);
      try {
        const activitiesFromDb = await getFriendActivity(user.id);
        
        if (!activitiesFromDb || activitiesFromDb.length === 0) {
          setFriendActivity([]);
          return;
        }

        const movieIds = [...new Set(activitiesFromDb.map(a => a.tmdb_movie_id))];
        
        const movieDetailsPromises = movieIds.map(id => fetchMovieDetails(id));
        const movieDetailsResults = await Promise.all(movieDetailsPromises);
        
        const movieDetailsMap = new Map<number, Movie>();
        movieDetailsResults.forEach(movie => {
          if (movie) {
            movieDetailsMap.set(movie.id, movie);
          }
        });

        const formattedActivities: UserActivity[] = activitiesFromDb
          .map(activity => {
            const movie = movieDetailsMap.get(activity.tmdb_movie_id);
            if (!movie || !activity.profiles) {
              return null;
            }

            return {
              id: activity.id,
              userId: activity.profiles.id,
              userName: activity.profiles.username,
              userAvatarUrl: activity.profiles.avatar_url || `https://i.pravatar.cc/100?u=${activity.profiles.id}`,
              action: activity.list_type === 'watched' ? 'watched' : 'added to watchlist',
              movie: movie,
              timestamp: formatTimeAgo(activity.created_at),
            };
          })
          .filter((activity): activity is UserActivity => activity !== null);

        setFriendActivity(formattedActivities);

      } catch (error) {
        console.error("Failed to load friend activity", error);
        setFriendActivity([]);
      } finally {
        setLoadingActivity(false);
      }
    };
    
    loadRealActivity();
  }, [user]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 lg:px-0">
      <div className="lg:col-span-2">
        {/*
        <GeminiRecommender
            userMovieLists={userMovieLists}
            onListUpdate={onListUpdate}
            onSelectMovie={onSelectMovie}
        />
        */}
        {loadingMovies ? (
            <>
                <MovieListSkeleton />
                <MovieListSkeleton />
                <MovieListSkeleton />
            </>
        ) : (
            <>
                <MovieList 
                  title="Popular on TMDB" 
                  movies={popularMovies} 
                  userMovieLists={userMovieLists}
                  onListUpdate={onListUpdate}
                  onSelectMovie={onSelectMovie}
                />
                <MovieList 
                  title="Trending at VITAP" 
                  movies={trendingMovies} 
                  userMovieLists={userMovieLists}
                  onListUpdate={onListUpdate}
                  onSelectMovie={onSelectMovie}
                />
                <MovieList 
                  title="Explore Upcoming Movies" 
                  movies={upcomingMovies} 
                  userMovieLists={userMovieLists}
                  onListUpdate={onListUpdate}
                  onSelectMovie={onSelectMovie}
                />
            </>
        )}
      </div>
      <div className="lg:col-span-1">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Friend Activity</h2>
        {loadingActivity ? (
            <ActivitySkeleton />
        ) : friendActivity.length > 0 ? (
            <div className="space-y-4">
              {friendActivity.map(activity => (
                <ActivityCard 
                    key={activity.id} 
                    activity={activity} 
                    onSelectMovie={onSelectMovie}
                    onSelectProfile={onSelectProfile}
                />
              ))}
            </div>
        ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
                <p className="font-semibold text-gray-800 dark:text-white">No recent activity</p>
                <p className="text-sm mt-1">Your friends haven't been active recently. Add some friends to see their updates here!</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;