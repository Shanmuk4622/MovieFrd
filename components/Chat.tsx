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
  subscribeToRoomMessages,
  subscribeToDirectMessages
} from '../supabaseApi';
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
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAnonymity, setModalAnonymity] = useState(false);
  
  // --- Reply state ---
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | DirectMessage | null>(null);

  // --- Real-time features state ---
  const [typingUsers, setTypingUsers] = useState<Profile[]>([]);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const messageSubscriptionRef = useRef<RealtimeChannel | null>(null);
  const backgroundSubscriptionRef = useRef<RealtimeChannel | null>(null);
  const typingTimers = useRef<Map<string, number>>(new Map());
  
  // Keep track of active conversation ID to prevent race conditions in global listeners
  const activeConversationIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversation ? activeConversation.id : null;
  }, [activeConversation]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
        setReplyToMessage(null);
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
        
        setRooms(chatRooms);

        const acceptedFriends = friendships
        .filter(f => f.status === 'accepted')
        .map(f => f.requester_id === user.id ? f.addressee : f.requester);
        setFriends(acceptedFriends);

        // Only auto-select a room on desktop (lg breakpoint is 1024px)
        // On mobile, we want the user to see the list first
        if (chatRooms.length > 0 && !activeConversation && window.innerWidth >= 1024) {
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
    setIsSidebarOpen(false);
    // Clear unread count for this conversation
    const key = conversation.type === 'room' ? `room-${conversation.id}` : `dm-${conversation.id}`;
    setUnreadCounts(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
    });
  }

  // --- Primary Subscription for Active Conversation ---
  // This ensures the active chat is always live and reliable
  useEffect(() => {
    if (!activeConversation || !user) return;

    setTypingUsers([]);
    setReplyToMessage(null);
    typingTimers.current.forEach(timerId => clearTimeout(timerId));
    typingTimers.current.clear();
    
    if (messageSubscriptionRef.current) {
        supabase.removeChannel(messageSubscriptionRef.current);
        messageSubscriptionRef.current = null;
    }

    const loadAndSubscribe = async () => {
      setMessagesLoading(true);
      setMessages([]);
      try {
        if (activeConversation.type === 'room') {
          const initialMessages = await getRoomMessages(activeConversation.id);
          setMessages(initialMessages);

          messageSubscriptionRef.current = subscribeToRoomMessages(activeConversation.id, (payload) => {
              const { eventType, new: newMessage } = payload;
              if (eventType === 'INSERT') {
                  if (newMessage.sender_id && !newMessage.profiles) {
                      getProfile(newMessage.sender_id).then(p => {
                          newMessage.profiles = p;
                          setMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
                      });
                  } else {
                      setMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
                  }
              }
          });

        } else { // DM
          const initialMessages = await getDirectMessages(user.id, activeConversation.id);
          setMessages(initialMessages);
          await markDirectMessagesAsSeen(activeConversation.id, user.id);
          refreshUnreadDms();

          messageSubscriptionRef.current = subscribeToDirectMessages(user.id, activeConversation.id, (payload) => {
             const { eventType, new: newMessage } = payload;
              if (eventType === 'INSERT') {
                  if (newMessage.sender_id && !newMessage.profiles) {
                      getProfile(newMessage.sender_id).then(p => {
                          newMessage.profiles = p;
                          setMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
                      });
                  } else {
                      setMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
                  }
                  
                  if (newMessage.sender_id === activeConversation.id) {
                      markDirectMessagesAsSeen(activeConversation.id, user.id);
                  }
              }
          });
        }
      } catch (error) {
        console.error("Failed to load conversation history:", error);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadAndSubscribe();
    
    return () => {
        if (messageSubscriptionRef.current) {
            supabase.removeChannel(messageSubscriptionRef.current);
            messageSubscriptionRef.current = null;
        }
    };
  }, [activeConversation, user, refreshUnreadDms]);


  // --- Background Listener for Sidebar Counts ---
  // Replaces the global event bus. Directly listens for relevant messages to update counters.
  useEffect(() => {
    if (!user) return;

    // Clean up previous subscription if any
    if (backgroundSubscriptionRef.current) {
        supabase.removeChannel(backgroundSubscriptionRef.current);
        backgroundSubscriptionRef.current = null;
    }

    const channel = supabase.channel(`chat-background-${user.id}`);

    channel
      // Listen for new DMs sent to me
      .on(
        'postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`
        }, 
        async (payload) => {
          const newMessage = payload.new as DirectMessage;
          const currentActiveId = activeConversationIdRef.current;
          
          // Only count as unread if it's NOT the currently active DM
          if (currentActiveId !== newMessage.sender_id) {
             setUnreadCounts(prev => ({ 
                 ...prev, 
                 [`dm-${newMessage.sender_id}`]: (prev[`dm-${newMessage.sender_id}`] || 0) + 1 
             }));
             refreshUnreadDms();
             
             // Show notification
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
                // Silently fail notification if profile fetch fails
             }
          }
        }
      )
      // Listen for all new Room Messages
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages'
        },
        (payload) => {
           const newMessage = payload.new as ChatMessage;
           const currentActiveId = activeConversationIdRef.current;

           // Only count as unread if it's NOT the currently active room
           if (currentActiveId !== newMessage.room_id) {
              const roomKey = `room-${newMessage.room_id}`;
              setUnreadCounts(prev => ({ ...prev, [roomKey]: (prev[roomKey] || 0) + 1 }));
           }
        }
      )
      .subscribe();

    backgroundSubscriptionRef.current = channel;

    return () => {
        if (backgroundSubscriptionRef.current) {
            supabase.removeChannel(backgroundSubscriptionRef.current);
        }
    };
  }, [user, refreshUnreadDms, setNotification]);


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
    // Add to list and select it
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
        <div className={`flex flex-col flex-1 min-w-0 overflow-hidden transition-transform duration-300 ease-in-out ${activeConversation ? 'flex' : 'hidden lg:flex'}`}>
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