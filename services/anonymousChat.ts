import { supabase } from '../supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AnonymousChatMessage, AnonymousChatSession } from '../types';
import { logError, NOT_FOUND } from './helpers';

export interface AnonymousMatch {
  session_id: string;
  partner_id: string | null;
  is_new_session: boolean;
}

/** Join the queue and either pair with a waiting stranger or create a new session. */
export const findAnonymousChatPartner = async (): Promise<AnonymousMatch | null> => {
  const { data, error } = await supabase.rpc('find_anonymous_chat_partner');
  if (error) {
    logError('findAnonymousChatPartner', error);
    return null;
  }
  if (!data || data.length === 0) return null;

  const result = data[0];
  return {
    session_id: result.result_session_id,
    partner_id: result.result_partner_id,
    is_new_session: result.result_is_new_session,
  };
};

export const getActiveAnonymousSession = async (): Promise<AnonymousChatSession | null> => {
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.session?.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('anonymous_chat_sessions')
    .select('*')
    .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
    .in('status', ['waiting', 'paired'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== NOT_FOUND) {
    logError('getActiveAnonymousSession', error);
    return null;
  }
  return data;
};

export const getAnonymousChatMessages = async (
  sessionId: string
): Promise<AnonymousChatMessage[]> => {
  const { data, error } = await supabase
    .from('anonymous_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) {
    logError('getAnonymousChatMessages', error);
    return [];
  }
  return data || [];
};

export const sendAnonymousMessage = async (
  sessionId: string,
  content: string
): Promise<AnonymousChatMessage | null> => {
  const { data: session } = await supabase.auth.getSession();
  const uid = session?.session?.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('anonymous_chat_messages')
    .insert({ session_id: sessionId, sender_id: uid, content, is_typing: false })
    .select()
    .single();
  if (error) {
    logError('sendAnonymousMessage', error);
    throw error;
  }
  return data;
};

export const endAnonymousSession = async (sessionId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('end_anonymous_chat_session', {
    p_session_id: sessionId,
  });
  if (error) {
    logError('endAnonymousSession', error);
    return false;
  }
  return data === true;
};

export const getAnonymousChatArchive = async (): Promise<any[]> => {
  const { data, error } = await supabase.rpc('get_user_anonymous_archive');
  if (error) {
    logError('getAnonymousChatArchive', error);
    return [];
  }
  return data || [];
};

export const subscribeToAnonymousSession = (
  sessionId: string,
  onUpdate: (payload: any) => void
): RealtimeChannel => {
  return supabase
    .channel(`anon-session-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anonymous_chat_sessions',
        filter: `session_id=eq.${sessionId}`,
      },
      onUpdate
    )
    .subscribe();
};

export const subscribeToAnonymousMessages = (
  sessionId: string,
  onMessage: (payload: any) => void
): RealtimeChannel => {
  return supabase
    .channel(`anon-messages-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'anonymous_chat_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      onMessage
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') logError('subscribeToAnonymousMessages', err);
    });
};

export const subscribeToAnonymousTyping = (
  sessionId: string,
  onTyping: (payload: any) => void
): RealtimeChannel => {
  return supabase
    .channel(`anon-typing-${sessionId}`)
    .on('broadcast', { event: 'typing' }, onTyping)
    .subscribe();
};
