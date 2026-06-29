import React, { useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { Friendship } from '../types';
import { updateFriendship, removeFriendship } from '../supabaseApi';
import { CheckIcon, UserGroupIcon, XIcon } from './icons';
import { FriendListSkeleton } from './skeletons';
import { cn } from '../utils/cn';

interface FriendListProps {
  currentUser: User;
  friendships: Friendship[];
  onFriendAction: () => void;
  isLoading: boolean;
  onSelectProfile: (userId: string) => void;
}

type Tab = 'friends' | 'incoming' | 'pending';

const FRIENDS_LIMIT = 10;

const FriendList: React.FC<FriendListProps> = ({
  currentUser,
  friendships,
  onFriendAction,
  isLoading,
  onSelectProfile,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [showAll, setShowAll] = useState(false);

  const { friends, incomingRequests, pendingRequests } = useMemo(() => {
    const friends: Friendship[] = [];
    const incomingRequests: Friendship[] = [];
    const pendingRequests: Friendship[] = [];
    friendships.forEach((f) => {
      if (f.status === 'accepted') friends.push(f);
      else if (f.status === 'pending') {
        if (f.addressee_id === currentUser.id) incomingRequests.push(f);
        else pendingRequests.push(f);
      }
    });
    return { friends, incomingRequests, pendingRequests };
  }, [friendships, currentUser.id]);

  const displayedFriends = showAll ? friends : friends.slice(0, FRIENDS_LIMIT);

  const handleRequestAction = async (id: number, accept: boolean) => {
    try {
      await updateFriendship(id, accept ? 'accepted' : 'declined');
      onFriendAction();
    } catch (error) {
      console.error('Failed to update friend request', error);
    }
  };

  const handleRemoveFriend = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      await removeFriendship(id);
      onFriendAction();
    } catch (error) {
      console.error('Failed to remove friend', error);
    }
  };

  const TabButton: React.FC<{ tab: Tab; label: string; count: number }> = ({ tab, label, count }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={cn(
        'relative flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold transition-all',
        activeTab === tab
          ? 'bg-white text-brand-600 shadow-sm dark:bg-surface-700 dark:text-brand-400'
          : 'text-surface-600 hover:bg-white/50 dark:text-surface-300 dark:hover:bg-surface-700/50'
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold',
          activeTab === tab ? 'bg-brand-600 text-white' : 'bg-surface-200 text-surface-700 dark:bg-surface-600 dark:text-surface-100'
        )}
      >
        {count}
      </span>
    </button>
  );

  const row = 'flex items-center justify-between gap-2 rounded-xl bg-surface-100 p-2.5 text-sm dark:bg-surface-800/60';

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 border-b border-surface-200 pb-2 dark:border-surface-700">
        <UserGroupIcon className="h-6 w-6" />
        <h3 className="text-lg font-bold">Friends</h3>
      </div>
      <div className="mb-4 flex gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800/60">
        <TabButton tab="friends" label="Friends" count={friends.length} />
        <TabButton tab="incoming" label="Requests" count={incomingRequests.length} />
        <TabButton tab="pending" label="Sent" count={pendingRequests.length} />
      </div>

      <div className="max-h-80 space-y-2 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <FriendListSkeleton />
        ) : (
          <>
            {activeTab === 'friends' &&
              displayedFriends.map((f) => {
                const friend = f.requester_id === currentUser.id ? f.addressee : f.requester;
                return (
                  <div key={f.id} className={row}>
                    <button onClick={() => onSelectProfile(friend.id)} className="truncate text-left font-semibold hover:underline">
                      {friend.username}
                    </button>
                    <button onClick={() => handleRemoveFriend(f.id)} className="p-1 text-surface-500 hover:text-brand-500 dark:text-surface-400">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            {activeTab === 'friends' && friends.length > FRIENDS_LIMIT && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="w-full rounded-xl py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-500/10 dark:text-brand-400"
              >
                {showAll ? `Show Less (${FRIENDS_LIMIT})` : `Show All (${friends.length})`}
              </button>
            )}
            {activeTab === 'incoming' &&
              incomingRequests.map((f) => (
                <div key={f.id} className={row}>
                  <span className="truncate font-semibold">
                    <span className="mr-1 font-normal text-surface-500 dark:text-surface-400">From:</span>
                    {f.requester.username}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => handleRequestAction(f.id, true)} className="text-emerald-500 hover:text-emerald-400">
                      <CheckIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleRequestAction(f.id, false)} className="text-brand-500 hover:text-brand-400">
                      <XIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            {activeTab === 'pending' &&
              pendingRequests.map((f) => (
                <div key={f.id} className={row}>
                  <span className="truncate font-semibold">
                    <span className="mr-1 font-normal text-surface-500 dark:text-surface-400">To:</span>
                    {f.addressee.username}
                  </span>
                  <span className="text-xs font-semibold text-amber-500">Pending</span>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
};

export default FriendList;
