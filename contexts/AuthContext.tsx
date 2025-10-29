import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { getProfile, getUserMovieLists } from '../supabaseApi';
import { Profile, UserMovieList } from '../types';
import { LogoIcon } from '../components/icons';

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
    // This function remains the same, fetching profile and lists.
    const [profileData, movieListsData] = await Promise.all([
      getProfile(user.id),
      getUserMovieLists(user.id)
    ]);
    setProfile(profileData);
    setUserMovieLists(movieListsData || []);
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
    setLoading(true);

    // This listener handles all auth events: INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED.
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      try {
        if (newSession) {
          // FIX: Explicitly set the session in the client. This is the core of the fix,
          // ensuring the client's in-memory state is always synchronized with storage,
          // which is crucial after a token refresh.
          await supabase.auth.setSession(newSession);

          setSession(newSession);
          const currentUser = newSession.user;
          setUser(currentUser);
          // Fetch dependent data only after we have a confirmed user.
          await fetchUserDependentData(currentUser);
        } else {
          // If no session is found, clear all user-specific data.
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserMovieLists([]);
        }
      } catch (error) {
        // FIX: If any error occurs (e.g., fetching profile fails or token is corrupted),
        // log it and force a sign-out to clear the invalid state, preventing the app from getting stuck.
        console.error("Error handling auth state change. Signing out to clear corrupted state.", error);
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setUserMovieLists([]);
      } finally {
        // FIX: This `finally` block GUARANTEES that the loading screen is removed,
        // even if an error occurs during the process.
        setLoading(false);
      }
    });

    return () => {
      // Clean up the listener when the component unmounts.
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
  
  // Display loading screen until the initial session check is complete.
  if (loading) {
      return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center">
            <LogoIcon className="w-24 h-24 animate-pulse" />
            <p className="text-gray-500 dark:text-gray-400 mt-4 font-semibold">Loading your experience...</p>
          </div>
      );
  }
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
