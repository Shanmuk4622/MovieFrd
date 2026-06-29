import React, { useEffect, useRef, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { ChatMessage, DirectMessage, Profile } from '../types';
import { Conversation } from './Chat';
import { CheckDoubleIcon, ClockIcon } from './icons';
import { cn } from '../utils/cn';
import { Avatar, Spinner } from './ui';

interface MessageAreaProps {
  user: User;
  messages: (ChatMessage | DirectMessage)[];
  conversation: Conversation | null;
  isLoading: boolean;
  typingUsers: Profile[];
  onSelectProfile: (userId: string) => void;
  onSetReplyTo: (message: ChatMessage | DirectMessage) => void;
  messagesById: Map<number, ChatMessage | DirectMessage>;
}

const adjectives = ['Clever', 'Silent', 'Brave', 'Quick', 'Wise', 'Witty', 'Curious', 'Daring', 'Gentle', 'Keen'];
const nouns = ['Fox', 'Panda', 'Lion', 'Tiger', 'Eagle', 'Wolf', 'Shark', 'Owl', 'Bear', 'Jaguar'];

const generateAlias = (userId: string) => {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `${adjectives[hash % adjectives.length]} ${nouns[(hash * 31) % nouns.length]}`;
};

const formatTimestamp = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (date >= startOfToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date >= startOfYesterday) return 'Yesterday';
  return date.toLocaleDateString();
};

const TypingIndicator: React.FC<{ users: Profile[] }> = ({ users }) => {
  if (users.length === 0) return null;
  const text =
    users.length === 1
      ? `${users[0].username} is typing`
      : users.length === 2
        ? `${users[0].username} and ${users[1].username} are typing`
        : 'Several people are typing';
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm italic text-surface-600 dark:text-surface-300">{text}</span>
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-surface-500 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-surface-500 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-surface-500" />
      </div>
    </div>
  );
};

