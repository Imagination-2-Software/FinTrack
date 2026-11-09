import { supabase } from '@/lib/supabase';
import type { ProfileRow } from '@/types';
import type { ProfileSettingsValues } from './schemas';

export async function updateOwnProfile(values: ProfileSettingsValues): Promise<ProfileRow> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Your session has expired. Please sign in again.');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: values.full_name.trim(),
      display_currency: values.display_currency,
    })
    .eq('id', authData.user.id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Profile not found or access denied.');
  return data;
}