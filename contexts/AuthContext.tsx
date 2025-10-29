import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { getProfile, getUserMovieLists } from '../supabaseApi';
import { Profile, UserMovieList } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userMovieLists: UserMovieList[];
  refreshProfile: () => Promise<void>;
  refreshUserMovieLists: () => Promise<void>;
  signUp: (args: any) => Promise<{ error: AuthError | null }>;
  signIn: (args: any) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userMovieLists, setUserMovieLists] = useState<UserMovieList[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.error("Could not save theme to localStorage", error);
    }
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const fetchUserDependentData = useCallback(async (user: User) => {
    try {
      const [profileData, movieListsData] = await Promise.all([
        getProfile(user.id),
        getUserMovieLists(user.id)
      ]);
      setProfile(profileData);
      setUserMovieLists(movieListsData || []);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setProfile(null);
      setUserMovieLists([]);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await getProfile(user.id);
      setProfile(profileData);
    }
  }, [user]);

  const refreshUserMovieLists = useCallback(async () => {
    if (user) {
      const lists = await getUserMovieLists(user.id);
      setUserMovieLists(lists || []);
    }
  }, [user]);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchUserDependentData(currentUser);
        }
      } catch (error) {
        console.error("Error fetching session on initial load:", error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setUserMovieLists([]);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        // Fetch new data, but don't show a full-page loader for auth changes
        await fetchUserDependentData(currentUser);
      } else {
        setProfile(null);
        setUserMovieLists([]);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [fetchUserDependentData]);

  const value = {
    session,
    user,
    profile,
    userMovieLists,
    refreshProfile,
    refreshUserMovieLists,
    signUp: (args: any) => supabase.auth.signUp(args),
    signIn: (args: any) => supabase.auth.signInWithPassword(args),
    signOut: () => supabase.auth.signOut(),
    theme,
    toggleTheme,
  };
  
  if (loading) {
      return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
      );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};