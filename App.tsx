import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import { useAuth } from './contexts/AuthContext';
import { UserMovieList, getUserMovieLists } from './supabaseApi';

export type View = 'dashboard' | 'profile';

const App: React.FC = () => {
  const { session, user } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [userMovieLists, setUserMovieLists] = useState<UserMovieList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session && user) {
      setLoading(true);
      getUserMovieLists(user.id)
        .then(lists => setUserMovieLists(lists || []))
        .catch(error => console.error("Failed to fetch user movie lists", error))
        .finally(() => setLoading(false));
    } else {
      // If there's no session, we're not loading any user-specific data.
      setLoading(false);
    }
  }, [session, user]);
  
  if (!session) {
    return <Auth />;
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const handleListUpdate = () => {
    if (user) {
        getUserMovieLists(user.id).then(lists => setUserMovieLists(lists || []));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header setView={setView} />
      <main className="container mx-auto py-8">
        {view === 'dashboard' ? (
          <Dashboard 
            userMovieLists={userMovieLists} 
            onListUpdate={handleListUpdate} 
          />
        ) : (
          <Profile 
            userMovieLists={userMovieLists} 
            onListUpdate={handleListUpdate} 
          />
        )}
      </main>
    </div>
  );
};

export default App;