import React, { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon, XIcon } from './icons';
import { ChatMessage, DirectMessage } from '../types';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  replyToMessage?: ChatMessage | DirectMessage | null;
  onCancelReply?: () => void;
  isAnonymousChat?: boolean;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  replyToMessage,
  onCancelReply,
  isAnonymousChat,
  placeholder = 'Type a message…',
}) => {
  const [content, setContent] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (replyToMessage) inputRef.current?.focus();
  }, [replyToMessage]);

  useEffect(() => {
    if (content) onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 3000);
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [content, onTyping]);

  useEffect(() => () => onTyping(false), [onTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onSendMessage(content);
    setContent('');
  };

  const replyName = !replyToMessage
    ? ''
    : isAnonymousChat
      ? 'an anonymous user'
      : replyToMessage.profiles?.username || 'Unknown User';

  return (
    <div className="sticky bottom-0 z-30 flex-shrink-0 border-t border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
      {replyToMessage && (
        <div className="mb-2 flex animate-fade-in items-center justify-between gap-2 rounded-xl bg-surface-100 p-2 text-sm dark:bg-surface-800/60">
          <div className="min-w-0">
            <p className="text-surface-500 dark:text-surface-400">
              Replying to <span className="font-bold text-surface-800 dark:text-surface-200">{replyName}</span>
            </p>
            <p className="truncate text-surface-600 dark:text-surface-300">{replyToMessage.content}</p>
          </div>
          <button onClick={onCancelReply} className="flex-shrink-0 p-1 text-surface-500 hover:text-brand-500" aria-label="Cancel reply">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 rounded-xl bg-surface-100 px-4 py-2.5 text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-800 dark:text-white dark:placeholder-surface-500"
        />
        <button
          type="submit"
          disabled={!content.trim()}
          className="flex items-center justify-center rounded-xl bg-brand-600 p-2.5 text-white transition-colors hover:bg-brand-500 disabled:opacity-50"
          aria-label="Send message"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
