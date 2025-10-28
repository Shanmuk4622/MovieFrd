
import React, { useState, useEffect, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { 
    getChatRooms, createChatRoom, getRoomMessages, sendMessage, subscribeToRoomMessages,
    getFriendships, getDirectMessages, sendDirectMessage, subscribeToDirectMessages, getProfile
} from '../supabaseApi';
import { ChatRoom, ChatMessage, Friendship, Profile, DirectMessage } from '../types';
import RoomSidebar from './RoomSidebar';
import MessageArea from './MessageArea';
import MessageInput from './MessageInput';
import CreateRoomModal from './CreateRoomModal';

export type Conversation = (ChatRoom & { type: 'room' }) | (Profile & { type: 'dm' });

const Chat: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<(ChatMessage | DirectMessage)[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [profileCache, setProfileCache] = useState<Map<string, Profile>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAnonymity, setModalAnonymity] = useState(false);

  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [chatRooms, friendships] = await Promise.all([
        getChatRooms(),
        getFriendships(user.id)
    ]);
    
    setRooms(chatRooms);

    const acceptedFriends = friendships
      .filter(f => f.status === 'accepted')
      .map(f => f.requester_id === user.id ? f.addressee : f.requester);
    setFriends(acceptedFriends);

    // --- SIMULATE UNREAD MESSAGES ---
    // This is for demonstration. A real implementation would track this dynamically.
    const newUnreadCounts: Record<string, number> = {};
    const publicRooms = chatRooms.filter(r => !r.is_anonymous);
    if (publicRooms.length > 1) {
      newUnreadCounts[`room-${publicRooms[1].id}`] = 3; // Mark second public room as unread
    }
    if (acceptedFriends.length > 0) {
      newUnreadCounts[`dm-${acceptedFriends[0].id}`] = 1; // Mark first friend as unread
    }
    setUnreadCounts(newUnreadCounts);
    // --- END SIMULATION ---

    if (chatRooms.length > 0 && !activeConversation) {
      setActiveConversation({ ...chatRooms[0], type: 'room' });
    }
    
    setLoading(false);
  }, [user, activeConversation]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!activeConversation || !user) return;

    let subscription: RealtimeChannel;

    const handleNewMessage = async (newMessage: ChatMessage | DirectMessage) => {
        let profile = profileCache.get(newMessage.sender_id);
        if (!profile) {
            profile = await getProfile(newMessage.sender_id);
            if (profile) {
                setProfileCache(prev => new Map(prev).set(profile!.id, profile!));
            }
        }
        newMessage.profiles = profile || null;
        setMessages((prev) => [...prev, newMessage]);
    };

    const fetchMessagesAndSubscribe = async () => {
      setMessagesLoading(true);
      setMessages([]);
      
      if (activeConversation.type === 'room') {
        const initialMessages = await getRoomMessages(activeConversation.id);
        setMessages(initialMessages);
        subscription = subscribeToRoomMessages(activeConversation.id, handleNewMessage);
      } else { // DM
        const initialMessages = await getDirectMessages(user.id, activeConversation.id);
        setMessages(initialMessages);
        subscription = subscribeToDirectMessages(user.id, activeConversation.id, handleNewMessage);
      }
      setMessagesLoading(false);
    };

    fetchMessagesAndSubscribe();
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [activeConversation, user, profileCache]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!user || !activeConversation || !content.trim()) return;
    try {
        if (activeConversation.type === 'room') {
            await sendMessage(activeConversation.id, user.id, content.trim());
        } else {
            await sendDirectMessage(user.id, activeConversation.id, content.trim());
        }
    } catch (error) {
      console.error("Failed to send message", error);
    }
  }, [user, activeConversation]);

  const handleOpenCreateRoom = (isAnonymous: boolean) => {
    setModalAnonymity(isAnonymous);
    setIsModalOpen(true);
  };
  
  const handleCreateRoom = async (name: string, description: string | null) => {
    const newRoom = await createChatRoom(name, description, modalAnonymity);
    await fetchInitialData(); // Refreshes rooms
    setActiveConversation({ ...newRoom, type: 'room' });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-200px)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>;
  }

  return (
    <>
      <div className="flex h-[calc(100vh-120px)] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <RoomSidebar 
            rooms={rooms} 
            friends={friends}
            activeConversation={activeConversation} 
            setActiveConversation={setActiveConversation}
            onOpenCreateRoom={handleOpenCreateRoom}
            unreadCounts={unreadCounts}
        />
        <div className="flex flex-col flex-1">
          {activeConversation ? (
            <>
              <MessageArea user={user} messages={messages} conversation={activeConversation} isLoading={messagesLoading} />
              <MessageInput onSendMessage={handleSendMessage} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 p-4 text-center">
              <p>Select a room or a friend to start chatting.</p>
            </div>
          )}
        </div>
      </div>
      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateRoom}
        isAnonymousDefault={modalAnonymity}
      />
    </>
  );
};

export default Chat;