import { supabase } from '../supabaseClient';
import { MovieReview, Profile, UserMovieList } from '../types';
import { logError } from './helpers';

export type FriendActivity = UserMovieList & {
  created_at: string;
  profiles: Profile | null;
};

export type FriendReviewActivity = MovieReview & {
  profiles: Profile | null;
};

/**
 * Aggregates recent list + review activity from the user's accepted friends
 * (and the user themselves, so their own actions show up in the feed).
 */
export const getFriendActivity = async (
  userId: string
): Promise<(FriendActivity | FriendReviewActivity)[]> => {
  const { data: friendships, error: friendsError } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted');
  if (friendsError) {
    logError('getFriendActivity:friends', friendsError);
    throw friendsError;
  }

  const friendIds = friendships.map((f) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );
  if (!friendIds.includes(userId)) friendIds.push(userId);
  if (friendIds.length === 0) return [];

  // List activities (joined with profiles).
  const { data: listActivities, error: listError } = await supabase
    .from('user_movie_lists')
    .select('*, profiles(*)')
    .in('user_id', friendIds)
    .order('created_at', { ascending: false })
    .limit(20);
  if (listError) logError('getFriendActivity:lists', listError);

  // Review activities (profiles enriched manually to avoid join failures).
  const { data: reviewRaw, error: reviewError } = await supabase
    .from('movie_reviews')
    .select('*')
    .in('user_id', friendIds)
    .order('created_at', { ascending: false })
    .limit(20);
  if (reviewError) logError('getFriendActivity:reviews', reviewError);

  const profileMap = new Map<string, Profile>();
  (listActivities || []).forEach((act) => {
    if (act.profiles) profileMap.set(act.profiles.id, act.profiles);
  });

  const missingIds = Array.from(
    new Set(
      (reviewRaw || []).map((r) => r.user_id).filter((uid) => uid && !profileMap.has(uid))
    )
  );
  if (missingIds.length > 0) {
    const { data: missingProfiles, error: missingError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', missingIds);
    if (missingError) logError('getFriendActivity:missingProfiles', missingError);
    else missingProfiles?.forEach((p) => profileMap.set(p.id, p));
  }

  const reviewActivities = (reviewRaw || []).map((r) => ({
    ...r,
    profiles: profileMap.get(r.user_id) || null,
  })) as FriendReviewActivity[];

  return [...(listActivities || []), ...reviewActivities]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);
};
