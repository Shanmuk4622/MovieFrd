import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { generateAIPoweredRecommendations } from '../services/aiRecommendationService';
import { getFriendships, sendFriendRequest } from '../supabaseApi';
import { Profile, UserMovieList } from '../types';
import { UserAddIcon, SparklesIcon } from './icons';
import { RecommendationSkeleton } from './skeletons';
import { Avatar, Spinner } from './ui';

interface FriendRecommendationsProps {
  currentUser: User;
  currentUserProfile?: Profile | null;
  userMovieLists?: UserMovieList[];
  onFriendAction: () => void;
}

const RECOMMENDATIONS_LIMIT = 10;

const FriendRecommendations: React.FC<FriendRecommendationsProps> = ({
  currentUser,
  currentUserProfile,
  userMovieLists = [],
  onFriendAction,
}) => {
  const [recommendations, setRecommendations] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!currentUserProfile) {
          setError('User profile not loaded');
          return;
        }
        const friendships = await getFriendships(currentUser.id);
        const existingFriendIds = friendships
          .filter((f) => f.status === 'accepted')
          .map((f) => (f.requester_id === currentUser.id ? f.addressee_id : f.requester_id));

        setRecommendations(
          await generateAIPoweredRecommendations(currentUserProfile, userMovieLists, existingFriendIds)
        );
      } catch (err) {
        console.error('Failed to fetch AI recommendations', err);
        setError('Could not load recommendations. Please check your Gemini API key.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [currentUser.id, currentUserProfile]);

  const handleSendRequest = async (addresseeId: string) => {
    setError(null);
    setSendingId(addresseeId);
    try {
      await sendFriendRequest(currentUser.id, addresseeId);
      setRecommendations((prev) => prev.filter((r) => r.id !== addresseeId));
      onFriendAction();
    } catch (err: any) {
      console.error('Failed to send friend request', err);
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setSendingId(null);
    }
  };

  const renderContent = () => {
    if (loading) return <RecommendationSkeleton />;
    if (error) return <div className="rounded-xl bg-brand-500/10 p-2 text-sm text-brand-500">{error}</div>;
    if (recommendations.length === 0)
      return <div className="py-4 text-center text-sm text-surface-500 dark:text-surface-400">No new recommendations right now.</div>;

    const displayed = showAll ? recommendations : recommendations.slice(0, RECOMMENDATIONS_LIMIT);
    return (
      <div className="max-h-60 space-y-2 overflow-y-auto scrollbar-thin">
        {displayed.map((user) => {
          const isSending = sendingId === user.id;
          return (
            <div key={user.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-100 p-2 dark:bg-surface-800/60">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar src={user.avatar_url} name={user.username} size="h-8 w-8" />
                <span className="truncate text-sm font-semibold">{user.username}</span>
              </div>
              <button
                onClick={() => handleSendRequest(user.id)}
                disabled={isSending}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-500 disabled:bg-surface-400"
                aria-label={`Send friend request to ${user.username}`}
              >
                {isSending ? <Spinner size="h-4 w-4" /> : <UserAddIcon className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
        {recommendations.length > RECOMMENDATIONS_LIMIT && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="w-full rounded-xl py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-500/10 dark:text-brand-400"
          >
            {showAll ? `Show Less (${RECOMMENDATIONS_LIMIT})` : `Show All (${recommendations.length})`}
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <SparklesIcon className="h-5 w-5 text-brand-500" /> People You May Know
      </h3>
      {renderContent()}
    </div>
  );
};

export default FriendRecommendations;
