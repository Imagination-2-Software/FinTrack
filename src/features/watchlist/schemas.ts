import { z } from 'zod';

const assetTypes = ['Stocks', 'Mutual Funds', 'ETFs', 'Commodities', 'Cryptocurrency'] as const;

export const watchlistSchema = z.object({
  asset_name: z.string().trim().min(1, 'Asset name is required').max(100, 'Use 100 characters or fewer'),
  symbol: z.string().trim().min(1, 'Symbol is required').max(20, 'Use 20 characters or fewer'),
  asset_type: z.enum(assetTypes),
  current_price: z.number().finite().min(0, 'Price cannot be negative').max(99999999999999),
});

export type WatchlistFormValues = z.infer<typeof watchlistSchema>;