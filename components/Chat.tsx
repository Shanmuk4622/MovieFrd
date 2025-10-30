import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import {
  getChatRooms,
  createChatRoom,
  getRoomMessages,
  sendMessage,
  getFriendships,
  getDirectMessages,
  sendDirectMessage,
  getProfile,
  markDirectMessagesAsSeen,
} from '../supabaseApi';
import { eventBus } from '../utils/eventBus';
import { ChatRoom, ChatMessage, Friendship, Profile, DirectMessage } from '../types';
import RoomSidebar from './RoomSidebar';
import MessageArea from './MessageArea';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import CreateRoomModal from './CreateRoomModal';
import { supabase } from '../supabaseClient';
import { ChatBubbleIcon } from './icons';

export type Conversation = (ChatRoom & { type: 'room' }) | (Profile & { type: 'dm' });

interface ChatProps {
  onSelectProfile: (userId: string) => void;
  initialUser?: Profile | null;
}

const Chat: React.FC<ChatProps> = ({ onSelectProfile, initialUser }) => {
  const { user, profile, onlineUsers, refreshUnreadDms, setNotification } = useAuth();
  
  // --- Component-local state ---
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<(ChatMessage | DirectMessage)[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [profileCache, setProfileCache] = useState<Map<string, Profile>>(new Map());
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAnonymity, setModalAnonymity] = useState(false);
  
  // --- Reply state ---
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | DirectMessage | null>(null);

  // --- Real-time features state ---
  const [typingUsers, setTypingUsers] = useState<Profile[]>([]);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimers = useRef<Map<string, number>>(new Map());
  
  // --- Ref for stale closure prevention in subscriptions ---
  const activeConversationRef = useRef(activeConversation);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
        setReplyToMessage(null); // Also cancel reply on escape
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
    setInitializationError(null);

    try {
        const chatRooms = await getChatRooms();
        const friendships = await getFriendships(user.id);
        
        if (chatRooms.length === 0 && friendships.length === 0) {
            console.warn("No chat rooms or friends found. Please check database permissions (RLS) or create a room to get started.");
        }
        
        setRooms(chatRooms);

        const acceptedFriends = friendships
        .filter(f => f.status === 'accepted')
        .map(f => f.requester_id === user.id ? f.addressee : f.requester);
        setFriends(acceptedFriends);

        if (chatRooms.length > 0 && !activeConversation) {
            setActiveConversation({ ...chatRooms[0], type: 'room' });
        }
    } catch (error) {
        console.error("Failed to fetch initial chat data", error);
        setInitializationError("An error occurred while loading chat data.");
    } finally {
        setLoading(false);
    }
  }, [user, activeConversation]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);
  
  // Effect to handle selecting a user from a notification or external link
  useEffect(() => {
    if (initialUser && friends.length > 0) {
        const friendToSelect = friends.find(f => f.id === initialUser.id);
        if (friendToSelect && activeConversation?.id !== initialUser.id) {
            setActiveConversation({ ...friendToSelect, type: 'dm' });
        }
    }
  }, [initialUser, friends, activeConversation]);

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  }

  // Effect to fetch message history when conversation changes
  useEffect(() => {
    if (!activeConversation || !user) return;

    setTypingUsers([]); // Clear on conversation change
    setReplyToMessage(null); // Clear reply on conversation change
    typingTimers.current.forEach(timerId => clearTimeout(timerId));
    typingTimers.current.clear();
    
    const fetchMessageHistory = async () => {
      setMessagesLoading(true);
      setMessages([]);
      try {
        if (activeConversation.type === 'room') {
          const initialMessages = await getRoomMessages(activeConversation.id);
          setMessages(initialMessages);
        } else { // DM
          const initialMessages = await getDirectMessages(user.id, activeConversation.id);
          setMessages(initialMessages);
          await markDirectMessagesAsSeen(activeConversation.id, user.id);
          refreshUnreadDms();
        }
      } catch (error) {
        console.error("Failed to load conversation history:", error);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessageHistory();
  }, [activeConversation, user, refreshUnreadDms]);


  // Centralized realtime message handler (listens to RealtimeContext via eventBus)
  useEffect(() => {
    if (!user) return;

    const handle = async (ev: Event) => {
      const payload = (ev as CustomEvent).detail as any;
      const { table, eventType, new: newMessage } = payload;
      const currentActiveConversation = activeConversationRef.current;

      const isDm = table === 'direct_messages';
      const isRoomMessage = table === 'room_messages';

      // Enrich sender profile if needed
      if (newMessage?.sender_id) {
        const senderIdStr = String(newMessage.sender_id);
        if (!profileCache.has(senderIdStr)) {
          try {
            const p = await getProfile(senderIdStr);
            if (p) setProfileCache(prev => new Map(prev).set(p.id, p));
            newMessage.profiles = p || null;
          } catch (e) {
            // ignore
          }
        } else {
          newMessage.profiles = profileCache.get(senderIdStr) || null;
        }
      }

      let isForActiveConversation = false;
      if (currentActiveConversation?.type === 'dm' && isDm) {
        const otherUserId = currentActiveConversation.id;
        if ((newMessage.sender_id === user.id && newMessage.receiver_id === otherUserId) ||
            (newMessage.sender_id === otherUserId && newMessage.receiver_id === user.id)) {
          isForActiveConversation = true;
        }
      } else if (currentActiveConversation?.type === 'room' && isRoomMessage) {
        if (newMessage.room_id === currentActiveConversation.id) {
          isForActiveConversation = true;
        }
      }

      // New message for active conversation -> append (avoid duplicates)
      if (isForActiveConversation) {
        if (eventType === 'INSERT' || eventType === 'INSERT') {
          setMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
          if (currentActiveConversation?.type === 'dm' && newMessage.sender_id === currentActiveConversation.id) {
            await markDirectMessagesAsSeen(currentActiveConversation.id, user.id);
            refreshUnreadDms();
          }
        } else if (eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, ...newMessage } : m));
        }
        return;
      }

      // Not for active conversation -> update unread counters and optionally show notification
      if (eventType === 'INSERT') {
        if (isDm && newMessage.receiver_id === user.id) {
          // increment unread for sender
          setUnreadCounts(prev => ({ ...prev, [newMessage.sender_id]: (prev[newMessage.sender_id] || 0) + 1 }));
          refreshUnreadDms();
          try {
            const senderProfile = newMessage.profiles || (await getProfile(String(newMessage.sender_id)));
            if (senderProfile) {
              setNotification({
                message: `${senderProfile.username}: ${String(newMessage.content).slice(0, 80)}`,
                type: 'dm',
                senderProfile,
              });
            }
          } catch (e) {
            setNotification({ message: `New message`, type: 'dm' });
          }
        }

        if (isRoomMessage) {
          const roomKey = `room-${newMessage.room_id}`;
          setUnreadCounts(prev => ({ ...prev, [roomKey]: (prev[roomKey] || 0) + 1 }));
        }
      }
    };

    eventBus.addEventListener('realtime:message', handle as EventListener);
    return () => eventBus.removeEventListener('realtime:message', handle as EventListener);
  }, [user, profileCache, activeConversation, refreshUnreadDms, setNotification]);


  const handleSendMessage = useCallback(async (content: string) => {
    if (!user || !activeConversation || !content.trim()) return;
    
    let tempId = Date.now();
    
    try {
        if (activeConversation.type === 'room') {
            const optimisticMessage: ChatMessage = {
                id: tempId,
                room_id: activeConversation.id,
                sender_id: user.id,
                content: content.trim(),
                created_at: new Date().toISOString(),
                profiles: profile,
                reply_to_message_id: replyToMessage?.id || null,
            };
            setMessages(prev => [...prev, optimisticMessage]);
            setReplyToMessage(null);
            
            const savedMessage = await sendMessage(activeConversation.id, user.id, content.trim(), replyToMessage?.id);
            setMessages(prev => prev.map(m => m.id === tempId ? savedMessage : m));

        } else {
            const optimisticMessage: DirectMessage = {
                id: tempId,
                sender_id: user.id,
                receiver_id: activeConversation.id,
                content: content.trim(),
                created_at: new Date().toISOString(),
                profiles: profile,
                reply_to_message_id: replyToMessage?.id || null,
            };
            setMessages(prev => [...prev, optimisticMessage]);
            setReplyToMessage(null);

            const savedMessage = await sendDirectMessage(user.id, activeConversation.id, content.trim(), replyToMessage?.id);
            setMessages(prev => prev.map(m => m.id === tempId ? savedMessage : m));
        }

    } catch (error: any) {
        console.error("Error sending message:", error);
        setNotification({ message: `Failed to send message: ${error.message || 'Check permissions.'}`, type: 'error' });
        setMessages(prev => prev.filter(m => m.id !== tempId));
        if(replyToMessage) setReplyToMessage(replyToMessage);
    }
  }, [user, profile, activeConversation, replyToMessage, setNotification]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (!typingChannelRef.current || !user || !profile) return;
    typingChannelRef.current.send({
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
    await fetchInitialData();
    setActiveConversation({ ...newRoom, type: 'room' });
  };
  
  const messagesById = useMemo(() => {
    return messages.reduce((acc, msg) => {
        acc.set(msg.id, msg);
        return acc;
    }, new Map<number, ChatMessage | DirectMessage>());
  }, [messages]);

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mb-4"></div>
            <p>Loading conversations...</p>
        </div>
      );
    }

    if (initializationError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-red-400 p-4 text-center">
          <h3 className="text-lg font-semibold mb-2">Error Loading Chat</h3>
          <p>{initializationError}</p>
        </div>
      );
    }

    if (!activeConversation) {
      return (
        <div className="flex-1 flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-4 text-center hidden lg:flex">
          <ChatBubbleIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Welcome to Chat</h3>
          <p>Select a conversation or create a room to get started.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <ChatHeader 
          activeConversation={activeConversation}
          onlineUsers={onlineUsers}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <MessageArea
          user={user!}
          messages={messages}
          conversation={activeConversation}
          isLoading={messagesLoading}
          typingUsers={typingUsers}
          onSelectProfile={onSelectProfile}
          onSetReplyTo={setReplyToMessage}
          messagesById={messagesById}
        />
        <MessageInput 
          onSendMessage={handleSendMessage} 
          onTyping={handleTyping} 
          replyToMessage={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
          isAnonymousChat={activeConversation.type === 'room' && activeConversation.is_anonymous}
        />
      </div>
    );
  };

  return (
    <>
      <div className="flex h-[calc(100vh-64px)] bg-white dark:bg-gray-800 overflow-hidden relative">
        <RoomSidebar 
            rooms={rooms} 
            friends={friends}
            activeConversation={activeConversation} 
            setActiveConversation={handleSelectConversation}
            onOpenCreateRoom={handleOpenCreateRoom}
            onlineUsers={onlineUsers}
            unreadCounts={{}}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            isLoading={loading}
        />
        <div className={`flex flex-col flex-1 min-w-0 overflow-hidden transition-transform duration-300 ease-in-out ${activeConversation ? '' : 'hidden lg:flex'}`}>
          {renderMainContent()}
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