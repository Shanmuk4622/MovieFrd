import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { Routes, Route, Outlet, Navigate, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
import { Movie, Profile as ProfileType } from './types';
import { searchMovies } from './api';
import { cn } from './utils/cn';

// Shared handlers/state made available to routed pages without prop-drilling.
interface LayoutContextValue {
  onSelectMovie: (movieId: number) => void;
  onSelectProfile: (userId: string) => void;
  onListUpdate: (message: string) => void;
  registerActivityRefresh: (fn: () => void) => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);
export const useLayout = () => {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within the app Layout');
  return ctx;
};

const Layout: React.FC = () => {
  const { userMovieLists, refreshUserMovieLists, notification, setNotification } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const activityRefreshRef = useRef<(() => void) | null>(null);

  const selectedMovieId = searchParams.get('movie');
  const selectedProfileId = searchParams.get('user');

  const onListUpdate = useCallback(
    (message: string) => {
      refreshUserMovieLists();
      setNotification({ message, type: 'success' });
    },
    [refreshUserMovieLists, setNotification]
  );

  const onSelectMovie = useCallback(
    (movieId: number) => {
      setSearchParams(
        (prev) => {
          prev.set('movie', String(movieId));
          prev.delete('user');
          return prev;
        },
        { replace: false }
      );
    },
    [setSearchParams]
  );

  const onSelectProfile = useCallback(
    (userId: string) => {
      setSearchParams((prev) => {
        prev.set('user', userId);
        return prev;
      });
    },
    [setSearchParams]
  );

  const closeParam = (key: 'movie' | 'user') =>
    setSearchParams((prev) => {
      prev.delete(key);
      return prev;
    });

  const registerActivityRefresh = useCallback((fn: () => void) => {
    activityRefreshRef.current = fn;
  }, []);

  const isChat = location.pathname === '/chat';

  return (
    <LayoutContext.Provider
      value={{ onSelectMovie, onSelectProfile, onListUpdate, registerActivityRefresh }}
    >
      <div
        className={cn(
          'flex flex-col bg-surface-50 text-surface-900 transition-colors dark:bg-surface-950 dark:text-white',
          isChat ? 'h-screen overflow-hidden' : 'min-h-screen'
        )}
      >
        <Header />
        <main className={cn(isChat ? 'min-h-0 w-full flex-1' : 'container mx-auto flex-1 py-4 sm:py-8')}>
          <Outlet />
        </main>

        {selectedMovieId && (
          <MovieDetail
            key={selectedMovieId}
            movieId={Number(selectedMovieId)}
            onClose={() => closeParam('movie')}
            userMovieLists={userMovieLists}
            onListUpdate={onListUpdate}
            onSelectMovie={onSelectMovie}
            onActivityRefresh={() => activityRefreshRef.current?.()}
          />
        )}

        {selectedProfileId && (
          <UserProfileModal
            key={selectedProfileId}
            userId={selectedProfileId}
            onClose={() => closeParam('user')}
            currentUserMovieLists={userMovieLists}
            onListUpdate={onListUpdate}
            onSelectMovie={onSelectMovie}
            onSelectProfile={onSelectProfile}
          />
        )}

        {notification && (
          <Notification
            notification={notification}
            onClose={() => setNotification(null)}
            onClick={
              notification.type === 'dm' && notification.senderProfile
                ? () => {
                    navigate('/chat', { state: { user: notification.senderProfile } });
                    setNotification(null);
                  }
                : undefined
            }
          />
        )}
      </div>
    </LayoutContext.Provider>
  );
};

const DashboardPage: React.FC = () => {
  const { userMovieLists } = useAuth();
  const { onSelectMovie, onSelectProfile, onListUpdate, registerActivityRefresh } = useLayout();
  return (
    <Dashboard
      userMovieLists={userMovieLists}
      onListUpdate={onListUpdate}
      onSelectMovie={onSelectMovie}
      onSelectProfile={onSelectProfile}
      onActivityRefreshReady={registerActivityRefresh}
    />
  );
};

const ProfilePage: React.FC = () => {
  const { userMovieLists } = useAuth();
  const { onSelectMovie, onSelectProfile, onListUpdate } = useLayout();
  return (
    <Profile
      userMovieLists={userMovieLists}
      onListUpdate={onListUpdate}
      onSelectMovie={onSelectMovie}
      onSelectProfile={onSelectProfile}
    />
  );
};

const SearchPage: React.FC = () => {
  const { userMovieLists } = useAuth();
  const { onSelectMovie, onListUpdate } = useLayout();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let active = true;
    setIsLoading(true);
    searchMovies(query)
      .then((movies) => active && setResults(movies))
      .catch((err) => {
        console.error('Failed to search movies', err);
        if (active) setResults([]);
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [query]);

  return (
    <SearchResults
      query={query}
      movies={results}
      userMovieLists={userMovieLists}
      onListUpdate={onListUpdate}
      isLoading={isLoading}
      onSelectMovie={onSelectMovie}
    />
  );
};

const ChatPage: React.FC = () => {
  const { onSelectProfile } = useLayout();
  const location = useLocation();
  const initialUser = (location.state as { user?: ProfileType } | null)?.user ?? null;
  return <Chat onSelectProfile={onSelectProfile} initialUser={initialUser} />;
};

const App: React.FC = () => {
  const { session } = useAuth();
  if (!session) return <Auth />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