const MessageArea: React.FC<MessageAreaProps> = ({
  user,
  messages,
  conversation,
  isLoading,
  typingUsers,
  onSelectProfile,
  onSetReplyTo,
  messagesById,
}) => {
  const endRef = useRef<HTMLDivElement>(null);
  const aliasMap = useRef<Map<string, string>>(new Map());
  const isAnonymousChat = conversation?.type === 'room' && conversation.is_anonymous;

  const getDisplayName = (message: ChatMessage | DirectMessage) => {
    if (isAnonymousChat) {
      if (!aliasMap.current.has(message.sender_id)) {
        aliasMap.current.set(message.sender_id, generateAlias(message.sender_id));
      }
      return aliasMap.current.get(message.sender_id)!;
    }
    return message.profiles?.username || 'Unknown User';
  };

  useEffect(() => {
    aliasMap.current.clear();
  }, [conversation]);

  useEffect(() => {
    if (!isLoading) endRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isLoading, typingUsers]);

  const otherUserId = conversation?.type === 'dm' ? conversation.id : null;

  const lastSeenByThemMessageId = useMemo(() => {
    if (!otherUserId || messages.length === 0) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if ('receiver_id' in msg && msg.sender_id === user.id && msg.seen_by?.includes(otherUserId)) {
        return msg.id;
      }
    }
    return null;
  }, [messages, user, otherUserId]);

  const ephemeralMessage =
    conversation?.type === 'room'
      ? 'Messages in this room disappear after 12 hours.'
      : conversation?.type === 'dm'
        ? 'Messages in this conversation disappear after 3 days.'
        : null;

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto bg-surface-50 px-4 pt-2 scrollbar-thin dark:bg-surface-950/50">
      {isLoading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface-50/50 dark:bg-surface-950/50">
          <Spinner size="h-10 w-10" className="text-brand-500" />
        </div>
      ) : messages.length === 0 && typingUsers.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-surface-500 dark:text-surface-400">
            <h3 className="text-lg font-semibold text-surface-800 dark:text-white">No messages yet</h3>
            <p>Be the first to say something!</p>
            {ephemeralMessage && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <ClockIcon className="h-3 w-3" />
                {ephemeralMessage}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1">
          {messages.length > 0 && ephemeralMessage && (
            <div className="flex items-center justify-center gap-1.5 py-4 text-center text-xs text-amber-600 dark:text-amber-400">
              <ClockIcon className="h-3 w-3" />
              {ephemeralMessage}
            </div>
          )}

          {messages.map((msg, index) => {
            const isCurrentUser = msg.sender_id === user.id;
            const isClickable = !isCurrentUser && !isAnonymousChat;
            const prev = index > 0 ? messages[index - 1] : null;
            const showHeader =
              !prev ||
              prev.sender_id !== msg.sender_id ||
              new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
            const repliedTo = msg.reply_to_message_id ? messagesById.get(msg.reply_to_message_id) : null;
            const displayName = getDisplayName(msg);

            return (
              <div key={msg.id} className={cn('flex items-start gap-3', isCurrentUser && 'flex-row-reverse', showHeader ? 'mt-4' : 'mt-1')}>
                <div className="h-10 w-10 flex-shrink-0">
                  {showHeader &&
                    (isAnonymousChat ? (
                      <Avatar name={displayName} size="h-10 w-10" />
                    ) : (
                      <button
                        onClick={() => isClickable && onSelectProfile(msg.sender_id)}
                        disabled={!isClickable}
                        aria-label={`View profile of ${displayName}`}
                        className={cn('rounded-full', isClickable && 'transition-all hover:ring-2 hover:ring-brand-500')}
                      >
                        <Avatar src={msg.profiles?.avatar_url} name={displayName} size="h-10 w-10" />
                      </button>
                    ))}
                </div>

                <div className={cn('flex w-full flex-col', isCurrentUser ? 'items-end' : 'items-start')}>
                  {showHeader && (
                    <div className={cn('flex items-baseline gap-2', isCurrentUser && 'flex-row-reverse')}>
                      <button
                        onClick={() => isClickable && onSelectProfile(msg.sender_id)}
                        disabled={!isClickable}
                        className={cn('font-bold', isCurrentUser ? 'text-surface-900 dark:text-white' : 'text-brand-500', isClickable && 'hover:underline')}
                      >
                        {displayName}
                      </button>
                      <span className="text-xs text-surface-400 dark:text-surface-500">{formatTimestamp(msg.created_at)}</span>
                    </div>
                  )}
                  <button
                    onClick={() => onSetReplyTo(msg)}
                    aria-label={`Reply to ${displayName}`}
                    className={cn(
                      'mt-1 w-fit max-w-lg rounded-2xl p-3 text-left transition-colors',
                      isCurrentUser
                        ? 'bg-brand-600 text-white hover:bg-brand-700'
                        : 'bg-surface-200 text-surface-800 hover:bg-surface-300 dark:bg-surface-800 dark:text-surface-100 dark:hover:bg-surface-700'
                    )}
                  >
                    {repliedTo && (
                      <div className={cn('mb-2 border-l-2 pl-2 text-xs', isCurrentUser ? 'border-white/50' : 'border-surface-400/50')}>
                        <p className="font-bold">{getDisplayName(repliedTo)}</p>
                        <p className="line-clamp-2 opacity-80">{repliedTo.content}</p>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </button>
                  {isCurrentUser && lastSeenByThemMessageId === msg.id && (
                    <div className="mt-1 flex items-center gap-1 pr-1">
                      <CheckDoubleIcon className="h-4 w-4 text-sky-400" />
                      <span className="text-xs text-surface-500 dark:text-surface-400">Seen</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {typingUsers.length > 0 && (
            <div className="mt-1 flex animate-fade-in items-start gap-3">
              <div className="h-10 w-10 flex-shrink-0" />
              <div className="flex flex-col items-start pt-2">
                <TypingIndicator users={typingUsers} />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
};

export default MessageArea;
