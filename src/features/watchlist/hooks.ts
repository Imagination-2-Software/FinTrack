import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { createWatchlistItem, listWatchlistItems, removeWatchlistItem, updateWatchlistItemPrice } from './watchlistService';
import type { WatchlistFormValues } from './schemas';

export const watchlistKeys = {
  all: ['watchlist'] as const,
  list: (userId: string) => ['watchlist', userId] as const,
};

export function useWatchlist() {
  const { user } = useAuth();

  return useQuery({
    queryKey: watchlistKeys.list(user?.id ?? 'signed-out'),
    queryFn: listWatchlistItems,
    enabled: Boolean(user?.id),
  });
}

export function useWatchlistMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: watchlistKeys.all });

  const add = useMutation({
    mutationFn: (values: WatchlistFormValues) => createWatchlistItem(values),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeWatchlistItem(id),
    onSuccess: invalidate,
  });

  const updatePrice = useMutation({
    mutationFn: ({ id, currentPrice }: { id: string; currentPrice: number }) =>
      updateWatchlistItemPrice(id, currentPrice),
    onSuccess: invalidate,
  });

  return { add, remove, updatePrice };
}