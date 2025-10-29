import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { 
    getChatRooms, createChatRoom, getRoomMessages, sendMessage, subscribeToRoomMessages,
    getFriendships, getDirectMessages, sendDirectMessage, subscribeToDirectMessages, getProfile,
    markDirectMessagesAsSeen
} from '../supabaseApi';
import { ChatRoom, ChatMessage, Friendship, Profile, DirectMessage } from '../types';
import RoomSidebar from './RoomSidebar';
import MessageArea from './MessageArea';
import MessageInput from './MessageInput';
import CreateRoomModal from './CreateRoomModal';
import { supabase } from '../supabaseClient';
import { ChatBubbleIcon } from './icons';

export type Conversation = (ChatRoom & { type: 'room' }) | (Profile & { type: 'dm' });

interface ChatProps {
  onSelectProfile: (userId: string) => void;
  initialUser?: Profile | null;
}

const Chat: React.FC<ChatProps> = ({ onSelectProfile, initialUser }) => {
  const { user, profile, onlineUsers, refreshUnreadDms } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<(ChatMessage | DirectMessage)[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [profileCache, setProfileCache] = useState<Map<string, Profile>>(new Map());
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAnonymity, setModalAnonymity] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // --- Reply state ---
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | DirectMessage | null>(null);

  // --- Real-time features state ---
  const [typingUsers, setTypingUsers] = useState<Profile[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimers = useRef<Map<string, number>>(new Map());

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
        
        // FIX: RLS policies in Supabase can cause this to be empty.
        // Instead of erroring out, we'll show a welcome message.
        if (chatRooms.length === 0 && friendships.length === 0) {
            console.warn("No chat rooms or friends found. Please check database permissions (RLS) or create a room to get started.");
        }
        
        setRooms(chatRooms);

        const acceptedFriends = friendships
        .filter(f => f.status === 'accepted')
        .map(f => f.requester_id === user.id ? f.addressee : f.requester);
        setFriends(acceptedFriends);

        if (chatRooms.length > 0) {
            setActiveConversation(current => {
                if (!current) {
                    return { ...chatRooms[0], type: 'room' };
                }
                return current;
            });
        }
    } catch (error) {
        console.error("Failed to fetch initial chat data", error);
        setInitializationError("An error occurred while loading chat data.");
    } finally {
        setLoading(false);
    }
  }, [user]);

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

  useEffect(() => {
    if (!activeConversation || !user || !profile) return;

    setTypingUsers([]); // Clear on conversation change
    setReplyToMessage(null); // Clear reply on conversation change
    typingTimers.current.forEach(timerId => clearTimeout(timerId));
    typingTimers.current.clear();

    let subscription: RealtimeChannel;
    
    const handleMessageEvent = async (payload: any) => {
        const { eventType, new: newMessage } = payload;
        
        // Ensure profile is cached for sender
        if (newMessage.sender_id && !profileCache.has(newMessage.sender_id)) {
            const senderProfile = await getProfile(newMessage.sender_id);
            if (senderProfile) {
                setProfileCache(prev => new Map(prev).set(senderProfile.id, senderProfile));
                newMessage.profiles = senderProfile;
            }
        } else if (newMessage.sender_id) {
            newMessage.profiles = profileCache.get(newMessage.sender_id) || null;
        }

        if (eventType === 'INSERT') {
            setMessages(prev => {
                // Prevent adding a duplicate message if it was already added from the send response
                if (prev.some(m => m.id === newMessage.id)) {
                    return prev;
                }
                return [...prev, newMessage];
            });
            // If the incoming message is a DM not sent by us, mark it as seen
            if (activeConversation.type === 'dm' && newMessage.sender_id === activeConversation.id) {
                await markDirectMessagesAsSeen(activeConversation.id, user.id);
                refreshUnreadDms();
            }
        }
        if (eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, ...newMessage } : m));
        }
    };

    const handleTypingEvent = (payload: { userId: string, username: string }) => {
        if (payload.userId !== user.id) {
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
            }, 3000); // Remove after 3 seconds of inactivity
            typingTimers.current.set(payload.userId, timerId);
        }
    };

    const handleStopTypingEvent = (payload: { userId: string }) => {
        if (typingTimers.current.has(payload.userId)) {
            clearTimeout(typingTimers.current.get(payload.userId)!);
            typingTimers.current.delete(payload.userId);
        }
        setTypingUsers(prev => prev.filter(u => u.id !== payload.userId));
    };

    const fetchMessagesAndSubscribe = async () => {
      setMessagesLoading(true);
      setMessages([]);
      
      try {
          if (activeConversation.type === 'room') {
            const initialMessages = await getRoomMessages(activeConversation.id);
            setMessages(initialMessages);
            subscription = subscribeToRoomMessages(activeConversation.id, handleMessageEvent);
          } else { // DM
            const initialMessages = await getDirectMessages(user.id, activeConversation.id);
            setMessages(initialMessages);
            // Mark messages from the other user as seen by me.
            await markDirectMessagesAsSeen(activeConversation.id, user.id);
            refreshUnreadDms(); // Refresh the global count
            subscription = subscribeToDirectMessages(user.id, activeConversation.id, handleMessageEvent);
          }

          subscription
            .on('broadcast', { event: 'typing' }, ({ payload }) => handleTypingEvent(payload))
            .on('broadcast', { event: 'stopped-typing' }, ({ payload }) => handleStopTypingEvent(payload));
          
          channelRef.current = subscription;
      } catch (error) {
          console.error("Failed to load conversation:", error);
      } finally {
          setMessagesLoading(false);
      }
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
  }, [activeConversation, user, profile, profileCache, refreshUnreadDms]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!user || !activeConversation || !content.trim()) return;
    try {
        let newMessage: ChatMessage | DirectMessage | null = null;
        if (activeConversation.type === 'room') {
            newMessage = await sendMessage(activeConversation.id, user.id, content.trim(), replyToMessage?.id);
        } else {
            newMessage = await sendDirectMessage(user.id, activeConversation.id, content.trim(), replyToMessage?.id);
        }
        
        // FIX: Add the new message to the local state immediately for a responsive UI.
        // The realtime handler has a de-duplication check to prevent this from appearing twice.
        if (newMessage) {
            setMessages(prev => [...prev, newMessage]);
        }
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
        setReplyToMessage(null); // Clear reply state after sending
    }
  }, [user, activeConversation, replyToMessage]);

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
  
  const messagesById = useMemo(() => {
    return messages.reduce((acc, msg) => {
        acc.set(msg.id, msg);
        return acc;
    }, new Map<number, ChatMessage | DirectMessage>());
  }, [messages]);

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex flex-col">
          <MessageArea
            user={user!}
            messages={[]}
            conversation={null}
            isLoading={true}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(true)}
            typingUsers={[]}
            onSelectProfile={onSelectProfile}
            onlineUsers={onlineUsers}
            onSetReplyTo={() => {}}
            messagesById={new Map()}
          />
          <MessageInput 
            onSendMessage={() => {}} 
            onTyping={() => {}} 
            replyToMessage={null}
            onCancelReply={() => {}}
            isAnonymousChat={false}
          />
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
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-4 text-center">
          <ChatBubbleIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Welcome to Chat</h3>
          <p>Select a conversation or create a room to get started.</p>
        </div>
      );
    }

    return (
      <>
        <MessageArea
          user={user!}
          messages={messages}
          conversation={activeConversation}
          isLoading={messagesLoading}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          typingUsers={typingUsers}
          onSelectProfile={onSelectProfile}
          onlineUsers={onlineUsers}
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
      </>
    );
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
            onlineUsers={onlineUsers}
            unreadCounts={{}} // unreadCounts prop removed for now
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            isLoading={loading}
        />
        <div className="flex flex-col flex-1 min-w-0">
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