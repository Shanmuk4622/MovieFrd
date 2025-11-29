
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
import { ChatRoom, ChatMessage, Profile, DirectMessage } from '../types';
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

  // Refs
  const activeConversationRef = useRef<Conversation | null>(null);
  const profileCache = useRef<Map<string, Profile>>(new Map());
  const activeChannelRef = useRef<RealtimeChannel | null>(null);
  const dmChannelRef = useRef<RealtimeChannel | null>(null);

  // Update ref when active conversation changes
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

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
    // Clear unread count for this convo
    const key = conversation.type === 'room' ? `room-${conversation.id}` : `dm-${conversation.id}`;
    setUnreadCounts(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
    });
  }

  // --- 1. GLOBAL DM LISTENER (Incoming Messages Only) ---
  useEffect(() => {
    if (!user?.id) return;

    // Cleanup previous DM channel if exists
    if (dmChannelRef.current) {
        supabase.removeChannel(dmChannelRef.current);
    }

    const channel = supabase.channel(`chat-dms-global-${user.id}-${Date.now()}`)
        .on(
            'postgres_changes',
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'direct_messages',
                filter: `receiver_id=eq.${user.id}` // Only listen to DMs sent TO me
            },
            async (payload) => {
                const newMessage = payload.new as DirectMessage;
                const active = activeConversationRef.current;

                // Fetch profile if missing
                let senderProfile = profileCache.current.get(newMessage.sender_id);
                if (!senderProfile) {
                    const fetched = await getProfile(newMessage.sender_id);
                    if (fetched) {
                        senderProfile = fetched;
                        profileCache.current.set(newMessage.sender_id, fetched);
                    }
                }
                newMessage.profiles = senderProfile || null;

                // If this message belongs to the ACTIVE chat, append it
                if (active?.type === 'dm' && active.id === newMessage.sender_id) {
                    setMessages(prev => [...prev, newMessage]);
                    markDirectMessagesAsSeen(newMessage.sender_id, user.id);
                } else {
                    // Otherwise, increment unread count
                    setUnreadCounts(prev => ({
                        ...prev,
                        [`dm-${newMessage.sender_id}`]: (prev[`dm-${newMessage.sender_id}`] || 0) + 1
                    }));
                    refreshUnreadDms();
                }
            }
        )
        .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
                console.error('[Chat] DM Subscription Error. Retrying...');
                // Simple retry could be implemented here if needed
            }
        });

    dmChannelRef.current = channel;

    return () => {
        if (dmChannelRef.current) supabase.removeChannel(dmChannelRef.current);
    };
  }, [user?.id, refreshUnreadDms]);


  // --- 2. ACTIVE ROOM LISTENER (Only when in a room) ---
  useEffect(() => {
    if (!user?.id || !activeConversation || activeConversation.type !== 'room') {
        // If we leave a room, clean up the room subscription
        if (activeChannelRef.current) {
            supabase.removeChannel(activeChannelRef.current);
            activeChannelRef.current = null;
        }
        return;
    }

    const roomId = activeConversation.id;
    
    // Cleanup previous active channel (e.g. switching rooms)
    if (activeChannelRef.current) {
        supabase.removeChannel(activeChannelRef.current);
    }

    const channel = supabase.channel(`chat-room-${roomId}-${Date.now()}`)
        .on(
            'postgres_changes',
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'room_messages',
                filter: `room_id=eq.${roomId}` // Strict filter for this room
            },
            async (payload) => {
                const newMessage = payload.new as ChatMessage;
                
                // Ignore own messages (handled optimistically)
                if (newMessage.sender_id === user.id) return;

                let senderProfile = profileCache.current.get(newMessage.sender_id);
                if (!senderProfile) {
                    const fetched = await getProfile(newMessage.sender_id);
                    if (fetched) {
                        senderProfile = fetched;
                        profileCache.current.set(newMessage.sender_id, fetched);
                    }
                }
                newMessage.profiles = senderProfile || null;

                setMessages(prev => {
                    if (prev.some(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
            }
        )
        .subscribe();

    activeChannelRef.current = channel;

    return () => {
        if (activeChannelRef.current) supabase.removeChannel(activeChannelRef.current);
    };
  }, [user?.id, activeConversation?.id, activeConversation?.type]);


  // --- Load History ---
  useEffect(() => {
    if (!activeConversation || !user) return;

    setTypingUsers([]);
    setReplyToMessage(null);
    
    const loadHistory = async () => {
      setMessagesLoading(true);
      setMessages([]); 
      try {
        if (activeConversation.type === 'room') {
          const history = await getRoomMessages(activeConversation.id);
          setMessages(history);
        } else {
          const history = await getDirectMessages(user.id, activeConversation.id);
          setMessages(history);
          await markDirectMessagesAsSeen(activeConversation.id, user.id);
          refreshUnreadDms(); 
        }
      } catch (error) {
        console.error("Failed to load conversation history:", error);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadHistory();
  }, [activeConversation, user]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!user || !activeConversation || !content.trim()) return;
    
    const tempId = Date.now();
    
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

  // Handle Typing... (Simplified)
  const handleTyping = useCallback((isTyping: boolean) => {
    // Typing logic omitted for stability for now
  }, []);

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
