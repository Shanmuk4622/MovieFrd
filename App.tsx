import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import SearchResults from './components/SearchResults';
import Chat from './components/Chat';
import MovieDetail from './components/MovieDetail';
import Notification from './components/Notification';
import UserProfileModal from './components/UserProfileModal';
import { useAuth } from './contexts/AuthContext';
import { Movie } from './types';
import { searchMovies } from './api';

export type View = 'dashboard' | 'profile' | 'search' | 'chat';

const App: React.FC = () => {
  const { session, userMovieLists, refreshUserMovieLists, notification, setNotification } = useAuth();
  const [view, setView] = useState<View>('dashboard');

  // State for search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // State for movie detail modal
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const handleListUpdate = (message: string) => {
    refreshUserMovieLists();
    setNotification({ message, type: 'success' });
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
  };

  const handleSelectProfile = (userId: string) => {
    setSelectedProfileId(userId);
  };

  const handleSetView = (newView: View) => {
    if (newView !== 'search') {
        setSearchQuery('');
        setSearchResults([]);
    }
    setSelectedProfileId(null); // Close profile modal when view changes
    setSelectedMovieId(null); // Close modal when view changes
    setView(newView);
  };
  
  if (!session) {
    return <Auth />;
  }

  const renderContent = () => {
    switch(view) {
        case 'dashboard':
            return <Dashboard 
                userMovieLists={userMovieLists} 
                onListUpdate={handleListUpdate}
                onSelectMovie={handleSelectMovie} 
                onSelectProfile={handleSelectProfile}
            />;
        case 'profile':
            return <Profile 
                userMovieLists={userMovieLists} 
                onListUpdate={handleListUpdate}
                onSelectMovie={handleSelectMovie}
                onSelectProfile={handleSelectProfile}
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
            return <Chat onSelectProfile={handleSelectProfile} />;
        default:
            return null;
    }
  }

  const mainContainerClasses = view === 'chat' 
    ? 'flex-grow container mx-auto w-full' 
    : 'container mx-auto py-4 sm:py-8';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300 flex flex-col">
      <Header setView={handleSetView} onSearch={handleSearch} />
      <main className={mainContainerClasses}>
        {renderContent()}
      </main>
      {selectedMovieId && (
        <MovieDetail 
            movieId={selectedMovieId} 
            onClose={() => setSelectedMovieId(null)}
            userMovieLists={userMovieLists}
            onListUpdate={handleListUpdate}
        />
      )}
      {selectedProfileId && (
        <UserProfileModal 
            key={selectedProfileId}
            userId={selectedProfileId}
            onClose={() => setSelectedProfileId(null)}
            currentUserMovieLists={userMovieLists}
            onListUpdate={handleListUpdate}
            onSelectMovie={handleSelectMovie}
            onSelectProfile={handleSelectProfile}
        />
      )}
      {notification && (
        <Notification 
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default App;