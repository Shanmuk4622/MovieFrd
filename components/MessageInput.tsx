import React, { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon } from './icons';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping }) => {
  const [content, setContent] = useState('');
  const typingTimeoutRef = useRef<number | null>(null);

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

  return (
    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700/50">
      <form onSubmit={handleSubmit} className="flex items-center space-x-3">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
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