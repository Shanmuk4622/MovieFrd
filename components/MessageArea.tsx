
import React, { useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { ChatMessage, DirectMessage } from '../types';
import { Conversation } from './Chat';
import { UserIcon, MenuIcon } from './icons';

interface MessageAreaProps {
  user: User;
  messages: (ChatMessage | DirectMessage)[];
  conversation: Conversation;
  isLoading: boolean;
  onToggleSidebar: () => void;
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


const MessageArea: React.FC<MessageAreaProps> = ({ user, messages, conversation, isLoading, onToggleSidebar }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const aliasMap = useRef<Map<string, string>>(new Map());

  const getDisplayName = (message: ChatMessage | DirectMessage) => {
    if (conversation.type === 'room' && conversation.is_anonymous) {
      if (!aliasMap.current.has(message.sender_id)) {
        aliasMap.current.set(message.sender_id, generateAlias(message.sender_id));
      }
      return aliasMap.current.get(message.sender_id);
    }
    return message.profiles?.username || 'Unknown User';
  };

  useEffect(() => {
    aliasMap.current.clear();
  }, [conversation.id, conversation.type]);

  useEffect(() => {
    if (!isLoading) {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);
  
  const conversationName = conversation.type === 'room' ? conversation.name : conversation.username;
  const conversationDescription = conversation.type === 'room' ? conversation.description : `Your private conversation with ${conversation.username}.`;

  return (
    <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 relative flex flex-col">
      <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700/50 sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 -mx-4 px-4 flex items-center space-x-2">
        <button onClick={onToggleSidebar} className="lg:hidden text-gray-500 dark:text-gray-400 p-1 -ml-1">
            <MenuIcon className="w-6 h-6"/>
        </button>
        <div>
            <h2 className="text-xl font-bold">
                {conversation.type === 'room' ? '# ' : '@ '}
                {conversationName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[calc(100vw-120px)]">{conversationDescription || 'Welcome!'}</p>
        </div>
      </div>
       {isLoading ? (
        <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">No messages yet</h3>
                <p>Be the first to say something!</p>
            </div>
        </div>
      ) : (
      <div className="space-y-4 flex-1">
        {messages.map((msg) => {
            const isCurrentUser = msg.sender_id === user.id;
            return (
                <div key={msg.id} className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0 flex items-center justify-center">
                       <UserIcon className="w-6 h-6 text-gray-400 dark:text-gray-400"/>
                    </div>
                    <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-baseline gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                            <span className={`font-bold ${isCurrentUser ? 'text-gray-900 dark:text-white' : 'text-red-400'}`}>{getDisplayName(msg)}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                {formatTimestamp(msg.created_at)}
                            </span>
                        </div>
                        <div className={`mt-1 p-3 rounded-lg max-w-lg ${isCurrentUser ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                            <p className="break-words">{msg.content}</p>
                        </div>
                    </div>
                </div>
            )
        })}
        <div ref={endOfMessagesRef} />
      </div>
      )}
    </div>
  );
};

export default MessageArea;
