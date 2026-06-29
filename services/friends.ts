import { supabase } from '../supabaseClient';
import { Friendship, FriendshipStatus, Profile } from '../types';
import { logError } from './helpers';

export const getFriendships = async (userId: string): Promise<Friendship[]> => {
  const { data, error } = await supabase
    .from('friendships')
    .select('*, requester:requester_id(*), addressee:addressee_id(*)')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) {
    logError('getFriendships', error);
    return [];
  }
  return (data as Friendship[]) || [];
};

// Requires the `get_friend_recommendations` RPC to exist in the Supabase project.
export const getFriendRecommendations = async (userId: string): Promise<Profile[]> => {
  const { data, error } = await supabase.rpc('get_friend_recommendations', {
    current_user_id: userId,
    recommendation_limit: 10,
  });
  if (error) {
    logError('getFriendRecommendations', error);
    return [];
  }
  return data || [];
};

export const sendFriendRequest = async (requesterId: string, addresseeId: string) => {
  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' });
  if (error) {
    logError('sendFriendRequest', error);
    throw error;
  }
  return data;
};

export const updateFriendship = async (friendshipId: number, status: FriendshipStatus) => {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) {
    logError('updateFriendship', error);
    throw error;
  }
  return data;
};

export const removeFriendship = async (friendshipId: number) => {
  const { data, error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) {
    logError('removeFriendship', error);
    throw error;
  }
  return data;
};
