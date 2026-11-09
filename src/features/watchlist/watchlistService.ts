import { supabase } from '@/lib/supabase';
import type { WatchlistInsert, WatchlistRow } from '@/types';
import type { WatchlistFormValues } from './schemas';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Your session has expired. Please sign in again.');
  return data.user.id;
}

export async function listWatchlistItems(): Promise<WatchlistRow[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createWatchlistItem(values: WatchlistFormValues): Promise<WatchlistRow> {
  const userId = await requireUserId();
  const item: Omit<WatchlistInsert, 'user_id'> = {
    asset_name: values.asset_name.trim(),
    symbol: values.symbol.trim().toUpperCase(),
    asset_type: values.asset_type,
    current_price: values.current_price,
  };

  const { data, error } = await supabase
    .from('watchlist')
    .insert({ ...item, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeWatchlistItem(id: string): Promise<void> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('watchlist')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Watchlist item not found or access denied.');
}

export async function updateWatchlistItemPrice(id: string, currentPrice: number): Promise<WatchlistRow> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('watchlist')
    .update({ current_price: currentPrice })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}