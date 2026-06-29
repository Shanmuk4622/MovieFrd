import React from 'react';
import { ChatRoom, Profile } from '../types';
import { Conversation } from './Chat';
import { PlusCircleIcon, XIcon, ChatBubbleIcon } from './icons';
import { cn } from '../utils/cn';
import { Avatar } from './ui';

interface RoomSidebarProps {
  rooms: ChatRoom[];
  friends: Profile[];
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation) => void;
  onOpenCreateRoom: (isAnonymous: boolean) => void;
  onOpenAnonymousChat: () => void;
  onlineUsers: Set<string>;
  unreadCounts: Record<string, number>;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isLoading: boolean;
}

const UnreadBadge: React.FC<{ count: number }> = ({ count }) =>
  count > 0 ? (
    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  ) : null;

const RoomSidebar: React.FC<RoomSidebarProps> = ({
  rooms,
  friends,
  activeConversation,
  setActiveConversation,
  onOpenCreateRoom,
  onOpenAnonymousChat,
  onlineUsers,
  unreadCounts,
  isOpen,
  setIsOpen,
  isLoading,
}) => {
  const publicChannels = rooms.filter((r) => !r.is_anonymous);
  const anonymousRooms = rooms.filter((r) => r.is_anonymous);
  const isMobileListMode = !activeConversation;

  const itemBase = 'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors';
  const itemActive = 'bg-brand-500/15 font-semibold text-surface-900 dark:text-white';
  const itemIdle = 'text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800';

  const RoomLink: React.FC<{ room: ChatRoom }> = ({ room }) => {
    const isActive = activeConversation?.type === 'room' && activeConversation.id === room.id;
    return (
      <button onClick={() => setActiveConversation({ ...room, type: 'room' })} className={cn(itemBase, 'justify-between', isActive ? itemActive : itemIdle)}>
        <span className="truncate"># {room.name}</span>
        <UnreadBadge count={unreadCounts[`room-${room.id}`] || 0} />
      </button>
    );
  };

  const FriendLink: React.FC<{ friend: Profile }> = ({ friend }) => {
    const isActive = activeConversation?.type === 'dm' && activeConversation.id === friend.id;
    return (
      <button onClick={() => setActiveConversation({ ...friend, type: 'dm' })} className={cn(itemBase, isActive ? itemActive : itemIdle)}>
        <span className="relative flex-shrink-0">
          <Avatar src={friend.avatar_url} name={friend.username} size="h-7 w-7" />
          {onlineUsers.has(friend.id) && (
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-surface-900" />
          )}
        </span>
        <span className="flex-1 truncate">{friend.username}</span>
        <UnreadBadge count={unreadCounts[`dm-${friend.id}`] || 0} />
      </button>
    );
  };

  const SectionHeading: React.FC<{ label: string; onAdd?: () => void }> = ({ label, onAdd }) => (
    <div className="mb-2 flex items-center justify-between px-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-surface-500 dark:text-surface-400">{label}</h3>
      {onAdd && (
        <button onClick={onAdd} className="text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white" aria-label={`Create ${label}`}>
          <PlusCircleIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );

  return (
    <>
      {!isMobileListMode && (
        <div
          className={cn('fixed inset-0 z-20 bg-black/50 transition-opacity lg:hidden', isOpen ? 'opacity-100' : 'pointer-events-none opacity-0')}
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={cn(
          'flex flex-col space-y-6 overflow-y-auto border-r border-surface-200 bg-white p-4 scrollbar-thin transition-transform duration-300 ease-in-out dark:border-surface-800 dark:bg-surface-900',
          isMobileListMode
            ? 'static z-0 h-full w-full translate-x-0'
            : cn('fixed left-0 top-0 z-30 h-full w-64', isOpen ? 'translate-x-0' : '-translate-x-full'),
          'lg:static lg:h-full lg:w-64 lg:flex-shrink-0 lg:translate-x-0'
        )}
      >
        <div className={cn('flex items-center justify-between lg:hidden', isMobileListMode && 'hidden')}>
          <h2 className="text-lg font-bold">Conversations</h2>
          <button onClick={() => setIsOpen(false)} className="p-1 text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white" aria-label="Close conversation list">
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-9 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div>
              <SectionHeading label="Direct Messages" />
              <div className="space-y-1">
                {friends.map((friend) => (
                  <FriendLink key={friend.id} friend={friend} />
                ))}
              </div>
            </div>

            <div>
              <SectionHeading label="Public Channels" onAdd={() => onOpenCreateRoom(false)} />
              <div className="space-y-1">
                {publicChannels.map((room) => (
                  <RoomLink key={room.id} room={room} />
                ))}
              </div>
            </div>

            <div>
              <SectionHeading label="Anonymous Rooms" onAdd={() => onOpenCreateRoom(true)} />
              <div className="space-y-1">
                {anonymousRooms.map((room) => (
                  <RoomLink key={room.id} room={room} />
                ))}
              </div>
            </div>

            <div className="border-t border-surface-200 pt-3 dark:border-surface-800">
              <button
                onClick={onOpenAnonymousChat}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
              >
                <ChatBubbleIcon className="h-5 w-5" />
                <span>Find Stranger</span>
              </button>
              <p className="mt-2 text-center text-xs text-surface-500 dark:text-surface-400">
                Connect with a random stranger for anonymous 1-on-1 chat
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default RoomSidebar;
