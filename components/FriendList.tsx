
import React, { useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { Friendship } from '../types';
import { updateFriendship, removeFriendship } from '../supabaseApi';
import { CheckIcon, UserGroupIcon, XIcon } from './icons';

interface FriendListProps {
  currentUser: User;
  friendships: Friendship[];
  onFriendAction: () => void;
}

type Tab = 'friends' | 'incoming' | 'pending';

const FriendList: React.FC<FriendListProps> = ({ currentUser, friendships, onFriendAction }) => {
  const [activeTab, setActiveTab] = useState<Tab>('friends');

  const { friends, incomingRequests, pendingRequests } = useMemo(() => {
    const friends: Friendship[] = [];
    const incomingRequests: Friendship[] = [];
    const pendingRequests: Friendship[] = [];

    friendships.forEach(f => {
      if (f.status === 'accepted') {
        friends.push(f);
      } else if (f.status === 'pending') {
        if (f.addressee_id === currentUser.id) {
          incomingRequests.push(f);
        } else {
          pendingRequests.push(f);
        }
      }
    });
    return { friends, incomingRequests, pendingRequests };
  }, [friendships, currentUser.id]);
  
  const handleRequestAction = async (friendshipId: number, accept: boolean) => {
    try {
      await updateFriendship(friendshipId, accept ? 'accepted' : 'declined');
      onFriendAction();
    } catch (error) {
      console.error("Failed to update friend request", error);
    }
  };
  
  const handleRemoveFriend = async (friendshipId: number) => {
    if (window.confirm("Are you sure you want to remove this friend?")) {
        try {
            await removeFriendship(friendshipId);
            onFriendAction();
        } catch (error) {
            console.error("Failed to remove friend", error);
        }
    }
  };

  const TabButton: React.FC<{ tab: Tab; label: string; count: number }> = ({ tab, label, count }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors relative ${
        activeTab === tab ? 'bg-red-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
      }`}
    >
      {label}
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {count}
        </span>
      )}
    </button>
  );

  return (
    <div>
      <div className="flex items-center space-x-2 border-b border-gray-200 dark:border-gray-700 pb-2 mb-3">
        <UserGroupIcon className="w-6 h-6" />
        <h3 className="text-lg font-bold">Friends</h3>
      </div>
      <div className="flex space-x-2 mb-4">
        <TabButton tab="friends" label="Friends" count={friends.length} />
        <TabButton tab="incoming" label="Requests" count={incomingRequests.length} />
        <TabButton tab="pending" label="Sent" count={pendingRequests.length} />
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {activeTab === 'friends' && friends.map(f => {
          const friend = f.requester_id === currentUser.id ? f.addressee : f.requester;
          return (
            <div key={f.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md text-sm">
              <span>{friend.username}</span>
              <button onClick={() => handleRemoveFriend(f.id)} className="text-gray-500 dark:text-gray-400 hover:text-red-500"><XIcon className="w-4 h-4"/></button>
            </div>
          )
        })}
        {activeTab === 'incoming' && incomingRequests.map(f => (
          <div key={f.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md text-sm">
            <span>{f.requester.username}</span>
            <div className="flex space-x-2">
                <button onClick={() => handleRequestAction(f.id, true)} className="text-green-400 hover:text-green-300"><CheckIcon className="w-5 h-5"/></button>
                <button onClick={() => handleRequestAction(f.id, false)} className="text-red-500 hover:text-red-400"><XIcon className="w-5 h-5"/></button>
            </div>
          </div>
        ))}
        {activeTab === 'pending' && pendingRequests.map(f => (
           <div key={f.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md text-sm text-gray-500 dark:text-gray-400">
            <span>{f.addressee.username}</span>
            <span>Pending...</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendList;