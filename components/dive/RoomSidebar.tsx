import React from 'react';
import { ChatRoom, Profile } from '../../types';
import { Conversation } from './Chat';
import { PlusCircleIcon, UserIcon, XIcon } from '../icons';

interface RoomSidebarProps {
  rooms: ChatRoom[];
  friends: Profile[];
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation) => void;
  onOpenCreateRoom: (isAnonymous: boolean) => void;
  onlineUsers: Set<string>;
  unreadCounts: Record<string, number>;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isLoading: boolean;
}

const SkeletonItem: React.FC = () => (
    <div className="w-full px-4 py-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
    </div>
);

const RoomSidebar: React.FC<RoomSidebarProps> = ({ rooms, friends, activeConversation, setActiveConversation, onOpenCreateRoom, onlineUsers, unreadCounts, isOpen, setIsOpen, isLoading }) => {
  const publicChannels = rooms.filter(r => !r.is_anonymous);
  const anonymousRooms = rooms.filter(r => r.is_anonymous);

  const RoomLink: React.FC<{ room: ChatRoom }> = ({ room }) => {
    const unreadCount = unreadCounts[`room-${room.id}`] || 0;
    return (
      <button
        onClick={() => setActiveConversation({ ...room, type: 'room' })}
        className={`w-full text-left px-4 py-2 rounded-md transition-colors text-sm flex items-center justify-between ${
          activeConversation?.type === 'room' && activeConversation.id === room.id
            ? 'bg-red-500/20 text-gray-900 dark:text-white font-semibold'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <span className="truncate"># {room.name}</span>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  };
  
  const FriendLink: React.FC<{ friend: Profile }> = ({ friend }) => {
    const unreadCount = unreadCounts[friend.id] || 0;
    const isOnline = onlineUsers.has(friend.id);
    return (
      <button
        onClick={() => setActiveConversation({ ...friend, type: 'dm' })}
        className={`w-full text-left px-4 py-2 rounded-md transition-colors text-sm flex items-center space-x-2 ${
          activeConversation?.type === 'dm' && activeConversation.id === friend.id
            ? 'bg-red-500/20 text-gray-900 dark:text-white font-semibold'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <div className="relative flex-shrink-0">
            <UserIcon className="w-4 h-4" />
            {isOnline && (
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-green-500 rounded-full ring-1 ring-white dark:ring-gray-800"></div>
            )}
        </div>
        <span className="flex-1 truncate">{friend.username}</span>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  };

  const SidebarContent = () => (
     <>
        <div className="flex items-center justify-between lg:hidden mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Conversations</h2>
            <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                aria-label="Close conversation list"
            >
                <XIcon className="w-6 h-6" />
            </button>
        </div>
        {isLoading ? (
             <div className="space-y-6">
                <div>
                    <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 px-2">Direct Messages</h3>
                    <div className="space-y-1">
                        <SkeletonItem />
                        <SkeletonItem />
                    </div>
                </div>
                <div>
                    <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 px-2">Public Channels</h3>
                    <div className="space-y-1">
                        <SkeletonItem />
                        <SkeletonItem />
                        <SkeletonItem />
                    </div>
                </div>
             </div>
        ) : (
            <>
                <div>
                    <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 px-2">Direct Messages</h3>
                    <div className="space-y-1">
                    {friends.map(friend => (
                        <FriendLink key={friend.id} friend={friend} />
                    ))}
                    </div>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-2 px-2">
                        <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Public Channels</h3>
                        <button onClick={() => onOpenCreateRoom(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <PlusCircleIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="space-y-1">
                    {publicChannels.map(room => (
                        <RoomLink key={room.id} room={room} />
                    ))}
                    </div>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-2 px-2">
                        <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Anonymous Rooms</h3>
                        <button onClick={() => onOpenCreateRoom(true)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <PlusCircleIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="space-y-1">
                    {anonymousRooms.map(room => (
                        <RoomLink key={room.id} room={room} />
                    ))}
                    </div>
                </div>
            </>
        )}
    </>
  );

  return (
    <>
        {/* Overlay for mobile */}
        <div 
            className={`fixed inset-0 bg-black/50 z-20 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsOpen(false)}
        ></div>

        {/* Sidebar */}
        <div id="chat-sidebar" className={`
            ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
            fixed lg:static top-0 left-0 h-full lg:h-auto z-30
            w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700/50 p-4 flex flex-col space-y-6 overflow-y-auto 
            transition-transform duration-300 ease-in-out
        `}>
           <SidebarContent />
        </div>
    </>
  );
};

export default RoomSidebar;
