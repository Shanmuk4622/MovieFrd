import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import { logError } from './helpers';

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) {
    logError('getProfile', error);
    return null;
  }
  return data;
};

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });
  if (uploadError) {
    logError('uploadAvatar', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);
  if (updateError) {
    logError('uploadAvatar:update', updateError);
    // Roll back the orphaned upload if we can't attach it to the profile.
    await supabase.storage.from('avatars').remove([filePath]);
    throw updateError;
  }

  return publicUrl;
};

export const getAllUsers = async (currentUserId: string): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .not('id', 'eq', currentUserId)
    .order('username', { ascending: true });
  if (error) {
    logError('getAllUsers', error);
    return [];
  }
  return data || [];
};

export const searchUsers = async (query: string, currentUserId: string): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${query}%`)
    .not('id', 'eq', currentUserId)
    .limit(10);
  if (error) {
    logError('searchUsers', error);
    return [];
  }
  return data || [];
};
