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

  // Use a single global auth-state listener and a subscriber list so that
  // we never create multiple GoTrueClient listeners that fight over storage
  // (this also survives HMR in dev when `supabaseClient` is a singleton).
  useEffect(() => {
    const globalObj = (globalThis as any) || window;

    // Ensure subscriber list exists
    if (!globalObj.__supabaseAuthSubscribers) {
      globalObj.__supabaseAuthSubscribers = [];
    }

    // Initialize the single global auth listener once
    if (!globalObj.__supabaseAuthInitialized) {
      globalObj.__supabaseAuthInitialized = true;
      try {
        supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
          try {
            (globalObj.__supabaseAuthSubscribers || []).forEach((cb: any) => {
              try { cb(event, session); } catch (e) { console.error('supabase subscriber error', e); }
            });
          } catch (e) {
            console.error('Failed to dispatch auth event to subscribers', e);
          }
        });
      } catch (e) {
        console.error('Failed to initialize Supabase auth listener', e);
      }
    }

    setLoading(true);

    // Subscriber for this AuthProvider instance
    const handleAuthEvent = async (_event: string, session: Session | null) => {
      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);

      if (currentUser) {
        try {
          await fetchUserDependentData(currentUser);
        } catch (e) {
          console.error('Failed to fetch user data:', e);
          setProfile(null);
          setUserMovieLists([]);
        }
      } else {
        setProfile(null);
        setUserMovieLists([]);
      }

      setLoading(false);
    };

    // Register
    globalObj.__supabaseAuthSubscribers.push(handleAuthEvent);

    // Immediately attempt to read the current session and populate state
    (async () => {
      try {
        // Supabase v2: auth.getSession()
        const sessionResult = await supabase.auth.getSession();
        const session = (sessionResult as any)?.data?.session ?? null;
        await handleAuthEvent('INIT', session);
      } catch (e) {
        console.error('Failed to get initial supabase session', e);
        setLoading(false);
      }
    })();

    // Cleanup: unsubscribe this provider's handler
    return () => {
      try {
        globalObj.__supabaseAuthSubscribers = (globalObj.__supabaseAuthSubscribers || []).filter((cb: any) => cb !== handleAuthEvent);
      } catch (e) {
        // ignore cleanup errors
      }
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
