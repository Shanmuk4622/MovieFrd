import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface UserMovieList {
  id: number;
  user_id: string;
  tmdb_movie_id: number;
  list_type: 'watched' | 'watchlist';
}

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
};

export const getUserMovieLists = async (userId: string): Promise<UserMovieList[]> => {
    const { data, error } = await supabase
        .from('user_movie_lists')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching user movie lists:', error);
        return [];
    }
    return data || [];
};

export const addMovieToList = async (userId: string, movieId: number, listType: 'watched' | 'watchlist') => {
    const { data, error } = await supabase
        .from('user_movie_lists')
        .upsert({ user_id: userId, tmdb_movie_id: movieId, list_type: listType }, { onConflict: 'user_id, tmdb_movie_id' });

    if (error) {
        console.error('Error adding movie to list:', error);
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
        console.error('Error removing movie from list:', error);
        throw error;
    }
    return data;
};
