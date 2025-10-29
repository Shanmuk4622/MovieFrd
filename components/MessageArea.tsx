import React, { useEffect, useRef, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { ChatMessage, DirectMessage, Profile } from '../types';
import { Conversation } from './Chat';
import { UserIcon, MenuIcon, CheckIcon, CheckDoubleIcon, ClockIcon } from './icons';

interface MessageAreaProps {
  user: User;
  messages: (ChatMessage | DirectMessage)[];
  conversation: Conversation | null;
  isLoading: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  typingUsers: Profile[];
  onSelectProfile: (userId: string) => void;
}

const adjectives = ["Clever", "Silent", "Brave", "Quick", "Wise", "Witty", "Curious", "Daring", "Gentle", "Keen"];
const nouns = ["Fox", "Panda", "Lion", "Tiger", "Eagle", "Wolf", "Shark", "Owl", "Bear", "Jaguar"];

const generateAlias = (userId: string) => {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const adjIndex = hash % adjectives.length;
  const nounIndex = (hash * 31) % nouns.length;
  return `${adjectives[adjIndex]} ${nouns[nounIndex]}`;
};

const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    if (date >= startOfToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (date >= startOfYesterday) {
        return 'Yesterday';
    }
    return date.toLocaleDateString();
};

const TypingIndicator: React.FC<{ users: Profile[] }> = ({ users }) => {
    if (users.length === 0) return null;
    
    let text = '';
    if (users.length === 1) {
        text = `${users[0].username} is typing`;
    } else if (users.length === 2) {
        text = `${users[0].username} and ${users[1].username} are typing`;
    } else {
        text = `Several people are typing`;
    }

    return (
        <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-300 italic">{text}</span>
            <div className="flex space-x-1">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-pulse"></span>
            </div>
        </div>
    );
};

const getEphemeralMessage = (conversation: Conversation | null) => {
    if (!conversation) return null;
    if (conversation.type === 'room') {
        return 'Messages in this room disappear after 12 hours.';
    }
    if (conversation.type === 'dm') {
        return 'Messages in this conversation disappear after 3 days.';
    }
    return null;
};


const MessageArea: React.FC<MessageAreaProps> = ({ user, messages, conversation, isLoading, isSidebarOpen, onToggleSidebar, typingUsers, onSelectProfile }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const aliasMap = useRef<Map<string, string>>(new Map());
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const isAnonymousChat = conversation?.type === 'room' && conversation.is_anonymous;

  const getDisplayName = (message: ChatMessage | DirectMessage) => {
    if (isAnonymousChat) {
      if (!aliasMap.current.has(message.sender_id)) {
        aliasMap.current.set(message.sender_id, generateAlias(message.sender_id));
      }
      return aliasMap.current.get(message.sender_id);
    }
    return message.profiles?.username || 'Unknown User';
  };

  useEffect(() => {
    aliasMap.current.clear();
  }, [conversation]);

  useEffect(() => {
    if (!isLoading) {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, typingUsers]);

  const otherUserId = useMemo(() => {
    if (conversation?.type === 'dm' && user) {
        return conversation.id;
    }
    return null;
  }, [conversation, user]);

  const lastSeenByThemMessageId = useMemo(() => {
      if (!otherUserId || messages.length === 0) return null;
      
      let lastId: number | null = null;
      for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          // Check if it's a DM and meets the criteria
          if ('receiver_id' in msg && msg.sender_id === user.id && msg.seen_by?.includes(otherUserId)) {
              lastId = msg.id;
              break;
          }
      }
      return lastId;
  }, [messages, user, otherUserId]);
  
  const conversationName = conversation ? (conversation.type === 'room' ? conversation.name : conversation.username) : 'Loading...';
  const conversationDescription = conversation ? (conversation.type === 'room' ? conversation.description : `Your private conversation with ${conversation.username}.`) : 'Please wait';
  const ephemeralMessage = getEphemeralMessage(conversation);

  return (
    <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 relative flex flex-col">
      <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700/50 sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 -mx-4 px-4 flex items-center space-x-2">
        <button 
            onClick={onToggleSidebar} 
            className="lg:hidden text-gray-500 dark:text-gray-400 p-1 -ml-1"
            aria-controls="chat-sidebar"
            aria-expanded={isSidebarOpen}
            aria-label="Open conversation list"
        >
            <MenuIcon className="w-6 h-6"/>
        </button>
        <div>
            <h2 className="text-xl font-bold">
                {conversation && (conversation.type === 'room' ? '# ' : '@ ')}
                {conversationName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[calc(100vw-120px)]">{conversationDescription || 'Welcome!'}</p>
            {ephemeralMessage && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1.5">
                    <ClockIcon className="w-3 h-3" />
                    {ephemeralMessage}
                </p>
            )}
        </div>
      </div>
       {isLoading ? (
        <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-center z-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
        </div>
      ) : messages.length === 0 && typingUsers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">No messages yet</h3>
                <p>Be the first to say something!</p>
            </div>
        </div>
      ) : (
      <div className="space-y-0 flex-1" ref={messagesContainerRef}>
        {messages.map((msg, index) => {
            const isCurrentUser = msg.sender_id === user.id;
            const isClickable = !isCurrentUser && !isAnonymousChat;
            const prevMessage = index > 0 ? messages[index - 1] : null;

            const showHeader = !prevMessage ||
                               prevMessage.sender_id !== msg.sender_id ||
                               (new Date(msg.created_at).getTime() - new Date(prevMessage.created_at).getTime()) > 5 * 60 * 1000;
            
            return (
                <div 
                    key={msg.id} 
                    className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''} ${showHeader ? 'mt-4' : 'mt-1'}`}
                >
                    {/* Avatar Column */}
                    <div className="w-10 h-10 flex-shrink-0">
                        {showHeader ? (
                            <button
                                className={`w-full h-full bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center disabled:cursor-default`}
                                onClick={() => isClickable && onSelectProfile(msg.sender_id)}
                                disabled={!isClickable}
                                aria-label={`View profile of ${getDisplayName(msg)}`}
                            >
                                {msg.profiles?.avatar_url && !isAnonymousChat ? (
                                    <img src={msg.profiles.avatar_url} alt={getDisplayName(msg)} className={`w-full h-full rounded-full object-cover ${isClickable && 'hover:ring-2 hover:ring-red-500 transition-all'}`}/>
                                ) : (
                                    <UserIcon className="w-6 h-6 text-gray-400 dark:text-gray-400"/>
                                )}
                            </button>
                        ) : null}
                    </div>

                    {/* Message Content Column */}
                    <div className={`flex flex-col w-full ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                        {showHeader && (
                            <div className={`flex items-baseline gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                <button 
                                    className={`font-bold disabled:cursor-default ${isCurrentUser ? 'text-gray-900 dark:text-white' : (isClickable ? 'text-red-400 hover:underline' : 'text-red-400')}`}
                                    onClick={() => isClickable && onSelectProfile(msg.sender_id)}
                                    disabled={!isClickable}
                                >
                                    {getDisplayName(msg)}
                                </button>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {formatTimestamp(msg.created_at)}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className={`mt-1 p-3 rounded-lg max-w-lg ${isCurrentUser ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                            <p className="break-words">{msg.content}</p>
                        </div>
                        {isCurrentUser && lastSeenByThemMessageId === msg.id && (
                            <div className="flex justify-end items-center gap-1 mt-1 pr-1">
                                <CheckDoubleIcon className="w-4 h-4 text-blue-400" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">Seen</span>
                            </div>
                        )}
                    </div>
                </div>
            )
        })}
        {typingUsers.length > 0 && (
            <div className="flex items-start gap-3 mt-1 animate-fade-in">
                <div className="w-10 h-10 flex-shrink-0"></div>
                <div className="flex flex-col items-start pt-2">
                     <TypingIndicator users={typingUsers} />
                </div>
            </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>
      )}
    </div>
  );
};

export default MessageArea;