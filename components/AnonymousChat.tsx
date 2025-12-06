import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  findAnonymousChatPartner,
  getActiveAnonymousSession,
  getAnonymousChatMessages,
  sendAnonymousMessage,
  endAnonymousSession,
  subscribeToAnonymousSession,
  subscribeToAnonymousMessages,
  subscribeToAnonymousTyping
} from '../supabaseApi';
import { AnonymousChatMessage, AnonymousChatSession } from '../types';
import MessageInput from './MessageInput';
import { formatTimeAgo } from '../utils';
import { RealtimeChannel } from '@supabase/supabase-js';

interface AnonymousChatProps {
  onClose: () => void;
}

const AnonymousChat: React.FC<AnonymousChatProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'searching' | 'paired' | 'ended'>('idle');
  const [session, setSession] = useState<AnonymousChatSession | null>(null);
  const [messages, setMessages] = useState<AnonymousChatMessage[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionChannelRef = useRef<RealtimeChannel | null>(null);
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Removed checkExistingSession - let the function handle everything
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    sessionChannelRef.current?.unsubscribe();
    messagesChannelRef.current?.unsubscribe();
    typingChannelRef.current?.unsubscribe();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const loadMessages = async (sessionId: string) => {
    const msgs = await getAnonymousChatMessages(sessionId);
    setMessages(msgs);
  };

  const setupRealtime = (sessionId: string) => {
    // Subscribe to session updates (pairing, ending)
    sessionChannelRef.current = subscribeToAnonymousSession(sessionId, (payload) => {
      console.log('Session update:', payload);
      
      if (payload.eventType === 'UPDATE') {
        const updatedSession = payload.new as AnonymousChatSession;
        setSession(updatedSession);
        
        if (updatedSession.status === 'paired' && status !== 'paired') {
          setStatus('paired');
          loadMessages(sessionId);
        } else if (updatedSession.status === 'ended') {
          setStatus('ended');
          if (updatedSession.ended_by !== user?.id) {
            setPartnerDisconnected(true);
          }
        }
      }
    });

    // Subscribe to new messages
    messagesChannelRef.current = subscribeToAnonymousMessages(sessionId, (payload) => {
      console.log('[AnonymousChat] Message event:', payload);
      if (payload.eventType === 'INSERT') {
        const newMessage = payload.new as AnonymousChatMessage;
        console.log('[AnonymousChat] New message received:', newMessage);
        setMessages(prev => [...prev, newMessage]);
      }
    });

    // Subscribe to typing indicators
    typingChannelRef.current = subscribeToAnonymousTyping(sessionId, (payload) => {
      if (payload.payload.user_id !== user?.id) {
        setPartnerTyping(payload.payload.is_typing);
        
        // Auto-hide typing indicator after 3 seconds
        if (payload.payload.is_typing) {
          setTimeout(() => setPartnerTyping(false), 3000);
        }
      }
    });
  };

  const handleStartSearch = async () => {
    setStatus('searching');
    setMessages([]);
    setPartnerDisconnected(false);
    
    const result = await findAnonymousChatPartner();
    
    if (result) {
      const sessionData: AnonymousChatSession = {
        id: '',
        session_id: result.session_id,
        user1_id: user?.id || null,
        user2_id: result.partner_id,
        status: result.partner_id ? 'paired' : 'waiting',
        created_at: new Date().toISOString(),
        paired_at: result.partner_id ? new Date().toISOString() : null,
        ended_at: null,
        ended_by: null
      };
      
      setSession(sessionData);
      
      if (result.partner_id) {
        console.log('[AnonymousChat] Paired with partner:', result.partner_id);
        setStatus('paired');
        // Load existing messages when paired
        loadMessages(result.session_id);
      } else {
        console.log('[AnonymousChat] Waiting for partner...');
      }
      
      setupRealtime(result.session_id);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!session || status !== 'paired') {
      console.log('[AnonymousChat] Cannot send - not paired', { session, status });
      return;
    }
    
    console.log('[AnonymousChat] Sending message:', content);
    try {
      const sentMsg = await sendAnonymousMessage(session.session_id, content);
      console.log('[AnonymousChat] Message sent:', sentMsg);
      // Message will be added via realtime subscription
    } catch (error) {
      console.error('[AnonymousChat] Failed to send message:', error);
    }
  };

  const handleTyping = (typing: boolean) => {
    if (!session) return;
    
    setIsTyping(typing);
    
    // Send typing indicator via realtime broadcast
    if (typingChannelRef.current) {
      typingChannelRef.current.track({
        user_id: user?.id,
        is_typing: typing
      });
    }
  };

  const handleSkip = async () => {
    if (session) {
      await endAnonymousSession(session.session_id);
    }
    
    cleanup();
    setSession(null);
    setMessages([]);
    setPartnerDisconnected(false);
    
    // Start new search
    setTimeout(() => handleStartSearch(), 500);
  };

  const handleDisconnect = async () => {
    if (session) {
      await endAnonymousSession(session.session_id);
    }
    
    cleanup();
    setStatus('ended');
  };

  const getPartnerName = () => {
    if (!session || !user) return 'Stranger';
    
    // Determine if current user is user1 or user2
    const isUser1 = session.user1_id === user.id;
    return isUser1 ? 'Stranger 2' : 'Stranger 1';
  };

  const getMyName = () => {
    if (!session || !user) return 'You';
    
    const isUser1 = session.user1_id === user.id;
    return isUser1 ? 'Stranger 1' : 'Stranger 2';
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">?</span>
          </div>
          <div>
            <h2 className="font-semibold text-white text-lg">
              {status === 'idle' && 'Anonymous Chat'}
              {status === 'searching' && 'Finding a stranger...'}
              {status === 'paired' && getPartnerName()}
              {status === 'ended' && 'Chat Ended'}
            </h2>
            {status === 'paired' && !partnerDisconnected && (
              <p className="text-xs text-gray-400">
                {partnerTyping ? 'Stranger is typing...' : 'Connected'}
              </p>
            )}
            {partnerDisconnected && (
              <p className="text-xs text-red-400">Stranger has disconnected</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {status === 'paired' && (
            <>
              <button
                onClick={handleSkip}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                End Chat
              </button>
            </>
          )}
          {status === 'searching' && (
            <button
              onClick={() => {
                if (session) {
                  endAnonymousSession(session.session_id);
                }
                cleanup();
                setStatus('idle');
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6">
              <span className="text-white font-bold text-4xl">?</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Anonymous Chat</h3>
            <p className="text-gray-400 mb-6 max-w-md">
              Connect with a random stranger for a 1-on-1 anonymous conversation. 
              Chats are temporary and will be archived when you disconnect.
            </p>
            <button
              onClick={handleStartSearch}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all transform hover:scale-105"
            >
              Start Chatting
            </button>
          </div>
        )}

        {status === 'searching' && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-gray-400 text-lg">Looking for someone to chat with...</p>
          </div>
        )}

        {status === 'paired' && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400 bg-gray-800 rounded-lg p-6 max-w-md">
              <p className="text-lg font-semibold text-white mb-2">You're now chatting with a stranger!</p>
              <p className="text-sm">Say hello and start your conversation.</p>
              <p className="text-xs mt-4 text-gray-500">
                ⚠️ Chat will be archived when either person disconnects
              </p>
            </div>
          </div>
        )}

        {status === 'paired' && messages.map((msg) => {
          const isMyMessage = msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${isMyMessage ? 'order-2' : 'order-1'}`}>
                <div
                  className={`rounded-lg p-3 ${
                    isMyMessage
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <p className="text-xs font-semibold mb-1 opacity-70">
                    {isMyMessage ? getMyName() : getPartnerName()}
                  </p>
                  <p className="break-words">{msg.content}</p>
                  <p className="text-xs mt-1 opacity-60">
                    {formatTimeAgo(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {status === 'ended' && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-6">
              <span className="text-gray-500 font-bold text-4xl">✓</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Chat Ended</h3>
            <p className="text-gray-400 mb-6">
              {partnerDisconnected 
                ? 'Your partner has disconnected.' 
                : 'You have ended the chat.'}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This conversation has been archived.
            </p>
            <button
              onClick={handleStartSearch}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all"
            >
              Start New Chat
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {status === 'paired' && !partnerDisconnected && (
        <div className="border-t border-gray-700 bg-gray-800 p-4">
          <MessageInput
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            placeholder="Type a message..."
          />
        </div>
      )}
    </div>
  );
};

export default AnonymousChat;
