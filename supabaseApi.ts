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

// --- New Function for Friend Activity ---
// FIX: Define a specific type for friend activity to ensure type safety.
// This resolves an 'unknown' type error in Dashboard.tsx.
export type FriendActivity = UserMovieList & {
    created_at: string;
    profiles: Profile | null;
};

export const getFriendActivity = async (userId: string): Promise<FriendActivity[]> => {
    // Step 1: Get the list of accepted friend IDs
    const { data: friendships, error: friendsError } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'accepted');

    if (friendsError) {
        console.error("Error fetching friends for activity feed:", friendsError);
        throw friendsError;
    }
    
    const friendIds = friendships.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id);

    if (friendIds.length === 0) {
        return [];
    }

    // Step 2: Fetch the latest 20 activities from those friends, joining their profile info
    const { data, error } = await supabase
        .from('user_movie_lists')
        .select('*, profiles(*)')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching friend activity:", error);
        throw error;
    }
    return (data as FriendActivity[]) || [];
};


// --- Chat Functions ---

export const getChatRooms = async (): Promise<ChatRoom[]> => {
  // This now calls a database function to efficiently filter out inactive rooms.
  // The user must add this function to their Supabase project. See `supabase/functions.sql`.
  const { data, error } = await supabase.rpc('get_visible_chat_rooms');

  if (error) {
    console.error('Error fetching chat rooms via RPC. Did you add the `get_visible_chat_rooms` function to your Supabase project? Falling back to fetching all rooms.', error);
    // Fallback for users who haven't added the function yet, so the app doesn't break.
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('name', { ascending: true });
    
    if (fallbackError) {
      console.error('Error fetching chat rooms on fallback:', fallbackError);
      return [];
    }
    return fallbackData || [];
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

export const sendMessage = async (roomId: number, senderId: string, content: string, replyToMessageId?: number | null): Promise<ChatMessage> => {
  const { data, error } = await supabase
    .from('room_messages')
    .insert({ room_id: roomId, sender_id: senderId, content, reply_to_message_id: replyToMessageId || null })
    .select('*, profiles(*)')
    .single();
  
  if (error) {
    console.error("Error sending message:", error.message);
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

export const getAllUsers = async (currentUserId: string): Promise<Profile[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'eq', currentUserId)
        .order('username', { ascending: true });

    if (error) {
        console.error("Error fetching all users:", error);
        return [];
    }
    return data || [];
};

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

// Fetches friend recommendations using a database function.
// The user MUST add the `get_friend_recommendations` function to their Supabase project.
export const getFriendRecommendations = async (userId: string): Promise<Profile[]> => {
    const { data, error } = await supabase.rpc('get_friend_recommendations', {
        current_user_id: userId,
        recommendation_limit: 10
    });

    if (error) {
        console.error("Error fetching friend recommendations via RPC. Did you add the SQL function to your Supabase project?", error);
        return [];
    }
    return data || [];
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

export const sendDirectMessage = async (senderId: string, receiverId: string, content: string, replyToMessageId?: number | null): Promise<DirectMessage> => {
    const { data, error } = await supabase
        .from('direct_messages')
        .insert({ sender_id: senderId, receiver_id: receiverId, content, reply_to_message_id: replyToMessageId || null })
        .select('*, profiles:sender_id(*)')
        .single();
    
    if (error) {
        console.error("Error sending DM:", error.message);
        throw error;
    }
    return data as DirectMessage;
};

export const markDirectMessagesAsSeen = async (senderId: string, receiverId: string) => {
    const { error } = await supabase.rpc('mark_dms_as_seen', {
        p_sender_id: senderId,
        p_receiver_id: receiverId,
    });
    if (error) {
        console.error("Error marking DMs as seen. Did you add the `mark_dms_as_seen` function to your Supabase project?", error);
        // Don't throw, as this is a non-critical background task.
    }
};

/*
-- The RPC function 'get_unread_dm_count' is the most performant way to get this count.
-- However, to prevent errors for users who have not set it up, this app now uses a client-side query.
-- You can still add the function below to your Supabase project for better performance.
-- Go to Database > Functions > Create a new function, and paste the code.

CREATE OR REPLACE FUNCTION get_unread_dm_count()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    unread_count INT;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM direct_messages
    WHERE
        receiver_id = auth.uid() AND
        NOT(auth.uid() = ANY(COALESCE(seen_by, '{}')));
    
    RETURN unread_count;
END;
$$;
*/
export const getUnreadDmCount = async (): Promise<number> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
        if (sessionError) console.error("Error getting session for DM count:", sessionError);
        return 0;
    }
    const userId = session.user.id;

    // Perform the count using a standard query instead of an RPC call.
    // This counts messages where the current user is the receiver and
    // their ID is not in the 'seen_by' array.
    const { count, error } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .not('seen_by', 'cs', `{${userId}}`);

    if (error) {
        console.error("Error fetching unread DM count:", error);
        return 0;
    }

    return count || 0;
};

/**
 * Subscribes to direct messages.
 * Note: Complex OR filters in filters often fail in Realtime.
 * It is safer to use simple `receiver_id=eq` filters.
 * Prefer implementing manual subscriptions in components or using simple filters.
 */
export const subscribeToDirectMessages = (
  userId1: string,
  userId2: string,
  onMessageEvent: (payload: any) => void
): RealtimeChannel => {
  // Fallback simplified subscription
  // In production, use the multi-channel approach implemented in Chat.tsx
  const channel = supabase.channel(`dm-${[userId1, userId2].sort().join('-')}`);
  
  channel
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'direct_messages',
        filter: `receiver_id=eq.${userId1}` 
      },
      onMessageEvent
    )
    .subscribe();

  return channel;
};

