import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  findAnonymousChatPartner,
  getAnonymousChatMessages,
  sendAnonymousMessage,
  endAnonymousSession,
  subscribeToAnonymousSession,
  subscribeToAnonymousMessages,
  subscribeToAnonymousTyping,
} from '../supabaseApi';
import { AnonymousChatMessage, AnonymousChatSession } from '../types';
import MessageInput from './MessageInput';
import { formatTimeAgo } from '../utils';
import { XIcon, ChatBubbleIcon } from './icons';
import { Button, Spinner } from './ui';
import { RealtimeChannel } from '@supabase/supabase-js';

interface AnonymousChatProps {
  onClose: () => void;
}

type Status = 'idle' | 'searching' | 'paired' | 'ended';

const AnonymousChat: React.FC<AnonymousChatProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('idle');
  const [session, setSession] = useState<AnonymousChatSession | null>(null);
  const [messages, setMessages] = useState<AnonymousChatMessage[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionChannelRef = useRef<RealtimeChannel | null>(null);
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const cleanup = () => {
    sessionChannelRef.current?.unsubscribe();
    messagesChannelRef.current?.unsubscribe();
    typingChannelRef.current?.unsubscribe();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  useEffect(() => () => cleanup(), []);

  const loadMessages = async (sessionId: string) => {
    try {
      setMessages(await getAnonymousChatMessages(sessionId));
    } catch (error) {
      console.error('Error loading anonymous messages:', error);
    }
  };

  const setupRealtime = (sessionId: string) => {
    sessionChannelRef.current = subscribeToAnonymousSession(sessionId, (payload) => {
      if (payload.eventType !== 'UPDATE') return;
      const updated = payload.new as AnonymousChatSession;
      setSession(updated);
      if (updated.status === 'paired') {
        setStatus('paired');
        loadMessages(sessionId);
      } else if (updated.status === 'ended') {
        setStatus('ended');
        if (updated.ended_by !== user?.id) setPartnerDisconnected(true);
      }
    });

    messagesChannelRef.current = subscribeToAnonymousMessages(sessionId, (payload) => {
      if (payload.eventType !== 'INSERT') return;
      const newMessage = payload.new as AnonymousChatMessage;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        // Reconcile our own optimistic message (temp string id) with the server row.
        if (newMessage.sender_id === user?.id) {
          const optimistic = prev.find((m) => m.content === newMessage.content && m.sender_id === user?.id && typeof m.id === 'string');
          if (optimistic) return prev.map((m) => (m === optimistic ? newMessage : m));
        }
        return [...prev, newMessage];
      });
    });

    typingChannelRef.current = subscribeToAnonymousTyping(sessionId, (payload) => {
      if (payload.payload?.user_id === user?.id) return;
      setPartnerTyping(payload.payload?.is_typing || false);
      if (payload.payload?.is_typing) setTimeout(() => setPartnerTyping(false), 3000);
    });
  };

  const handleStartSearch = async () => {
    setStatus('searching');
    setMessages([]);
    setPartnerDisconnected(false);

    const result = await findAnonymousChatPartner();
    if (!result) {
      setStatus('idle');
      return;
    }

    const sessionData: AnonymousChatSession = {
      id: '',
      session_id: result.session_id,
      user1_id: user?.id || null,
      user2_id: result.partner_id,
      status: result.partner_id ? 'paired' : 'waiting',
      created_at: new Date().toISOString(),
      paired_at: result.partner_id ? new Date().toISOString() : null,
      ended_at: null,
      ended_by: null,
    };
    setSession(sessionData);
    if (result.partner_id) {
      setStatus('paired');
      loadMessages(result.session_id);
    }
    setupRealtime(result.session_id);
  };

  const handleSendMessage = async (content: string) => {
    if (!session || status !== 'paired') return;
    const tempId = `msg-${Date.now()}-${Math.random()}`;
    const optimistic: AnonymousChatMessage = {
      id: tempId,
      session_id: session.session_id,
      sender_id: user?.id || '',
      content,
      created_at: new Date().toISOString(),
      is_typing: false,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const result = await sendAnonymousMessage(session.session_id, content);
      if (result?.id) setMessages((prev) => prev.map((m) => (m.id === tempId ? result : m)));
    } catch (error) {
      console.error('Failed to send anonymous message:', error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleTyping = (typing: boolean) => {
    if (!session || !typingChannelRef.current) return;
    typingChannelRef.current.track({ user_id: user?.id, is_typing: typing });
  };

  const resetToIdle = () => {
    cleanup();
    setStatus('idle');
    setSession(null);
    setMessages([]);
    setPartnerDisconnected(false);
    setPartnerTyping(false);
  };

  const handleSkip = async () => {
    if (session) {
      try {
        await endAnonymousSession(session.session_id);
      } catch (error) {
        console.error('Error ending session on skip:', error);
      }
    }
    resetToIdle();
  };

  const handleDisconnect = async () => {
    if (session) await endAnonymousSession(session.session_id);
    cleanup();
    setStatus('ended');
  };

  const isUser1 = session?.user1_id === user?.id;
  const partnerName = isUser1 ? 'Stranger 2' : 'Stranger 1';
  const myName = isUser1 ? 'Stranger 1' : 'Stranger 2';

  return (
    <div className="flex h-full flex-col bg-surface-950">
      <div className="flex items-center justify-between border-b border-surface-700 bg-surface-900 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-lg font-bold text-white">
            ?
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {status === 'idle' && 'Anonymous Chat'}
              {status === 'searching' && 'Finding a stranger…'}
              {status === 'paired' && partnerName}
              {status === 'ended' && 'Chat Ended'}
            </h2>
            {status === 'paired' && !partnerDisconnected && (
              <p className="text-xs text-surface-400">{partnerTyping ? 'Stranger is typing…' : 'Connected'}</p>
            )}
            {partnerDisconnected && <p className="text-xs text-brand-400">Stranger has disconnected</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'paired' && (
            <>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-500" onClick={handleSkip}>
                Skip
              </Button>
              <Button size="sm" variant="danger" onClick={handleDisconnect}>
                End Chat
              </Button>
            </>
          )}
          {status === 'searching' && (
            <Button size="sm" variant="danger" onClick={handleSkip}>
              Cancel
            </Button>
          )}
          <button onClick={onClose} className="text-surface-400 transition-colors hover:text-white" aria-label="Close anonymous chat">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
        {status === 'idle' && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-4xl font-bold text-white">
              ?
            </div>
            <h3 className="mb-2 text-2xl font-bold text-white">Anonymous Chat</h3>
            <p className="mb-6 max-w-md text-surface-400">
              Connect with a random stranger for a 1-on-1 anonymous conversation. Chats are temporary and archived when
              you disconnect.
            </p>
            <button
              onClick={handleStartSearch}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 font-bold text-white transition-transform hover:scale-105"
            >
              Start Chatting
            </button>
          </div>
        )}

        {status === 'searching' && (
          <div className="flex h-full flex-col items-center justify-center">
            <Spinner size="h-16 w-16" className="mb-4 text-purple-500" />
            <p className="text-lg text-surface-400">Looking for someone to chat with…</p>
          </div>
        )}

        {status === 'paired' && messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md rounded-2xl bg-surface-900 p-6 text-center text-surface-400">
              <ChatBubbleIcon className="mx-auto mb-2 h-10 w-10 text-purple-400" />
              <p className="mb-2 text-lg font-semibold text-white">You're now chatting with a stranger!</p>
              <p className="text-sm">Say hello and start your conversation.</p>
              <p className="mt-4 text-xs text-surface-500">⚠️ Chat will be archived when either person disconnects</p>
            </div>
          </div>
        )}

        {status === 'paired' &&
          messages.map((msg) => {
            const mine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl p-3 ${mine ? 'bg-purple-600 text-white' : 'bg-surface-800 text-surface-100'}`}>
                  <p className="mb-1 text-xs font-semibold opacity-70">{mine ? myName : partnerName}</p>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className="mt-1 text-xs opacity-60">{formatTimeAgo(msg.created_at)}</p>
                </div>
              </div>
            );
          })}

        {status === 'ended' && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-surface-800 text-4xl font-bold text-surface-500">
              ✓
            </div>
            <h3 className="mb-2 text-2xl font-bold text-white">Chat Ended</h3>
            <p className="mb-6 text-surface-400">
              {partnerDisconnected ? 'Your partner has disconnected.' : 'You have ended the chat.'}
            </p>
            <p className="mb-6 text-sm text-surface-500">This conversation has been archived.</p>
            <button
              onClick={handleStartSearch}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 font-bold text-white transition-transform hover:scale-105"
            >
              Start New Chat
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {status === 'paired' && !partnerDisconnected && (
        <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} placeholder="Type a message…" />
      )}
    </div>
  );
};

export default AnonymousChat;
