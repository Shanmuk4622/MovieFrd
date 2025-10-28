import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import SearchResults from './components/SearchResults';
import Chat from './components/Chat';
import MovieDetail from './components/MovieDetail'; // New import
import { useAuth } from './contexts/AuthContext';
import { UserMovieList, getUserMovieLists } from './supabaseApi';
import { Movie } from './types';
import { searchMovies } from './api';

export type View = 'dashboard' | 'profile' | 'search' | 'chat' | 'movieDetail';

const App: React.FC = () => {
  const { session, user } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [userMovieLists, setUserMovieLists] = useState<UserMovieList[]>([]);
  const [loading, setLoading] = useState(true);

  // State for search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // State for movie detail view
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);

  useEffect(() => {
    if (session && user) {
      setLoading(true);
      getUserMovieLists(user.id)
        .then(lists => setUserMovieLists(lists || []))
        .catch(error => console.error("Failed to fetch user movie lists", error))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session, user]);
  
  const handleListUpdate = () => {
    if (user) {
        getUserMovieLists(user.id).then(lists => setUserMovieLists(lists || []));
    }
  };
  
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    setView('search');
    setSearchQuery(query);
    setIsSearching(true);
    
    try {
        const results = await searchMovies(query);
        setSearchResults(results);
    } catch (error) {
        console.error("Failed to search movies", error);
        setSearchResults([]);
    } finally {
        setIsSearching(false);
    }
  };
  
  const handleSelectMovie = (movieId: number) => {
    setSelectedMovieId(movieId);
    setView('movieDetail');
  };

  const handleSetView = (newView: View) => {
    if (newView !== 'search') {
        setSearchQuery('');
        setSearchResults([]);
    }
    if (newView !== 'movieDetail') {
        setSelectedMovieId(null);
    }
    setView(newView);
  };
  
  if (!session) {
    return <Auth />;
  }
  
  if (loading && !selectedMovieId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const renderContent = () => {
    switch(view) {
        case 'dashboard':
            return <Dashboard 
                userMovieLists={userMovieLists} 
                onListUpdate={handleListUpdate}
                onSelectMovie={handleSelectMovie} 
            />;
        case 'profile':
            return <Profile 
                userMovieLists={userMovieLists} 
                onListUpdate={handleListUpdate}
                onSelectMovie={handleSelectMovie}
            />;
        case 'search':
            return <SearchResults
                query={searchQuery}
                movies={searchResults}
                userMovieLists={userMovieLists}
                onListUpdate={handleListUpdate}
                isLoading={isSearching}
                onSelectMovie={handleSelectMovie}
            />;
        case 'chat':
            return <Chat />;
        case 'movieDetail':
            return selectedMovieId ? <MovieDetail movieId={selectedMovieId} setView={handleSetView} /> : null;
        default:
            return null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      <Header setView={handleSetView} onSearch={handleSearch} />
      <main className="container mx-auto py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;