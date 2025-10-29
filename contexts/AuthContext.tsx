import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Session, User, AuthError, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { getProfile, getUserMovieLists, getUnreadDmCount } from '../supabaseApi';
import { Profile, UserMovieList, DirectMessage } from '../types';
import { LogoIcon } from '../components/icons';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userMovieLists: UserMovieList[];
  onlineUsers: Set<string>;
  hasUnreadDms: boolean;
  notification: { message: string; type: 'success' | 'info' | 'dm'; senderProfile?: Profile } | null;
  setNotification: (notification: { message: string; type: 'success' | 'info' | 'dm'; senderProfile?: Profile } | null) => void;
  refreshProfile: () => Promise<void>;
  refreshUserMovieLists: () => Promise<void>;
  refreshUnreadDms: () => Promise<void>;
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
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  // --- Notification States ---
  const [hasUnreadDms, setHasUnreadDms] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'dm'; senderProfile?: Profile } | null>(null);

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

  const refreshUnreadDms = useCallback(async () => {
    if (!user) return;
    const count = await getUnreadDmCount();
    setHasUnreadDms(count > 0);
  }, [user]);

  useEffect(() => {
    const globalObj = (globalThis as any) || window;
    if (!globalObj.__supabaseAuthSubscribers) globalObj.__supabaseAuthSubscribers = [];
    if (!globalObj.__supabaseAuthInitialized) {
      globalObj.__supabaseAuthInitialized = true;
      try {
        supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
          (globalObj.__supabaseAuthSubscribers || []).forEach((cb: any) => {
            try { cb(event, session); } catch (e) { console.error('supabase subscriber error', e); }
          });
        });
      } catch (e) {
        console.error('Failed to initialize Supabase auth listener', e);
      }
    }

    setLoading(true);

    const handleAuthEvent = async (_event: string, session: Session | null) => {
      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);
      if (currentUser) {
        try { await fetchUserDependentData(currentUser); } catch (e) { console.error('Failed to fetch user data:', e); setProfile(null); setUserMovieLists([]); }
      } else {
        setProfile(null);
        setUserMovieLists([]);
      }
      setLoading(false);
    };

    globalObj.__supabaseAuthSubscribers.push(handleAuthEvent);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await handleAuthEvent('INIT', session);
      } catch (e) {
        console.error('Failed to get initial supabase session', e);
        setLoading(false);
      }
    })();

    return () => {
      globalObj.__supabaseAuthSubscribers = (globalObj.__supabaseAuthSubscribers || []).filter((cb: any) => cb !== handleAuthEvent);
    };
  }, [fetchUserDependentData]);

  // Effect for managing global presence
  useEffect(() => {
    if (user && !presenceChannelRef.current) {
        const channel = supabase.channel('global-presence', { config: { presence: { key: user.id } } });
        channel.on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState();
            const userIds = Object.keys(presenceState).map(key => (presenceState[key][0] as any).user_id);
            setOnlineUsers(new Set(userIds));
        });
        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
            }
        });
        presenceChannelRef.current = channel;
    } else if (!user && presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
        setOnlineUsers(new Set());
    }
    return () => {
        if (presenceChannelRef.current) {
            supabase.removeChannel(presenceChannelRef.current);
            presenceChannelRef.current = null;
        }
    };
  }, [user]);

  // Effect for managing global notifications (DMs, Friend Requests)
  useEffect(() => {
    if (!user) return;

    // 1. Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // 2. Fetch initial unread DM count
    refreshUnreadDms();

    // 3. Set up real-time listener for new DMs
    const dmListener = supabase
      .channel(`public:direct_messages:receiver_id=eq.${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          setHasUnreadDms(true);
          const newMessage = payload.new as DirectMessage;
          const senderProfile = await getProfile(newMessage.sender_id);
          if (!senderProfile) return; // Don't show notification if sender profile can't be found
          
          const senderName = senderProfile?.username || 'Someone';
          const notificationMessage = `${senderName}: ${newMessage.content.substring(0, 50)}${newMessage.content.length > 50 ? '...' : ''}`;
          
          setNotification({ 
              message: notificationMessage,
              type: 'dm',
              senderProfile: senderProfile
          });

          // Browser notification if tab is not active
          if (document.hidden && Notification.permission === 'granted') {
            new Notification('New Message on MovieFrd', {
              body: notificationMessage,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dmListener);
    };
  }, [user, refreshUnreadDms]);


  const value = {
    session,
    user,
    profile,
    userMovieLists,
    onlineUsers,
    hasUnreadDms,
    notification,
    setNotification,
    refreshProfile,
    refreshUserMovieLists,
    refreshUnreadDms,
    signUp: (args: any) => supabase.auth.signUp(args),
    signIn: (args: any) => supabase.auth.signInWithPassword(args),
    signOut: () => supabase.auth.signOut(),
    theme,
    toggleTheme,
  };
  
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
