import React from 'react';
import { Conversation } from './Chat';
import { MenuIcon, UserIcon, PhoneIcon, InformationCircleIcon } from './icons';

interface ChatHeaderProps {
  activeConversation: Conversation | null;
  onlineUsers: Set<string>;
  onToggleSidebar: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ activeConversation, onlineUsers, onToggleSidebar }) => {
  if (!activeConversation) {
    return (
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button onClick={onToggleSidebar} className="lg:hidden p-1 text-gray-500 dark:text-gray-400">
            <MenuIcon className="w-6 h-6" />
          </button>
          <span className="text-xl font-bold tracking-wider text-gray-900 dark:text-white">Chat</span>
        </div>
      </div>
    );
  }

  const conversationName = activeConversation.type === 'room' ? activeConversation.name : activeConversation.username;
  const isOtherUserOnline = activeConversation.type === 'dm' && onlineUsers.has(activeConversation.id);

  return (
    <div className="p-3 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between flex-shrink-0 bg-white dark:bg-gray-800">
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        <button onClick={onToggleSidebar} className="lg:hidden p-1 text-gray-500 dark:text-gray-400">
          <MenuIcon className="w-6 h-6" />
        </button>
        {/* Avatar for DMs, or a hash for rooms */}
        {activeConversation.type === 'dm' ? (
          activeConversation.avatar_url ? (
            <img src={activeConversation.avatar_url} alt={conversationName} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
          )
        ) : (
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <span className="text-red-500 font-bold text-xl">#</span>
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold truncate text-gray-900 dark:text-white">
            {conversationName}
          </h1>
          {isOtherUserOnline ? (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs text-green-400 font-semibold">Online</span>
            </div>
          ) : activeConversation.type === 'room' && activeConversation.description ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{activeConversation.description}</p>
          ) : null }
        </div>
      </div>
      
      {/* Action Icons */}
      <div className="flex items-center space-x-2">
            <button className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors">
                <PhoneIcon className="w-5 h-5"/>
            </button>
             <button className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors">
                <InformationCircleIcon className="w-5 h-5"/>
            </button>
      </div>
    </div>
  );
};

export default ChatHeader;
