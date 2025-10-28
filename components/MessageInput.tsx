import React, { useState } from 'react';
import { PaperAirplaneIcon } from './icons';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSendMessage(content);
      setContent('');
    }
  };

  return (
    <div className="p-4 bg-gray-800 border-t border-gray-700/50">
      <form onSubmit={handleSubmit} className="flex items-center space-x-3">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
          autoComplete="off"
        />
        <button
          type="submit"
          className="bg-red-600 hover:bg-red-700 text-white font-bold p-2.5 rounded-lg transition-colors disabled:opacity-50"
          disabled={!content.trim()}
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
