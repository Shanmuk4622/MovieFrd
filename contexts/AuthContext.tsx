import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { Session, User, AuthError, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { getProfile, getUserMovieLists, getUnreadDmCount } from '../supabaseApi';
import { Profile, UserMovieList, DirectMessage, AppNotification } from '../types';
import { eventBus, RealtimeMessageEvent } from '../utils/eventBus';
import { LogoIcon } from '../components/icons';
import Spinner from '../components/ui/Spinner';

type Theme = 'light' | 'dark';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userMovieLists: UserMovieList[];
  onlineUsers: Set<string>;
  hasUnreadDms: boolean;
  notification: AppNotification | null;
  setNotification: (notification: AppNotification | null) => void;
  refreshProfile: () => Promise<void>;
  refreshUserMovieLists: () => Promise<void>;
  refreshUnreadDms: () => Promise<void>;
  signUp: (args: Parameters<typeof supabase.auth.signUp>[0]) => Promise<{ error: AuthError | null }>;
  signIn: (
    args: Parameters<typeof supabase.auth.signInWithPassword>[0]
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  theme: Theme;
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
  const [hasUnreadDms, setHasUnreadDms] = useState(false);
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.error('Could not save theme to localStorage', error);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const fetchUserDependentData = useCallback(async (currentUser: User) => {
    const [profileData, movieListsData] = await Promise.all([
      getProfile(currentUser.id),
      getUserMovieLists(currentUser.id),
    ]);
    setProfile(profileData);
    setUserMovieLists(movieListsData || []);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) setProfile(await getProfile(user.id));
  }, [user]);

  const refreshUserMovieLists = useCallback(async () => {
    if (user) setUserMovieLists((await getUserMovieLists(user.id)) || []);
  }, [user]);

  const refreshUnreadDms = useCallback(async () => {
    if (!user) return;
    setHasUnreadDms((await getUnreadDmCount()) > 0);
  }, [user]);

  // --- Single auth subscription ---
  useEffect(() => {
    let active = true;

    const applySession = async (nextSession: Session | null) => {
      if (!active) return;
      const currentUser = nextSession?.user ?? null;
      setSession(nextSession);
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

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fetchUserDependentData]);

  // --- Global presence ---
  useEffect(() => {
    if (!user) {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
        setOnlineUsers(new Set());
      }
      return;
    }
    if (presenceChannelRef.current) return;

    const channel = supabase.channel('global-presence', {
      config: { presence: { key: user.id } },
    });
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const ids = Object.keys(state).map((key) => (state[key][0] as any).user_id);
      setOnlineUsers(new Set(ids));
    });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
      }
    });
    presenceChannelRef.current = channel;

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [user]);

  // --- DM notifications, driven by the centralized realtime eventBus ---
  // (RealtimeContext owns the actual DB subscription; here we only react.)
  useEffect(() => {
    if (!user) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    refreshUnreadDms();

    const handler = async (ev: Event) => {
      const detail = (ev as CustomEvent<RealtimeMessageEvent>).detail;
      if (!detail || detail.table !== 'direct_messages') return;
      const eventType = String(detail.eventType).toUpperCase();
      if (eventType !== 'INSERT') return;

      const message = detail.new as DirectMessage;
      if (!message || message.receiver_id !== user.id) return;

      setHasUnreadDms(true);
      const senderProfile = await getProfile(message.sender_id);
      if (!senderProfile) return;

      const preview =
        message.content.length > 50 ? `${message.content.slice(0, 50)}…` : message.content;
      setNotification({
        message: `${senderProfile.username}: ${preview}`,
        type: 'dm',
        senderProfile,
      });

      if (document.hidden && Notification.permission === 'granted') {
        new Notification('New message on MovieFrd', { body: `${senderProfile.username}: ${preview}` });
      }
    };

    eventBus.addEventListener('realtime:message', handler as EventListener);
    return () => eventBus.removeEventListener('realtime:message', handler as EventListener);
  }, [user, refreshUnreadDms]);

  const value: AuthContextType = {
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
    signUp: (args) => supabase.auth.signUp(args),
    signIn: (args) => supabase.auth.signInWithPassword(args),
    signOut: () => supabase.auth.signOut(),
    theme,
    toggleTheme,
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-50 dark:bg-surface-950">
        <LogoIcon className="h-20 w-20 animate-pulse" />
        <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
          <Spinner size="h-4 w-4" />
          <span className="text-sm font-semibold">Loading your experience…</span>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
