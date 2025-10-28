import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { 
    getChatRooms, createChatRoom, getRoomMessages, sendMessage, subscribeToRoomMessages,
    getFriendships, getDirectMessages, sendDirectMessage, subscribeToDirectMessages, getProfile,
    markMessagesAsSeen
} from '../supabaseApi';
import { ChatRoom, ChatMessage, Friendship, Profile, DirectMessage } from '../types';
import RoomSidebar from './RoomSidebar';
import MessageArea from './MessageArea';
import MessageInput from './MessageInput';
import CreateRoomModal from './CreateRoomModal';
import { supabase } from '../supabaseClient';

export type Conversation = (ChatRoom & { type: 'room' }) | (Profile & { type: 'dm' });

const Chat: React.FC = () => {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<(ChatMessage | DirectMessage)[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [profileCache, setProfileCache] = useState<Map<string, Profile>>(new Map());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAnonymity, setModalAnonymity] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Real-time features state ---
  const [typingUsers, setTypingUsers] = useState<Profile[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    if (isSidebarOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen]);

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

    if (chatRooms.length > 0 && !activeConversation) {
      setActiveConversation({ ...chatRooms[0], type: 'room' });
    }
    
    setLoading(false);
  }, [user, activeConversation]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);
  
  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  }

  const handleMarkMessagesAsSeen = useCallback(async (messageIds: number[]) => {
      if (!user || !activeConversation || messageIds.length === 0) return;
      
      const type = activeConversation.type === 'room' ? 'room' : 'dm';
      await markMessagesAsSeen(messageIds, user.id, type);

  }, [user, activeConversation]);


  useEffect(() => {
    if (!activeConversation || !user || !profile) return;

    setTypingUsers([]); // Clear on conversation change
    typingTimers.current.forEach(timerId => clearTimeout(timerId));
    typingTimers.current.clear();

    let subscription: RealtimeChannel;
    
    const handleMessageEvent = async (payload: any) => {
        const { eventType, new: newMessage } = payload;
        
        // Ensure profile is cached for sender
        if (!profileCache.has(newMessage.sender_id)) {
            const senderProfile = await getProfile(newMessage.sender_id);
            if (senderProfile) {
                setProfileCache(prev => new Map(prev).set(senderProfile.id, senderProfile));
                newMessage.profiles = senderProfile;
            }
        } else {
            newMessage.profiles = profileCache.get(newMessage.sender_id) || null;
        }

        if (eventType === 'INSERT') {
            setMessages(prev => [...prev, newMessage]);
        }
        if (eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, ...newMessage } : m));
        }
    };

    const handleTypingEvent = (payload: { userId: string, username: string }) => {
        if (payload.userId !== user.id) {
            if (typingTimers.current.has(payload.userId)) {
                clearTimeout(typingTimers.current.get(payload.userId));
            }
            setTypingUsers(prev => {
                if (prev.find(u => u.id === payload.userId)) return prev;
                return [...prev, { id: payload.userId, username: payload.username, avatar_url: null }];
            });
            const timerId = window.setTimeout(() => {
                setTypingUsers(prev => prev.filter(u => u.id !== payload.userId));
                typingTimers.current.delete(payload.userId);
            }, 3000); // Remove after 3 seconds of inactivity
            typingTimers.current.set(payload.userId, timerId);
        }
    };

    const handleStopTypingEvent = (payload: { userId: string }) => {
        if (typingTimers.current.has(payload.userId)) {
            clearTimeout(typingTimers.current.get(payload.userId));
            typingTimers.current.delete(payload.userId);
        }
        setTypingUsers(prev => prev.filter(u => u.id !== payload.userId));
    };

    const fetchMessagesAndSubscribe = async () => {
      setMessagesLoading(true);
      setMessages([]);
      
      if (activeConversation.type === 'room') {
        const initialMessages = await getRoomMessages(activeConversation.id);
        setMessages(initialMessages);
        subscription = subscribeToRoomMessages(activeConversation.id, handleMessageEvent);
      } else { // DM
        const initialMessages = await getDirectMessages(user.id, activeConversation.id);
        setMessages(initialMessages);
        subscription = subscribeToDirectMessages(user.id, activeConversation.id, handleMessageEvent);
      }

      subscription
        .on('broadcast', { event: 'typing' }, ({ payload }) => handleTypingEvent(payload))
        .on('broadcast', { event: 'stopped-typing' }, ({ payload }) => handleStopTypingEvent(payload));
      
      channelRef.current = subscription;
      setMessagesLoading(false);
    };

    fetchMessagesAndSubscribe();
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      typingTimers.current.forEach(timerId => clearTimeout(timerId));
      typingTimers.current.clear();
    };
  }, [activeConversation, user, profile, profileCache]);

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

  const handleTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !user || !profile) return;
    channelRef.current.send({
        type: 'broadcast',
        event: isTyping ? 'typing' : 'stopped-typing',
        payload: { userId: user.id, username: profile.username },
    });
  }, [user, profile]);


  const handleOpenCreateRoom = (isAnonymous: boolean) => {
    setModalAnonymity(isAnonymous);
    setIsModalOpen(true);
  };
  
  const handleCreateRoom = async (name: string, description: string | null) => {
    const newRoom = await createChatRoom(name, description, modalAnonymity);
    await fetchInitialData(); // Refreshes rooms
    setActiveConversation({ ...newRoom, type: 'room' });
  };

  return (
    <>
      <div className="flex h-full bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden relative">
        <RoomSidebar 
            rooms={rooms} 
            friends={friends}
            activeConversation={activeConversation} 
            setActiveConversation={handleSelectConversation}
            onOpenCreateRoom={handleOpenCreateRoom}
            unreadCounts={{}} // unreadCounts prop removed for now
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            isLoading={loading}
        />
        <div className="flex flex-col flex-1 min-w-0">
          {activeConversation || loading ? (
            <>
              <MessageArea 
                user={user!} 
                messages={messages} 
                conversation={activeConversation} 
                isLoading={messagesLoading || !activeConversation}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(true)}
                typingUsers={typingUsers}
                onMarkAsSeen={handleMarkMessagesAsSeen}
              />
              <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
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