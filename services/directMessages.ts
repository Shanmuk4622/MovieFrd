import { supabase } from '../supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { DirectMessage } from '../types';
import { logError } from './helpers';

export const getDirectMessages = async (
  userId1: string,
  userId2: string
): Promise<DirectMessage[]> => {
  // DMs are ephemeral — only the last 3 days are shown.
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('direct_messages')
    .select('*, profiles:sender_id(id, username, avatar_url)')
    .or(
      `and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`
    )
    .gte('created_at', threeDaysAgo)
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) {
    logError('getDirectMessages', error);
    return [];
  }
  return (data as DirectMessage[]) || [];
};

export const sendDirectMessage = async (
  senderId: string,
  receiverId: string,
  content: string,
  replyToMessageId?: number | null
): Promise<DirectMessage> => {
  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      reply_to_message_id: replyToMessageId || null,
    })
    .select('*, profiles:sender_id(id, username, avatar_url)')
    .single();
  if (error) {
    logError('sendDirectMessage', error);
    throw error;
  }
  return data as DirectMessage;
};

export const markDirectMessagesAsSeen = async (senderId: string, receiverId: string) => {
  const { error } = await supabase.rpc('mark_dms_as_seen', {
    p_sender_id: senderId,
    p_receiver_id: receiverId,
  });
  // Non-critical background task — log but never throw.
  if (error) logError('markDirectMessagesAsSeen', error);
};

export const getUnreadDmCount = async (): Promise<number> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    if (sessionError) logError('getUnreadDmCount:session', sessionError);
    return 0;
  }
  const userId = session.user.id;

  const { count, error } = await supabase
    .from('direct_messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .not('seen_by', 'cs', `{${userId}}`);
  if (error) {
    logError('getUnreadDmCount', error);
    return 0;
  }
  return count || 0;
};

/**
 * Subscribes to all DM events where the user is the receiver. RLS still applies;
 * the filter just narrows the firehose. Complex OR filters are unreliable in
 * Realtime, so we keep a single simple `receiver_id` filter.
 */
export const subscribeToAllDirectMessagesForUser = (
  userId: string,
  onMessageEvent: (payload: any) => void
): RealtimeChannel => {
  return supabase
    .channel(`dms-for-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${userId}`,
      },
      onMessageEvent
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') logError('subscribeToAllDirectMessagesForUser', err);
    });
};
