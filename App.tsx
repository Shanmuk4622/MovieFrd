import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import SearchResults from './components/SearchResults';
import Chat from './components/dive/Chat';
import MovieDetail from './components/MovieDetail';
import Notification from './components/Notification';
import UserProfileModal from './components/UserProfileModal';
import { useAuth } from './contexts/AuthContext';
import { Movie, Profile as ProfileType } from './types';
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

  // State to pre-select a chat when navigating from a notification
  const [initialChatUser, setInitialChatUser] = useState<ProfileType | null>(null);

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
    if (newView !== 'chat') {
        setInitialChatUser(null);
    }
    setSelectedProfileId(null); // Close profile modal when view changes
    setSelectedMovieId(null); // Close modal when view changes
    setView(newView);
  };
  
  const handleNotificationClick = (senderProfile: ProfileType) => {
    setInitialChatUser(senderProfile);
    handleSetView('chat');
    setNotification(null); // Close notification on click
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
            return <Chat 
                onSelectProfile={handleSelectProfile} 
                initialUser={initialChatUser} 
            />;
        default:
            return null;
    }
  }

  const mainContainerClasses = view === 'chat' 
    ? 'flex-grow w-full flex-1' 
    : 'container mx-auto py-4 sm:py-8';
  
  const appContainerClasses = view === 'chat'
    ? "min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300 flex flex-col h-screen"
    : "min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300 flex flex-col";

  return (
    <div className={appContainerClasses}>
      <Header 
        setView={handleSetView} 
        onSearch={handleSearch} 
        view={view} 
      />
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
            notification={notification}
            onClose={() => setNotification(null)}
            onClick={notification.type === 'dm' && notification.senderProfile 
                ? () => handleNotificationClick(notification.senderProfile!) 
                : undefined}
        />
      )}
    </div>
  );
};

export default App;