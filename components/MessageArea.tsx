import React, { useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { ChatMessage, DirectMessage, Profile } from '../types';
import { Conversation } from './Chat';
import { UserIcon, MenuIcon, CheckIcon, CheckDoubleIcon } from './icons';

interface MessageAreaProps {
  user: User;
  messages: (ChatMessage | DirectMessage)[];
  conversation: Conversation | null;
  isLoading: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  typingUsers: Profile[];
  onSelectProfile: (userId: string) => void;
  onMarkAsSeen: (messageIds: number[]) => void;
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

const SeenStatusIndicator: React.FC<{ message: ChatMessage | DirectMessage; conversation: Conversation; currentUser: User; }> = ({ message, conversation, currentUser }) => {
    if (message.sender_id !== currentUser.id) return null;
    
    let isSeen = false;
    if (conversation.type === 'dm') {
        // In a DM, seen if the other person's ID is in the seen_by array
        isSeen = !!message.seen_by?.includes(conversation.id);
    } else {
        // In a room, considered seen if anyone other than the sender has seen it
        isSeen = !!message.seen_by && message.seen_by.length > message.seen_by.filter(id => id === currentUser.id).length;
    }
    
    if (isSeen) {
        return <CheckDoubleIcon className="w-5 h-5 text-red-400 dark:text-red-300" />;
    }
    return <CheckIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />;
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


const MessageArea: React.FC<MessageAreaProps> = ({ user, messages, conversation, isLoading, isSidebarOpen, onToggleSidebar, typingUsers, onSelectProfile, onMarkAsSeen }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const aliasMap = useRef<Map<string, string>>(new Map());
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const getDisplayName = (message: ChatMessage | DirectMessage) => {
    if (conversation && conversation.type === 'room' && conversation.is_anonymous) {
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

  useEffect(() => {
    if (!messagesContainerRef.current || !user) return;
    
    const observer = new IntersectionObserver((entries) => {
        const messageIdsToMark: number[] = [];
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const messageId = (entry.target as HTMLElement).dataset.messageId;
                if (messageId) {
                    messageIdsToMark.push(parseInt(messageId, 10));
                    observer.unobserve(entry.target);
                }
            }
        });
        if (messageIdsToMark.length > 0) {
            onMarkAsSeen(messageIdsToMark);
        }
    }, { root: messagesContainerRef.current, threshold: 0.8 });

    const unreadMessages = messagesContainerRef.current.querySelectorAll('[data-seen="false"]');
    unreadMessages.forEach(el => observer.observe(el));

    return () => observer.disconnect();

  }, [messages, user, onMarkAsSeen]);

  
  const conversationName = conversation ? (conversation.type === 'room' ? conversation.name : conversation.username) : 'Loading...';
  const conversationDescription = conversation ? (conversation.type === 'room' ? conversation.description : `Your private conversation with ${conversation.username}.`) : 'Please wait';

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
            const prevMessage = index > 0 ? messages[index - 1] : null;

            const showHeader = !prevMessage ||
                               prevMessage.sender_id !== msg.sender_id ||
                               (new Date(msg.created_at).getTime() - new Date(prevMessage.created_at).getTime()) > 5 * 60 * 1000;
            
            // For the intersection observer
            const isSeenByCurrentUser = msg.sender_id === user.id || !!msg.seen_by?.includes(user.id);

            return (
                <div 
                    key={msg.id} 
                    className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''} ${showHeader ? 'mt-4' : 'mt-1'}`}
                    data-message-id={msg.id}
                    data-seen={isSeenByCurrentUser.toString()}
                >
                    {/* Avatar Column */}
                    <button 
                        className="w-10 h-10 flex-shrink-0 disabled:cursor-default" 
                        onClick={() => !isCurrentUser && onSelectProfile(msg.sender_id)}
                        disabled={isCurrentUser}
                        aria-label={`View profile of ${getDisplayName(msg)}`}
                    >
                        {showHeader ? (
                            <div className={`w-full h-full bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center ${!isCurrentUser && 'hover:ring-2 hover:ring-red-500 transition-all'}`}>
                               <UserIcon className="w-6 h-6 text-gray-400 dark:text-gray-400"/>
                            </div>
                        ) : <div className="w-10 h-10"></div>}
                    </button>

                    {/* Message Content Column */}
                    <div className={`flex flex-col w-full ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                        {showHeader && (
                            <div className={`flex items-baseline gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                <button 
                                    className={`font-bold disabled:cursor-default ${isCurrentUser ? 'text-gray-900 dark:text-white' : 'text-red-400 hover:underline'}`}
                                    onClick={() => !isCurrentUser && onSelectProfile(msg.sender_id)}
                                    disabled={isCurrentUser}
                                >
                                    {getDisplayName(msg)}
                                </button>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {formatTimestamp(msg.created_at)}
                                    </span>
                                    {isCurrentUser && conversation && <SeenStatusIndicator message={msg} conversation={conversation} currentUser={user} />}
                                </div>
                            </div>
                        )}
                        <div className={`mt-1 p-3 rounded-lg max-w-lg ${isCurrentUser ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                            <p className="break-words">{msg.content}</p>
                        </div>
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