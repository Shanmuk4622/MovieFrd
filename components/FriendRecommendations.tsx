import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { generateAIPoweredRecommendations } from '../services/aiRecommendationService';
import { getFriendships, sendFriendRequest } from '../supabaseApi';
import { Profile, Friendship, UserMovieList } from '../types';
import { UserAddIcon, UserIcon, SparklesIcon } from './icons';
import { RecommendationSkeleton } from './skeletons';

interface FriendRecommendationsProps {
  currentUser: User;
  currentUserProfile?: Profile | null;
  userMovieLists?: UserMovieList[];
  onFriendAction: () => void;
}

const RECOMMENDATIONS_LIMIT = 10; // Default limit to show

const FriendRecommendations: React.FC<FriendRecommendationsProps> = ({ 
  currentUser, 
  currentUserProfile, 
  userMovieLists = [],
  onFriendAction 
}) => {
  const [recommendations, setRecommendations] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!currentUserProfile) {
              setError("User profile not loaded");
              setLoading(false);
              return;
            }

            // Get existing friendships to exclude
            const friendships = await getFriendships(currentUser.id);
            const existingFriendIds = friendships
              .filter(f => f.status === 'accepted')
              .map(f => f.requester_id === currentUser.id ? f.addressee_id : f.requester_id);

            // Generate AI-powered recommendations
            const recommendations = await generateAIPoweredRecommendations(
              currentUserProfile,
              userMovieLists,
              existingFriendIds
            );
            
            setRecommendations(recommendations);
        } catch (err: any) {
            console.error("Failed to fetch AI recommendations", err);
            setError("Could not load recommendations. Please check your Gemini API key.");
        } finally {
            setLoading(false);
        }
    };
    fetchRecommendations();
  }, [currentUser.id, currentUserProfile]);

  const handleSendRequest = async (addresseeId: string) => {
    setError(null);
    setSendingRequestId(addresseeId);
    try {
      await sendFriendRequest(currentUser.id, addresseeId);
      // Remove the user from recommendations optimistically
      setRecommendations(prev => prev.filter(r => r.id !== addresseeId));
      onFriendAction(); // Refresh friendships in parent
    } catch (err: any) {
      console.error("Failed to send friend request", err);
      setError(err.message || "An unknown error occurred.");
    } finally {
        setSendingRequestId(null);
    }
  };

  const renderContent = () => {
    if (loading) {
        return <RecommendationSkeleton />;
    }

    if (error) {
        return <div className="mt-2 text-sm text-red-400 bg-red-500/10 p-2 rounded-md">{error}</div>;
    }

    if (recommendations.length === 0) {
        return <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">No new recommendations right now.</div>;
    }

    // Determine which recommendations to display
    const displayedRecommendations = showAllRecommendations ? recommendations : recommendations.slice(0, RECOMMENDATIONS_LIMIT);

    return (
        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
            {displayedRecommendations.map(user => {
                const isSending = sendingRequestId === user.id;
                return (
                    <div key={user.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md">
                        <div className="flex items-center space-x-2 min-w-0">
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full object-cover"/>
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                                    <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400"/>
                                </div>
                            )}
                            <span className="font-semibold text-sm truncate">{user.username}</span>
                        </div>
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
                    </div>
                );
            })}
            {recommendations.length > RECOMMENDATIONS_LIMIT && (
              <button
                onClick={() => setShowAllRecommendations(!showAllRecommendations)}
                className="w-full mt-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 py-2 px-3 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                {showAllRecommendations ? `Show Less (${RECOMMENDATIONS_LIMIT})` : `Show All (${recommendations.length})`}
              </button>
            )}
        </div>
    );
  };
  
  return (
    <div>
      <h3 className="text-lg font-bold mb-3">People You May Know</h3>
      {renderContent()}
    </div>
  );
};

export default FriendRecommendations;