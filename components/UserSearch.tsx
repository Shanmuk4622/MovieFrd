import React, { useState, useMemo, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { getAllUsers, sendFriendRequest } from '../supabaseApi';
import { Profile, Friendship } from '../types';
import { SearchIcon, UserAddIcon, CheckIcon } from './icons';
import { Avatar, Input, Spinner } from './ui';

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
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        setAllUsers(await getAllUsers(currentUser.id));
      } catch (err) {
        console.error('Failed to fetch users', err);
        setError('Could not load user list.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser.id]);

  const filteredUsers = useMemo(() => {
    if (!query) return allUsers;
    return allUsers.filter((u) => u.username.toLowerCase().includes(query.toLowerCase()));
  }, [query, allUsers]);

  const handleSendRequest = async (addresseeId: string) => {
    setError(null);
    setSendingId(addresseeId);
    try {
      await sendFriendRequest(currentUser.id, addresseeId);
      onFriendAction();
    } catch (err: any) {
      console.error('Failed to send friend request', err);
      setError(
        err.message?.includes('security policy')
          ? "Database permission denied. Check the 'friendships' table RLS policies."
          : err.message || 'An unknown error occurred while sending the friend request.'
      );
    } finally {
      setSendingId(null);
    }
  };

  const statusFor = (userId: string) =>
    friendships.find(
      (f) =>
        (f.requester_id === userId && f.addressee_id === currentUser.id) ||
        (f.requester_id === currentUser.id && f.addressee_id === userId)
    )?.status;

  return (
    <div>
      <h3 className="mb-3 text-lg font-bold">Find Friends</h3>
      <Input
        type="text"
        placeholder="Search all users…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        leftIcon={<SearchIcon className="h-5 w-5" />}
      />

      {error && <div className="mt-2 rounded-xl bg-brand-500/10 p-2 text-sm text-brand-500">{error}</div>}

      <div className="mt-4 max-h-60 space-y-2 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="py-4 text-center text-sm text-surface-500 dark:text-surface-400">Loading users…</div>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => {
            const status = statusFor(user.id);
            const isSending = sendingId === user.id;
            return (
              <div key={user.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-100 p-2 dark:bg-surface-800/60">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar src={user.avatar_url} name={user.username} size="h-8 w-8" />
                  <span className="truncate text-sm font-semibold">{user.username}</span>
                </div>
                {status === 'accepted' ? (
                  <span className="flex flex-shrink-0 items-center gap-1 text-xs font-bold text-emerald-500">
                    <CheckIcon className="h-4 w-4" /> Friends
                  </span>
                ) : status === 'pending' ? (
                  <span className="flex-shrink-0 text-xs font-bold text-amber-500">Pending</span>
                ) : (
                  <button
                    onClick={() => handleSendRequest(user.id)}
                    disabled={isSending}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-500 disabled:bg-surface-400"
                    aria-label={`Send friend request to ${user.username}`}
                  >
                    {isSending ? <Spinner size="h-4 w-4" /> : <UserAddIcon className="h-4 w-4" />}
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-4 text-center text-sm text-surface-500 dark:text-surface-400">No users found.</div>
        )}
      </div>
    </div>
  );
};

export default UserDiscovery;
