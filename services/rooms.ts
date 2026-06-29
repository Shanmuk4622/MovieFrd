import { supabase } from '../supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ChatMessage, ChatRoom } from '../types';
import { logError } from './helpers';

export const getChatRooms = async (): Promise<ChatRoom[]> => {
  // Uses an RPC that hides inactive rooms; falls back to a plain query if the
  // `get_visible_chat_rooms` function isn't present in the project.
  const { data, error } = await supabase.rpc('get_visible_chat_rooms');
  if (error) {
    logError('getChatRooms:rpc', error);
    const { data: fallback, error: fallbackError } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('name', { ascending: true });
    if (fallbackError) {
      logError('getChatRooms:fallback', fallbackError);
      return [];
    }
    return fallback || [];
  }
  return data || [];
};

export const createChatRoom = async (
  name: string,
  description: string | null,
  isAnonymous: boolean
): Promise<ChatRoom> => {
  const { data, error } = await supabase
    .from('chat_rooms')
    .insert({ name, description, is_anonymous: isAnonymous })
    .select()
    .single();
  if (error) {
    logError('createChatRoom', error);
    throw error;
  }
  return data;
};

export const getRoomMessages = async (roomId: number): Promise<ChatMessage[]> => {
  // Room messages are ephemeral — only the last 12 hours are shown.
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('room_messages')
    .select('*, profiles(id, username, avatar_url)')
    .eq('room_id', roomId)
    .gte('created_at', twelveHoursAgo)
    .order('created_at', { ascending: true })
    .limit(300);
  if (error) {
    logError('getRoomMessages', error);
    return [];
  }
  return (data as ChatMessage[]) || [];
};

export const sendMessage = async (
  roomId: number,
  senderId: string,
  content: string,
  replyToMessageId?: number | null
): Promise<ChatMessage> => {
  const { data, error } = await supabase
    .from('room_messages')
    .insert({
      room_id: roomId,
      sender_id: senderId,
      content,
      reply_to_message_id: replyToMessageId || null,
    })
    .select('*, profiles(id, username, avatar_url)')
    .single();
  if (error) {
    logError('sendMessage', error);
    throw error;
  }
  return data as ChatMessage;
};

export const subscribeToRoomMessages = (
  roomId: number,
  onMessageEvent: (payload: any) => void
): RealtimeChannel => {
  return supabase
    .channel(`room-${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` },
      onMessageEvent
    )
    .subscribe();
};
