import { supabase } from '../supabaseClient';
import { MovieReview, Profile } from '../types';
import { logError, NOT_FOUND } from './helpers';

export const addOrUpdateReview = async (
  userId: string,
  movieId: number,
  rating: number,
  reviewText: string
): Promise<MovieReview> => {
  const { data, error } = await supabase
    .from('movie_reviews')
    .upsert(
      { user_id: userId, tmdb_movie_id: movieId, rating, review_text: reviewText || null },
      { onConflict: 'user_id, tmdb_movie_id' }
    )
    .select('*')
    .single();
  if (error) {
    logError('addOrUpdateReview', error);
    throw error;
  }
  return data as MovieReview;
};

export const getUserReview = async (
  userId: string,
  movieId: number
): Promise<MovieReview | null> => {
  const { data, error } = await supabase
    .from('movie_reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('tmdb_movie_id', movieId)
    .single();
  if (error) {
    if (error.code !== NOT_FOUND) logError('getUserReview', error);
    return null;
  }
  return data as MovieReview;
};

export const getMovieReviews = async (movieId: number, limit = 10): Promise<MovieReview[]> => {
  const { data: reviews, error } = await supabase
    .from('movie_reviews')
    .select('*')
    .eq('tmdb_movie_id', movieId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    logError('getMovieReviews', error);
    return [];
  }

  // Enrich with author profiles in a single follow-up query.
  const userIds = Array.from(new Set((reviews || []).map((r) => r.user_id)));
  const profileMap: Record<string, Profile> = {};
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);
    if (profileError) logError('getMovieReviews:profiles', profileError);
    else profiles?.forEach((p: Profile) => (profileMap[p.id] = p));
  }

  return (reviews || []).map((r) => ({ ...r, profiles: profileMap[r.user_id] || null })) as MovieReview[];
};

export const deleteReview = async (userId: string, movieId: number): Promise<void> => {
  const { error } = await supabase
    .from('movie_reviews')
    .delete()
    .eq('user_id', userId)
    .eq('tmdb_movie_id', movieId);
  if (error) {
    logError('deleteReview', error);
    throw error;
  }
};

export const getUserReviews = async (userId: string): Promise<MovieReview[]> => {
  const { data, error } = await supabase
    .from('movie_reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    logError('getUserReviews', error);
    return [];
  }
  return (data as MovieReview[]) || [];
};
