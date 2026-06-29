import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { ChatRoom, ChatMessage, Profile, DirectMessage } from '../types';
import RoomSidebar from './RoomSidebar';
import MessageArea from './MessageArea';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import CreateRoomModal from './CreateRoomModal';
import { eventBus, RealtimeMessageEvent } from '../utils/eventBus';
import { useRealtime } from '../contexts/RealtimeContext';
import { ChatBubbleIcon } from './icons';
import AnonymousChat from './AnonymousChat';
import { Spinner } from './ui';

export type Conversation = (ChatRoom & { type: 'room' }) | (Profile & { type: 'dm' });

interface ChatProps {
  onSelectProfile: (userId: string) => void;
  initialUser?: Profile | null;
}

const Chat: React.FC<ChatProps> = ({ onSelectProfile, initialUser }) => {
  const { user, profile, onlineUsers, refreshUnreadDms, setNotification } = useAuth();
  const realtime = useRealtime();

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
  const [showAnonymousChat, setShowAnonymousChat] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | DirectMessage | null>(null);
  const [typingUsers] = useState<Profile[]>([]);

  const activeConversationRef = useRef<Conversation | null>(null);
  const profileCache = useRef<Map<string, Profile>>(new Map());

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setInitializationError(null);
    try {
      const [chatRooms, friendships] = await Promise.all([getChatRooms(), getFriendships(user.id)]);
      setRooms(chatRooms);

      const acceptedFriends = friendships
        .filter((f) => f.status === 'accepted')
        .map((f) => (f.requester_id === user.id ? f.addressee : f.requester));
      setFriends(acceptedFriends);
      acceptedFriends.forEach((f) => profileCache.current.set(f.id, f));

      if (chatRooms.length > 0 && !activeConversationRef.current && window.innerWidth >= 1024) {
        setActiveConversation({ ...chatRooms[0], type: 'room' });
      }
    } catch (error) {
      console.error('Failed to fetch initial chat data', error);
      setInitializationError('An error occurred while loading chat data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (initialUser && friends.length > 0) {
      const friendToSelect = friends.find((f) => f.id === initialUser.id);
      if (friendToSelect && activeConversation?.id !== initialUser.id) {
        setActiveConversation({ ...friendToSelect, type: 'dm' });
      }
    }
  }, [initialUser, friends, activeConversation]);

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setIsSidebarOpen(false);
    const key = conversation.type === 'room' ? `room-${conversation.id}` : `dm-${conversation.id}`;
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Incoming realtime messages (DMs + room messages) via the centralized eventBus.
  useEffect(() => {
    if (!user?.id) return;

    const handler = async (ev: Event) => {
      const payload = (ev as CustomEvent<RealtimeMessageEvent>).detail;
      if (!payload?.table) return;

      try {
        if (payload.table === 'direct_messages') {
          const newMessage = payload.new as DirectMessage;
          let senderProfile = profileCache.current.get(newMessage.sender_id);
          if (!senderProfile) {
            const fetched = await getProfile(newMessage.sender_id);
            if (fetched) {
              senderProfile = fetched;
              profileCache.current.set(newMessage.sender_id, fetched);
            }
          }
          newMessage.profiles = senderProfile || null;

          const active = activeConversationRef.current;
          if (active?.type === 'dm' && (active.id === newMessage.sender_id || active.id === newMessage.receiver_id)) {
            setMessages((prev) => (prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]));
            if (newMessage.receiver_id === user.id) markDirectMessagesAsSeen(newMessage.sender_id, user.id);
          } else {
            const otherId = newMessage.sender_id === user.id ? newMessage.receiver_id : newMessage.sender_id;
            setUnreadCounts((prev) => ({ ...prev, [`dm-${otherId}`]: (prev[`dm-${otherId}`] || 0) + 1 }));
            refreshUnreadDms();
          }
        }

        if (payload.table === 'room_messages') {
          const newMessage = payload.new as ChatMessage;
          const active = activeConversationRef.current;
          if (active?.type === 'room' && active.id === newMessage.room_id) {
            if (newMessage.sender_id === user.id) return; // optimistic update already shown
            let senderProfile = profileCache.current.get(newMessage.sender_id);
            if (!senderProfile) {
              const fetched = await getProfile(newMessage.sender_id);
              if (fetched) {
                senderProfile = fetched;
                profileCache.current.set(newMessage.sender_id, fetched);
              }
            }
            newMessage.profiles = senderProfile || null;
            setMessages((prev) => (prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]));
          }
        }
      } catch (e) {
        console.error('[Chat] Error handling realtime event', e);
      }
    };

    eventBus.addEventListener('realtime:message', handler as EventListener);
    return () => eventBus.removeEventListener('realtime:message', handler as EventListener);
  }, [user?.id, refreshUnreadDms]);

  // Load conversation history.
  useEffect(() => {
    if (!activeConversation || !user) return;
    setReplyToMessage(null);

    const loadHistory = async () => {
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
        console.error('Failed to load conversation history:', error);
      } finally {
        setMessagesLoading(false);
      }
    };
    loadHistory();
  }, [activeConversation, user]);

  // Polling fallback when realtime events aren't arriving.
  useEffect(() => {
    if (!activeConversation || !user) return;

    const mergeNew = (history: (ChatMessage | DirectMessage)[]) =>
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const toAdd = history.filter((h) => !ids.has(h.id));
        return toAdd.length ? [...prev, ...toAdd] : prev;
      });

    const poll = async () => {
      try {
        const last = realtime?.lastEvent;
        if (last && Date.now() - last.timestamp < 3000) return;
        if (activeConversation.type === 'room') {
          mergeNew(await getRoomMessages(activeConversation.id));
        } else {
          mergeNew(await getDirectMessages(user.id, activeConversation.id));
          await markDirectMessagesAsSeen(activeConversation.id, user.id);
        }
      } catch {
        /* ignore transient polling errors */
      }
    };

    poll();
    const timer = window.setInterval(poll, 2500);
    return () => window.clearInterval(timer);
  }, [activeConversation, user, realtime?.lastEvent]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!user || !activeConversation || !content.trim()) return;
      const tempId = Date.now();
      const trimmed = content.trim();
      const replyId = replyToMessage?.id || null;

      const onError = (label: string) => (error: any) => {
        console.error(`Error sending ${label}:`, error);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setNotification({ message: `Failed to send message: ${error.message || 'Check permissions.'}`, type: 'error' });
      };

      if (activeConversation.type === 'room') {
        const optimistic: ChatMessage = {
          id: tempId,
          room_id: activeConversation.id,
          sender_id: user.id,
          content: trimmed,
          created_at: new Date().toISOString(),
          profiles: profile,
          reply_to_message_id: replyId,
        };
        setMessages((prev) => [...prev, optimistic]);
        setReplyToMessage(null);
        sendMessage(activeConversation.id, user.id, trimmed, replyId)
          .then((saved) => setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m))))
          .catch(onError('message'));
      } else {
        const optimistic: DirectMessage = {
          id: tempId,
          sender_id: user.id,
          receiver_id: activeConversation.id,
          content: trimmed,
          created_at: new Date().toISOString(),
          profiles: profile,
          reply_to_message_id: replyId,
        };
        setMessages((prev) => [...prev, optimistic]);
        setReplyToMessage(null);
        sendDirectMessage(user.id, activeConversation.id, trimmed, replyId)
          .then((saved) => setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m))))
          .catch(onError('DM'));
      }
    },
    [user, profile, activeConversation, replyToMessage, setNotification]
  );

  const handleTyping = useCallback(() => {
    // Typing indicators for rooms/DMs are intentionally a no-op for now.
  }, []);

  const handleOpenCreateRoom = (isAnonymous: boolean) => {
    setModalAnonymity(isAnonymous);
    setIsModalOpen(true);
  };

  const handleCreateRoom = async (name: string, description: string | null) => {
    const newRoom = await createChatRoom(name, description, modalAnonymity);
    setRooms((prev) => [...prev, newRoom]);
    setActiveConversation({ ...newRoom, type: 'room' });
  };

  const messagesById = useMemo(() => {
    const map = new Map<number, ChatMessage | DirectMessage>();
    messages.forEach((msg) => map.set(msg.id, msg));
    return map;
  }, [messages]);

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-surface-500 dark:text-surface-400">
          <Spinner size="h-10 w-10" className="text-brand-500" />
          <p>Loading conversations…</p>
        </div>
      );
    }
    if (initializationError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center p-4 text-center text-brand-500">
          <h3 className="mb-2 text-lg font-semibold">Error Loading Chat</h3>
          <p>{initializationError}</p>
        </div>
      );
    }
    if (!activeConversation) {
      return (
        <div className="hidden flex-1 flex-col items-center justify-center p-4 text-center text-surface-500 dark:text-surface-400 lg:flex">
          <ChatBubbleIcon className="mb-4 h-16 w-16 text-surface-300 dark:text-surface-600" />
          <h3 className="text-lg font-semibold text-surface-800 dark:text-white">Welcome to Chat</h3>
          <p>Select a conversation or create a room to get started.</p>
        </div>
      );
    }
    return (
      <div className="flex h-full min-w-0 flex-1 flex-col">
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
      <div className="relative flex h-full overflow-hidden bg-white dark:bg-surface-900">
        {!showAnonymousChat ? (
          <>
            <RoomSidebar
              rooms={rooms}
              friends={friends}
              activeConversation={activeConversation}
              setActiveConversation={handleSelectConversation}
              onOpenCreateRoom={handleOpenCreateRoom}
              onOpenAnonymousChat={() => setShowAnonymousChat(true)}
              onlineUsers={onlineUsers}
              unreadCounts={unreadCounts}
              isOpen={isSidebarOpen}
              setIsOpen={setIsSidebarOpen}
              isLoading={loading}
            />
            <div className={`flex min-w-0 flex-1 flex-col overflow-hidden ${activeConversation ? 'flex' : 'hidden lg:flex'}`}>
              {renderMainContent()}
            </div>
          </>
        ) : (
          <div className="flex h-full w-full flex-1 flex-col">
            <AnonymousChat onClose={() => setShowAnonymousChat(false)} />
          </div>
        )}
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
