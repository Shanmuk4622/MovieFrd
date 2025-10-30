import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '../../contexts/AuthContext';
import { 
    getChatRooms, createChatRoom, getRoomMessages, sendMessage, 
    getFriendships, getDirectMessages, sendDirectMessage,
    getProfile, markDirectMessagesAsSeen
} from '../../supabaseApi';
import { ChatRoom, ChatMessage, Profile, DirectMessage } from '../../types';
import RoomSidebar from './RoomSidebar';
import MessageArea from './MessageArea';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import CreateRoomModal from './CreateRoomModal';
import { supabase } from '../../supabaseClient';
import { eventBus } from '../../utils/eventBus';
import { ChatBubbleIcon } from '../icons';

export type Conversation = (ChatRoom & { type: 'room' }) | (Profile & { type: 'dm' });

interface ChatProps {
  onSelectProfile: (userId: string) => void;
  initialUser?: Profile | null;
}

const Chat: React.FC<ChatProps> = ({ onSelectProfile, initialUser }) => {
  const { user, profile, onlineUsers, refreshUnreadDms, setNotification } = useAuth();
  
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<(ChatMessage | DirectMessage)[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAnonymity, setModalAnonymity] = useState(false);
  
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | DirectMessage | null>(null);

  const [typingUsers, setTypingUsers] = useState<Profile[]>([]);
  const [profileCache, setProfileCache] = useState<Map<string, Profile>>(new Map());

  const activeConversationRef = useRef(activeConversation);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimers = useRef<Map<string, number>>(new Map());
  const subscriptions = useRef<Map<string, RealtimeChannel>>(new Map());

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);
  
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setActiveConversation(conversation);
    setIsSidebarOpen(false);
    
    const conversationId = conversation.type === 'dm' ? conversation.id : `room-${conversation.id}`;
    setUnreadCounts(prev => {
        if (!prev[conversationId]) return prev;
        const newCounts = { ...prev };
        delete newCounts[conversationId];
        return newCounts;
    });
  }, []);

  // Effect 1: Fetch initial static data (rooms, friends)
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setInitializationError(null);

    const fetchInitialData = async () => {
        try {
            const [chatRoomsData, friendshipsData] = await Promise.all([getChatRooms(), getFriendships(user.id)]);
            setRooms(chatRoomsData);
            
            const acceptedFriends = friendshipsData
                .filter(f => f.status === 'accepted')
                .map(f => f.requester_id === user.id ? f.addressee : f.requester);
            setFriends(acceptedFriends);

            if (initialUser) {
                const friendToSelect = acceptedFriends.find(f => f.id === initialUser.id);
                if (friendToSelect) handleSelectConversation({ ...friendToSelect, type: 'dm' });
            } else if (chatRoomsData.length > 0 && !activeConversationRef.current) {
                handleSelectConversation({ ...chatRoomsData[0], type: 'room' });
            }
        } catch (error) {
            console.error("Failed to fetch initial chat data", error);
            setInitializationError("An error occurred while loading chat data.");
        } finally {
            setLoading(false);
        }
    };
    fetchInitialData();
  }, [user, initialUser, handleSelectConversation]);

  // Effect 2: Listen to centralized realtime events via eventBus (RealtimeProvider)
  useEffect(() => {
    if (!user) return;

    const handle = async (ev: Event) => {
      const payload = (ev as CustomEvent).detail as any;
      const { table, eventType, new: newMessage } = payload;
      const currentConv = activeConversationRef.current;

      const isDm = table === 'direct_messages';
      const isRoomMessage = table === 'room_messages';

      // ignore messages emitted by this user
      if (!newMessage || newMessage.sender_id === user.id) return;

      // enrich profile if missing
      if (newMessage.sender_id) {
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
      if (currentConv?.type === 'dm' && isDm) {
        const otherUserId = currentConv.id;
        if ((newMessage.sender_id === user.id && newMessage.receiver_id === otherUserId) ||
            (newMessage.sender_id === otherUserId && newMessage.receiver_id === user.id)) {
          isForActiveConversation = true;
        }
      } else if (currentConv?.type === 'room' && isRoomMessage) {
        if (newMessage.room_id === currentConv.id) isForActiveConversation = true;
      }

      if (isForActiveConversation) {
        if (eventType === 'INSERT') {
          setMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
          if (currentConv?.type === 'dm' && newMessage.sender_id === currentConv.id) {
            await markDirectMessagesAsSeen(currentConv.id, user.id);
            refreshUnreadDms();
          }
        } else if (eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, ...newMessage } : m));
        }
        return;
      }

      // Not for active conversation -> update unread counters and optionally notify
      if (eventType === 'INSERT') {
        if (isDm && newMessage.receiver_id === user.id) {
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

  // Effect 3: Fetch message history for active conversation
  useEffect(() => {
    if (!activeConversation || !user) return;
    setReplyToMessage(null);
    const fetchMessageHistory = async () => {
      setMessagesLoading(true);
      setMessages([]);
      try {
        if (activeConversation.type === 'room') {
          setMessages(await getRoomMessages(activeConversation.id));
        } else {
          setMessages(await getDirectMessages(user.id, activeConversation.id));
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

  // Fallback polling to ensure messages appear if realtime messages are missed
  useEffect(() => {
    if (!user || !activeConversation) return;

    let cancelled = false;
    const pollIntervalMs = 2500;

    const pollOnce = async () => {
      try {
        if (cancelled) return;
        if (activeConversation.type === 'room') {
          const latest = await getRoomMessages(activeConversation.id);
          setMessages(prev => {
            const existing = new Set(prev.map(m => m.id));
            const toAdd = latest.filter(m => !existing.has(m.id));
            if (toAdd.length === 0) return prev;
            return [...prev, ...toAdd];
          });
        } else {
          const latest = await getDirectMessages(user.id, activeConversation.id);
          setMessages(prev => {
            const existing = new Set(prev.map(m => m.id));
            const toAdd = latest.filter(m => !existing.has(m.id));
            if (toAdd.length === 0) return prev;
            return [...prev, ...toAdd];
          });
        }
      } catch (e) {
        // don't spam logs for intermittent network issues
        // eslint-disable-next-line no-console
        console.debug('Polling error', e);
      }
    };

    // initial poll, then interval
    pollOnce();
    const intervalId = window.setInterval(pollOnce, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(intervalId as unknown as number);
    };
  }, [user, activeConversation]);

  // Effect 4: Real-time typing indicators
  useEffect(() => {
    if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current).catch(() => {});
        typingChannelRef.current = null;
    }
    typingTimers.current.forEach(timerId => clearTimeout(timerId));
    typingTimers.current.clear();
    setTypingUsers([]);

    if (activeConversation && user) {
        const channelName = activeConversation.type === 'room' 
            ? `typing-room-${activeConversation.id}` 
            : `typing-dm-${[user.id, activeConversation.id].sort().join('-')}`;
        
        const channel = supabase.channel(channelName, { config: { broadcast: { self: false } } });

        channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
            if (typingTimers.current.has(payload.userId)) {
                clearTimeout(typingTimers.current.get(payload.userId)!);
            }
            setTypingUsers(prev => prev.find(u => u.id === payload.userId) ? prev : [...prev, { id: payload.userId, username: payload.username, avatar_url: null }]);
            const timerId = window.setTimeout(() => {
                setTypingUsers(prev => prev.filter(u => u.id !== payload.userId));
                typingTimers.current.delete(payload.userId);
            }, 3000);
            typingTimers.current.set(payload.userId, timerId);
        }).subscribe();
        typingChannelRef.current = channel;
    }

    return () => {
        if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current).catch(()=>{});
        typingTimers.current.forEach(timerId => clearTimeout(timerId));
    };
  }, [activeConversation, user]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!user || !activeConversation || !content.trim()) return;
    const tempId = Date.now();
    try {
        setReplyToMessage(null);
        if (activeConversation.type === 'room') {
            const optimisticMessage: ChatMessage = { id: tempId, room_id: activeConversation.id, sender_id: user.id, content: content.trim(), created_at: new Date().toISOString(), profiles: profile, reply_to_message_id: replyToMessage?.id || null };
            setMessages(prev => [...prev, optimisticMessage]);
            const savedMessage = await sendMessage(activeConversation.id, user.id, content.trim(), replyToMessage?.id);
            setMessages(prev => prev.map(m => m.id === tempId ? savedMessage : m));
        } else {
            const optimisticMessage: DirectMessage = { id: tempId, sender_id: user.id, receiver_id: activeConversation.id, content: content.trim(), created_at: new Date().toISOString(), profiles: profile, reply_to_message_id: replyToMessage?.id || null };
            setMessages(prev => [...prev, optimisticMessage]);
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
    if (isTyping && typingChannelRef.current && user && profile) {
        typingChannelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: user.id, username: profile.username },
        });
    }
  }, [user, profile]);

  const handleOpenCreateRoom = (isAnonymous: boolean) => {
    setModalAnonymity(isAnonymous);
    setIsModalOpen(true);
  };
  
  const handleCreateRoom = async (name: string, description: string | null) => {
    const newRoom = await createChatRoom(name, description, modalAnonymity);
    setRooms(prev => [...prev, newRoom]);
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
            unreadCounts={unreadCounts}
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
