import React from 'react';
import { ChatRoom, Profile } from '../types';
import { Conversation } from './Chat';
import { PlusCircleIcon, UserIcon } from './icons';

interface RoomSidebarProps {
  rooms: ChatRoom[];
  friends: Profile[];
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation) => void;
  onOpenCreateRoom: (isAnonymous: boolean) => void;
  unreadCounts: Record<string, number>;
}

const RoomSidebar: React.FC<RoomSidebarProps> = ({ rooms, friends, activeConversation, setActiveConversation, onOpenCreateRoom, unreadCounts }) => {
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
    const unreadCount = unreadCounts[`dm-${friend.id}`] || 0;
    return (
      <button
        onClick={() => setActiveConversation({ ...friend, type: 'dm' })}
        className={`w-full text-left px-4 py-2 rounded-md transition-colors text-sm flex items-center space-x-2 ${
          activeConversation?.type === 'dm' && activeConversation.id === friend.id
            ? 'bg-red-500/20 text-gray-900 dark:text-white font-semibold'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <UserIcon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 truncate">{friend.username}</span>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700/50 p-4 flex flex-col space-y-6 overflow-y-auto">
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
    </div>
  );
};

export default RoomSidebar;