import React, { useState, useMemo, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { getAllUsers, sendFriendRequest } from '../supabaseApi';
import { Profile, Friendship } from '../types';
import { SearchIcon, UserAddIcon, CheckIcon } from './icons';

interface UserDiscoveryProps {
  currentUser: User;
  friendships: Friendship[];
  onFriendAction: () => void;
}

const UserDiscovery: React.FC<UserDiscoveryProps> = ({ currentUser, friendships, onFriendAction }) => {
  const [query, setQuery] = useState('');
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const users = await getAllUsers(currentUser.id);
            setAllUsers(users);
        } catch (err) {
            console.error("Failed to fetch users", err);
            setError("Could not load user list.");
        } finally {
            setLoading(false);
        }
    };
    fetchAllUsers();
  }, [currentUser.id]);

  const filteredUsers = useMemo(() => {
    if (!query) {
      return allUsers;
    }
    return allUsers.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, allUsers]);

  const handleSendRequest = async (addresseeId: string) => {
    setError(null);
    setSendingRequestId(addresseeId);
    try {
      await sendFriendRequest(currentUser.id, addresseeId);
      onFriendAction(); // Refresh friendships in parent
    } catch (err: any) {
      console.error("Failed to send friend request", err);
      if (err.message && err.message.includes('security policy')) {
          setError("Database permission denied. Please check Row Level Security policies for the 'friendships' table.");
      } else {
          setError(err.message || "An unknown error occurred while sending the friend request.");
      }
    } finally {
        setSendingRequestId(null);
    }
  };

  const getFriendshipStatus = (userId: string) => {
    const friendship = friendships.find(f => 
      (f.requester_id === userId && f.addressee_id === currentUser.id) ||
      (f.requester_id === currentUser.id && f.addressee_id === userId)
    );
    return friendship?.status;
  };

  return (
    <div>
      <h3 className="text-lg font-bold mb-3">Find Friends</h3>
      <div className="relative">
        <input
          type="text"
          placeholder="Search all users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
      </div>

      {error && <div className="mt-2 text-sm text-red-400 bg-red-500/10 p-2 rounded-md">{error}</div>}

      <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
        {loading ? (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">Loading users...</div>
        ) : filteredUsers.length > 0 ? (
            filteredUsers.map(user => {
            const status = getFriendshipStatus(user.id);
            const isSending = sendingRequestId === user.id;
            return (
                <div key={user.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md">
                <span className="font-semibold text-sm truncate pr-2">{user.username}</span>
                {status === 'accepted' ? (
                    <span className="text-xs font-bold text-green-400 flex items-center flex-shrink-0"><CheckIcon className="w-4 h-4 mr-1"/> Friends</span>
                ) : status === 'pending' ? (
                    <span className="text-xs font-bold text-yellow-400 flex-shrink-0">Pending</span>
                ) : (
                    <button 
                    onClick={() => handleSendRequest(user.id)}
                    disabled={isSending}
                    className="bg-red-600 hover:bg-red-700 p-1 rounded-full text-white w-6 h-6 flex items-center justify-center flex-shrink-0 disabled:bg-gray-500 disabled:cursor-wait"
                    aria-label={`Send friend request to ${user.username}`}
                    >
                    {isSending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                    ) : (
                        <UserAddIcon className="w-4 h-4" />
                    )}
                    </button>
                )}
                </div>
            );
            })
        ) : (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">No users found.</div>
        )}
      </div>
    </div>
  );
};

export default UserDiscovery;