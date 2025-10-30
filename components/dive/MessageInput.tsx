import React, { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon, XIcon } from '../icons';
import { ChatMessage, DirectMessage } from '../../types';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  replyToMessage: ChatMessage | DirectMessage | null;
  onCancelReply: () => void;
  isAnonymousChat: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping, replyToMessage, onCancelReply, isAnonymousChat }) => {
  const [content, setContent] = useState('');
  const typingTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (replyToMessage) {
      inputRef.current?.focus();
    }
  }, [replyToMessage]);

  useEffect(() => {
    if (content) {
      onTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      onTyping(false);
    }, 3000); // Stop typing after 3 seconds of inactivity

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [content, onTyping]);
  
  // Ensure we send a 'stopped-typing' event when the component unmounts
  useEffect(() => {
    return () => {
      onTyping(false);
    };
  }, [onTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onTyping(false); // Stop typing immediately on send
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onSendMessage(content);
      setContent('');
    }
  };
  
  const getReplyDisplayName = () => {
    if (!replyToMessage) return '';
    if (isAnonymousChat) return 'an anonymous user';
    return replyToMessage.profiles?.username || 'Unknown User';
  };

  return (
    <div className="sticky bottom-0 z-30 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700/50 flex-shrink-0">
      {replyToMessage && (
        <div className="bg-gray-100 dark:bg-gray-700/50 p-2 rounded-t-lg flex justify-between items-center text-sm mb-2 animate-fade-in">
          <div className="min-w-0">
            <p className="text-gray-500 dark:text-gray-400">
              Replying to <span className="font-bold text-gray-800 dark:text-gray-200">{getReplyDisplayName()}</span>
            </p>
            <p className="text-gray-600 dark:text-gray-300 truncate">
              {replyToMessage.content}
            </p>
          </div>
          <button onClick={onCancelReply} className="p-1 text-gray-500 hover:text-red-500 flex-shrink-0 ml-2" aria-label="Cancel reply">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center space-x-3">
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className={`flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${replyToMessage ? 'rounded-b-lg' : 'rounded-lg'}`}
          autoComplete="off"
        />
        <button
          type="submit"
          className="bg-red-600 hover:bg-red-700 text-white font-bold p-2.5 rounded-lg transition-colors disabled:opacity-50"
          disabled={!content.trim()}
          aria-label="Send Message"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;