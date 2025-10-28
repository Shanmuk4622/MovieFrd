
import React, { useState, useCallback, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { searchUsers, sendFriendRequest } from '../supabaseApi';
import { Profile, Friendship } from '../types';
import { SearchIcon, UserAddIcon, CheckIcon } from './icons';

// FIX: The useDebounce hook was incorrectly implemented and caused several errors.
// This is a corrected version defined locally. It now correctly imports and uses 
// useEffect, and avoids duplicate identifier errors.
const useDebounce = (value: string, delay: number, callback: (value: string) => void) => {
    useEffect(() => {
        const handler = setTimeout(() => {
            callback(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay, callback]);
};

interface UserSearchProps {
  currentUser: User;
  friendships: Friendship[];
  onFriendAction: () => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ currentUser, friendships, onFriendAction }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    const users = await searchUsers(searchQuery, currentUser.id);
    setResults(users);
    setLoading(false);
  }, [currentUser.id]);

  useDebounce(query, 500, debouncedSearch);

  const handleSendRequest = async (addresseeId: string) => {
    try {
      await sendFriendRequest(currentUser.id, addresseeId);
      onFriendAction(); // Refresh friendships in parent
    } catch (error) {
      console.error("Failed to send friend request", error);
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
          placeholder="Search by username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <SearchIcon className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {loading && <div className="text-center py-2 text-sm text-gray-400">Searching...</div>}

      <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
        {results.map(user => {
          const status = getFriendshipStatus(user.id);
          return (
            <div key={user.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
              <span className="font-semibold text-sm">{user.username}</span>
              {status === 'accepted' ? (
                <span className="text-xs font-bold text-green-400 flex items-center"><CheckIcon className="w-4 h-4 mr-1"/> Friends</span>
              ) : status === 'pending' ? (
                <span className="text-xs font-bold text-yellow-400">Pending</span>
              ) : (
                <button 
                  onClick={() => handleSendRequest(user.id)}
                  className="bg-red-600 hover:bg-red-700 p-1 rounded-full text-white"
                >
                  <UserAddIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// FIX: Added a default export to allow this component to be imported by others.
export default UserSearch;
