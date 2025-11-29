
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
  markDirectMessagesAsSeen
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
  
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | DirectMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<Profile[]>([]);

  // Refs for persistent state access without breaking effects
  const activeConversationRef = useRef<Conversation | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingChannelStatusRef = useRef<string>('CLOSED');
  const typingTimers = useRef<Map<string, number>>(new Map());
  const profileCache = useRef<Map<string, Profile>>(new Map());
  const messagesSubscriptionRef = useRef<RealtimeChannel | null>(null);
  const refreshUnreadDmsRef = useRef(refreshUnreadDms);

  // Update refs
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    refreshUnreadDmsRef.current = refreshUnreadDms;
  }, [refreshUnreadDms]);

  // Initial Data Fetch
  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setInitializationError(null);

    try {
        const [chatRooms, friendships] = await Promise.all([
            getChatRooms(),
            getFriendships(user.id)
        ]);
        
        setRooms(chatRooms);

        const acceptedFriends = friendships
        .filter(f => f.status === 'accepted')
        .map(f => f.requester_id === user.id ? f.addressee : f.requester);
        setFriends(acceptedFriends);

        // Pre-fill profile cache with friends
        acceptedFriends.forEach(f => profileCache.current.set(f.id, f));

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
    const key = conversation.type === 'room' ? `room-${conversation.id}` : `dm-${conversation.id}`;
    setUnreadCounts(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
    });
  }

  // --- ROBUST UNIFIED REALTIME SUBSCRIPTION ---
  useEffect(() => {
    if (!user?.id) return; // Depend only on user.id to prevent cycling

    // Cleanup existing subscription if it exists
    if (messagesSubscriptionRef.current) {
        console.log('[Chat] Cleaning up existing subscription before creating new one.');
        supabase.removeChannel(messagesSubscriptionRef.current);
        messagesSubscriptionRef.current = null;
    }

    const handleNewMessage = async (payload: any) => {
        try {
            const newMessage = payload.new;
            // IMPORTANT: Ignore messages sent by self to prevent duplication with optimistic updates
            if (newMessage.sender_id === user.id) {
                return;
            }

            const active = activeConversationRef.current;
            
            const isDm = !!newMessage.receiver_id;
            const senderId = newMessage.sender_id;
            
            // Get Sender Profile
            let senderProfile = profileCache.current.get(senderId);
            if (!senderProfile) {
                const fetched = await getProfile(senderId);
                if (fetched) {
                    senderProfile = fetched;
                    profileCache.current.set(senderId, fetched);
                }
            }
            newMessage.profiles = senderProfile || null;

            // Logic to determine if we should show it or notify
            let isCurrentConversation = false;
            let unreadKey = '';

            if (isDm) {
                // It's a DM
                if (active?.type === 'dm' && active.id === senderId) {
                    isCurrentConversation = true;
                }
                unreadKey = `dm-${senderId}`;
            } else {
                // It's a Room Message
                if (active?.type === 'room' && active.id === newMessage.room_id) {
                    isCurrentConversation = true;
                }
                unreadKey = `room-${newMessage.room_id}`;
            }

            if (isCurrentConversation) {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
                
                // If it's an incoming DM in active window, mark as seen
                if (isDm) {
                     markDirectMessagesAsSeen(senderId, user.id).catch(err => console.error("Failed to mark seen", err));
                }
            } else {
                // Update unread counts
                setUnreadCounts(prev => ({
                    ...prev,
                    [unreadKey]: (prev[unreadKey] || 0) + 1
                }));
                if (isDm && refreshUnreadDmsRef.current) {
                    refreshUnreadDmsRef.current();
                }
            }
        } catch (error) {
            console.error("Error processing realtime message:", error);
        }
    };

    console.log('[Chat] Initializing unified subscription...');
    const channel = supabase.channel(`unified-chat-${user.id}`)
        // Listen for DMs received by me
        .on(
            'postgres_changes',
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'direct_messages',
                filter: `receiver_id=eq.${user.id}`
            },
            handleNewMessage
        )
        // Listen for ALL Room messages
        .on(
            'postgres_changes',
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'room_messages'
            },
            handleNewMessage
        )
        .subscribe((status, err) => {
            console.log(`[Chat] Realtime connection status: ${status}`, err || '');
        });

    messagesSubscriptionRef.current = channel;

    return () => {
        if (messagesSubscriptionRef.current) {
            console.log('[Chat] Unmounting, removing subscription.');
            supabase.removeChannel(messagesSubscriptionRef.current);
            messagesSubscriptionRef.current = null;
        }
    };
  }, [user?.id]); // Only re-run if user ID changes, NOT when unread count refresh function changes.

  // --- Load History on Active Conversation Change ---
  useEffect(() => {
    if (!activeConversation || !user) return;

    setTypingUsers([]);
    setReplyToMessage(null);
    typingTimers.current.forEach(timerId => clearTimeout(timerId));
    typingTimers.current.clear();

    const loadHistory = async () => {
      setMessagesLoading(true);
      setMessages([]); // Clear previous messages immediately
      try {
        if (activeConversation.type === 'room') {
          const history = await getRoomMessages(activeConversation.id);
          setMessages(history);
        } else {
          const history = await getDirectMessages(user.id, activeConversation.id);
          setMessages(history);
          await markDirectMessagesAsSeen(activeConversation.id, user.id);
          refreshUnreadDmsRef.current(); // Use ref here too
        }
      } catch (error) {
        console.error("Failed to load conversation history:", error);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadHistory();
  }, [activeConversation, user]); // Removed refreshUnreadDms dependency


  // --- Typing Indicators (Specific Channel per conversation) ---
  useEffect(() => {
    if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
    }
    typingChannelStatusRef.current = 'CLOSED';
    
    if (activeConversation && user) {
        const channelName = activeConversation.type === 'room' 
            ? `typing-room-${activeConversation.id}` 
            : `typing-dm-${[user.id, activeConversation.id].sort().join('-')}`;
        
        const channel = supabase.channel(channelName);
        
        channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
            if (payload.userId === user.id) return; // Ignore self
            
            if (typingTimers.current.has(payload.userId)) {
                clearTimeout(typingTimers.current.get(payload.userId)!);
            }
            
            setTypingUsers(prev => {
                if (prev.find(u => u.id === payload.userId)) return prev;
                return [...prev, { id: payload.userId, username: payload.username, avatar_url: null }];
            });

            const timerId = window.setTimeout(() => {
                setTypingUsers(prev => prev.filter(u => u.id !== payload.userId));
                typingTimers.current.delete(payload.userId);
            }, 3000);
            
            typingTimers.current.set(payload.userId, timerId);
        })
        .subscribe((status) => {
            typingChannelStatusRef.current = status;
        });

        typingChannelRef.current = channel;
    }
    
    return () => {
        if (typingChannelRef.current) {
            supabase.removeChannel(typingChannelRef.current);
        }
    }
  }, [activeConversation, user]);


  const handleSendMessage = useCallback(async (content: string) => {
    if (!user || !activeConversation || !content.trim()) return;
    
    let tempId = Date.now();
    
    try {
        // Optimistic Update
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
            // Replace optimistic message with real one
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
        // Rollback
        setMessages(prev => prev.filter(m => m.id !== tempId));
        if(replyToMessage) setReplyToMessage(replyToMessage);
    }
  }, [user, profile, activeConversation, replyToMessage, setNotification]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (typingChannelRef.current && user && profile && typingChannelStatusRef.current === 'SUBSCRIBED') {
        typingChannelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: user.id, username: profile.username },
        }).catch(err => console.error("Typing broadcast error (ignored):", err));
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
      <div className="flex h-full bg-white dark:bg-gray-800 overflow-hidden relative">
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
