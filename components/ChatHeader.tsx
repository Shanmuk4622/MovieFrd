import React from 'react';
import { Conversation } from './Chat';
import { MenuIcon, PhoneIcon, InformationCircleIcon } from './icons';
import { Avatar, IconButton } from './ui';

interface ChatHeaderProps {
  activeConversation: Conversation | null;
  onlineUsers: Set<string>;
  onToggleSidebar: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ activeConversation, onlineUsers, onToggleSidebar }) => {
  if (!activeConversation) {
    return (
      <div className="flex flex-shrink-0 items-center justify-between border-b border-surface-200 p-4 dark:border-surface-800">
        <div className="flex items-center gap-3">
          <IconButton aria-label="Toggle conversations" onClick={onToggleSidebar} className="lg:hidden">
            <MenuIcon className="h-6 w-6" />
          </IconButton>
          <span className="text-xl font-bold tracking-tight">Chat</span>
        </div>
      </div>
    );
  }

  const name = activeConversation.type === 'room' ? activeConversation.name : activeConversation.username;
  const isOnline = activeConversation.type === 'dm' && onlineUsers.has(activeConversation.id);

  return (
    <div className="flex flex-shrink-0 items-center justify-between border-b border-surface-200 bg-white p-3 dark:border-surface-800 dark:bg-surface-900">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <IconButton aria-label="Toggle conversations" onClick={onToggleSidebar} className="lg:hidden">
          <MenuIcon className="h-6 w-6" />
        </IconButton>
        {activeConversation.type === 'dm' ? (
          <Avatar src={activeConversation.avatar_url} name={name} size="h-10 w-10" />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-500/10">
            <span className="text-xl font-bold text-brand-500">#</span>
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-surface-900 dark:text-white sm:text-lg">{name}</h1>
          {isOnline ? (
            <div className="flex animate-fade-in items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-500">Online</span>
            </div>
          ) : activeConversation.type === 'room' && activeConversation.description ? (
            <p className="truncate text-xs text-surface-500 dark:text-surface-400">{activeConversation.description}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <IconButton aria-label="Call">
          <PhoneIcon className="h-5 w-5" />
        </IconButton>
        <IconButton aria-label="Conversation info">
          <InformationCircleIcon className="h-5 w-5" />
        </IconButton>
      </div>
    </div>
  );
};

export default ChatHeader;
