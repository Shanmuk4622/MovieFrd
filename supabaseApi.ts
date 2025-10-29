import { supabase } from './supabaseClient';
import { User, RealtimeChannel } from '@supabase/supabase-js';
// FIX: Moved UserMovieList to types.ts and imported it from there to centralize type definitions.
import { ChatRoom, ChatMessage, Profile, Friendship, FriendshipStatus, DirectMessage, UserMovieList } from './types';

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
};

export const uploadAvatar = async (userId: string, file: File) => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);
  
  const publicUrl = data.publicUrl;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating profile with new avatar URL:', updateError);
    // Attempt to remove the uploaded file if the profile update fails
    await supabase.storage.from('avatars').remove([filePath]);
    throw updateError;
  }

  return publicUrl;
};

export const getUserMovieLists = async (userId: string): Promise<UserMovieList[]> => {
    const { data, error } = await supabase
        .from('user_movie_lists')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching user movie lists:', error);
        return [];
    }
    return data || [];
};

export const addMovieToList = async (userId: string, movieId: number, listType: 'watched' | 'watchlist') => {
    const { data, error } = await supabase
        .from('user_movie_lists')
        .upsert({ user_id: userId, tmdb_movie_id: movieId, list_type: listType }, { onConflict: 'user_id, tmdb_movie_id' });

    if (error) {
        console.error('Error adding movie to list:', error);
        throw error;
    }
    return data;
};

export const removeMovieFromList = async (userId: string, movieId: number) => {
    const { data, error } = await supabase
        .from('user_movie_lists')
        .delete()
        .eq('user_id', userId)
        .eq('tmdb_movie_id', movieId);
    
    if (error) {
        console.error('Error removing movie from list:', error);
        throw error;
    }
    return data;
};

// --- Chat Functions ---

export const getChatRooms = async (): Promise<ChatRoom[]> => {
  const { data, error } = await supabase
    .from('chat_rooms')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching chat rooms:', error);
    return [];
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
    console.error('Error creating chat room:', error);
    throw error;
  }
  return data;
};

export const getRoomMessages = async (roomId: number): Promise<ChatMessage[]> => {
  // Messages in rooms disappear after 12 hours.
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('room_messages')
    .select('*, profiles(*)')
    .eq('room_id', roomId)
    .gte('created_at', twelveHoursAgo) // Filter for recent messages
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching messages for room:', error);
    return [];
  }
  return data as ChatMessage[] || [];
};

export const sendMessage = async (roomId: number, senderId: string, content: string): Promise<ChatMessage> => {
  const { data, error } = await supabase
    .from('room_messages')
    .insert({ room_id: roomId, sender_id: senderId, content })
    .select('*, profiles(*)')
    .single();
  
  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }
  return data as ChatMessage;
};

export const subscribeToRoomMessages = (
  roomId: number, 
  onMessageEvent: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase.channel(`room-${roomId}`);
  
  channel
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'room_messages', 
        filter: `room_id=eq.${roomId}` 
      },
      onMessageEvent
    )
    .subscribe();

  return channel;
};


// --- Friendship and DM Functions ---

export const searchUsers = async (query: string, currentUserId: string): Promise<Profile[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${query}%`)
        .not('id', 'eq', currentUserId)
        .limit(10);

    if (error) {
        console.error("Error searching users:", error);
        return [];
    }
    return data || [];
};

export const getFriendships = async (userId: string): Promise<Friendship[]> => {
    const { data, error } = await supabase
        .from('friendships')
        .select('*, requester:requester_id(*), addressee:addressee_id(*)')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    
    if (error) {
        console.error("Error fetching friendships:", error);
        return [];
    }
    return data as any[] || [];
};

export const sendFriendRequest = async (requesterId: string, addresseeId: string) => {
    const { data, error } = await supabase
        .from('friendships')
        .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' });

    if (error) {
        console.error("Error sending friend request:", error);
        throw error;
    }
    return data;
};

export const updateFriendship = async (friendshipId: number, status: FriendshipStatus) => {
    const { data, error } = await supabase
        .from('friendships')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

    if (error) {
        console.error("Error updating friendship:", error);
        throw error;
    }
    return data;
};

export const removeFriendship = async (friendshipId: number) => {
    const { data, error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

    if (error) {
        console.error("Error removing friendship:", error);
        throw error;
    }
    return data;
};

export const getDirectMessages = async (userId1: string, userId2: string): Promise<DirectMessage[]> => {
    // Direct messages disappear after 3 days.
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('direct_messages')
        .select('*, profiles:sender_id(*)')
        .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
        .gte('created_at', threeDaysAgo) // Filter for recent messages
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching DMs:", error);
        return [];
    }
    return data as any[] || [];
};

export const sendDirectMessage = async (senderId: string, receiverId: string, content: string): Promise<DirectMessage> => {
    const { data, error } = await supabase
        .from('direct_messages')
        .insert({ sender_id: senderId, receiver_id: receiverId, content })
        .select('*, profiles:sender_id(*)')
        .single();
    
    if (error) {
        console.error("Error sending DM:", error);
        throw error;
    }
    return data as DirectMessage;
};

export const subscribeToDirectMessages = (
  userId1: string,
  userId2: string,
  onMessageEvent: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase.channel(`dm-${[userId1, userId2].sort().join('-')}`);
  
  channel
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'direct_messages',
        filter: `sender_id=in.(${userId1},${userId2})`
      },
      (payload) => {
        const message = payload.new as DirectMessage;
        // Only process if the message is part of this specific conversation
        if ((message.sender_id === userId1 && message.receiver_id === userId2) ||
            (message.sender_id === userId2 && message.receiver_id === userId1)) {
            onMessageEvent(payload);
        }
      }
    )
    .subscribe();

  return channel;
};
