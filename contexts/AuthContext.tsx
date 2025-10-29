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

  // FIX: Replaced session management with a hybrid model to fix race conditions.
  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      console.log('🔁 Syncing session...');
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        console.log('✅ Session fetched:', data.session);
        if (mounted) {
          const currentSession = data.session;
          setSession(currentSession);
          const currentUser = currentSession?.user ?? null;
          setUser(currentUser);
          if (currentUser) {
            await fetchUserDependentData(currentUser);
          } else {
            setProfile(null);
            setUserMovieLists([]);
          }
        }
      } catch (err: any) {
        console.error('❌ Session sync failed:', err.message);
        // Force sign out on corrupted session to prevent getting stuck.
        await supabase.auth.signOut();
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserMovieLists([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Force initial session sync on app load.
    syncSession();

    // Listen for auth events (SIGN_IN, SIGN_OUT, TOKEN_REFRESHED).
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('⚡ Auth event:', event);
        if (mounted) {
          if (newSession) {
            // Manually sync Supabase client state to prevent stale tokens.
            await supabase.auth.setSession(newSession);
            setSession(newSession);
            const currentUser = newSession.user;
            setUser(currentUser);
            // Re-fetch data if user context changes (e.g., login).
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
              await fetchUserDependentData(currentUser);
            }
          } else {
            // If session is null, clear all user-specific data.
            setSession(null);
            setUser(null);
            setProfile(null);
            setUserMovieLists([]);
          }
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
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