/**
 * Subscribes to all direct message events (inserts, updates, deletes)
 * where the given user is either the sender or the receiver.
 * This is more efficient than subscribing to individual conversations.
 */
export const subscribeToAllDirectMessagesForUser = (
  userId: string,
  onMessageEvent: (payload: any) => void
): RealtimeChannel => {
  // Use a unique, stable channel name for the user
  const channel = supabase.channel(`dms-for-${userId}`);
  
  channel
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'direct_messages',
        // RLS policies will still apply, but this filter efficiently narrows down events
        filter: `receiver_id=eq.${userId}` 
      },
      onMessageEvent
    )
    .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
            console.error(`Failed to subscribe to DMs:`, err);
        }
    });

  return channel;
};

// ============================================
// Anonymous Chat Functions (Omegle-like)
// ============================================

/**
 * Join the anonymous chat queue and get paired with a stranger
 * Returns session info: session_id, partner_id (if paired), is_new_session
 */
export const findAnonymousChatPartner = async (): Promise<{
  session_id: string;
  partner_id: string | null;
  is_new_session: boolean;
} | null> => {
  const { data, error } = await supabase.rpc('find_anonymous_chat_partner');
  
  if (error) {
    console.error('Error finding anonymous chat partner:', error);
    return null;
  }
  
  if (!data || data.length === 0) return null;
  
  // Map the result column names
  const result = data[0];
  return {
    session_id: result.result_session_id,
    partner_id: result.result_partner_id,
    is_new_session: result.result_is_new_session
  };
};

/**
 * Get the current active anonymous session for the user
 */
export const getActiveAnonymousSession = async (): Promise<any | null> => {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) return null;
  
  const { data, error } = await supabase
    .from('anonymous_chat_sessions')
    .select('*')
    .or(`user1_id.eq.${session.session.user.id},user2_id.eq.${session.session.user.id}`)
    .in('status', ['waiting', 'paired'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching active anonymous session:', error);
    return null;
  }
  
  return data;
};

/**
 * Get messages for an anonymous chat session
 */
export const getAnonymousChatMessages = async (sessionId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('anonymous_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching anonymous messages:', error);
    return [];
  }
  
  return data || [];
};

/**
 * Send a message in an anonymous chat session
 */
export const sendAnonymousMessage = async (
  sessionId: string,
  content: string
): Promise<any | null> => {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) return null;
  
  const { data, error } = await supabase
    .from('anonymous_chat_messages')
    .insert({
      session_id: sessionId,
      sender_id: session.session.user.id,
      content,
      is_typing: false
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error sending anonymous message:', error);
    throw error;
  }
  
  return data;
};

/**
 * Send typing indicator in anonymous chat
 */
export const sendAnonymousTyping = async (
  sessionId: string,
  isTyping: boolean
): Promise<void> => {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user) return;
  
  // We'll use a realtime broadcast for typing indicators instead of DB inserts
  const channel = supabase.channel(`anon-typing-${sessionId}`);
  channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: {
      user_id: session.session.user.id,
      is_typing: isTyping
    }
  });
};

/**
 * End an anonymous chat session and archive it
 */
export const endAnonymousSession = async (sessionId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('end_anonymous_chat_session', {
    p_session_id: sessionId
  });
  
  if (error) {
    console.error('Error ending anonymous session:', error);
    return false;
  }
  
  return data === true;
};

/**
 * Get archived anonymous chats for the current user
 */
export const getAnonymousChatArchive = async (): Promise<any[]> => {
  const { data, error } = await supabase.rpc('get_user_anonymous_archive');
  
  if (error) {
    console.error('Error fetching anonymous chat archive:', error);
    return [];
  }
  
  return data || [];
};

/**
 * Subscribe to anonymous session updates (pairing, ending)
 */
export const subscribeToAnonymousSession = (
  sessionId: string,
  onUpdate: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase.channel(`anon-session-${sessionId}`);
  
  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'anonymous_chat_sessions',
        filter: `session_id=eq.${sessionId}`
      },
      onUpdate
    )
    .subscribe();
  
  return channel;
};

/**
 * Subscribe to anonymous chat messages
 */
export const subscribeToAnonymousMessages = (
  sessionId: string,
  onMessage: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase.channel(`anon-messages-${sessionId}`);
  
  channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'anonymous_chat_messages',
        filter: `session_id=eq.${sessionId}`
      },
      onMessage
    )
    .subscribe();
  
  return channel;
};

/**
 * Subscribe to typing indicators in anonymous chat
 */
export const subscribeToAnonymousTyping = (
  sessionId: string,
  onTyping: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase.channel(`anon-typing-${sessionId}`);
  
  channel
    .on('broadcast', { event: 'typing' }, onTyping)
    .subscribe();
  
  return channel;
};
