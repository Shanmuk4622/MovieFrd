import { supabase } from '../supabaseClient';
import { ListType, UserMovieList } from '../types';
import { logError } from './helpers';

export const getUserMovieLists = async (userId: string): Promise<UserMovieList[]> => {
  const { data, error } = await supabase
    .from('user_movie_lists')
    .select('*')
    .eq('user_id', userId);
  if (error) {
    logError('getUserMovieLists', error);
    return [];
  }
  return data || [];
};

export const addMovieToList = async (userId: string, movieId: number, listType: ListType) => {
  const { data, error } = await supabase
    .from('user_movie_lists')
    .upsert(
      { user_id: userId, tmdb_movie_id: movieId, list_type: listType },
      { onConflict: 'user_id, tmdb_movie_id' }
    );
  if (error) {
    logError('addMovieToList', error);
    throw error;
  }
  return data;
};

export const removeMovieFromList = async (userId: string, movieId: number) => {
  const { data, error } = await supabase
    .from('user_movie_lists')
    .delete()
    .eq('user_id', userId)
    .eq('tmdb_movie_id', movieId);
  if (error) {
    logError('removeMovieFromList', error);
    throw error;
  }
  return data;
};
