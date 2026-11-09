import React, { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Pencil, Plus, RefreshCw, Search, Star, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import type { AssetType, WatchlistRow } from '@/types';
import { Modal } from '@/features/investments/components/Modal';
import { useWatchlist, useWatchlistMutations } from './hooks';
import { watchlistSchema, type WatchlistFormValues } from './schemas';

const assetTypes: AssetType[] = ['Stocks', 'Mutual Funds', 'ETFs', 'Commodities', 'Cryptocurrency'];

const selectClassName =
  'w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50';

const iconButtonClass =
  'rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-brand-500';

const iconEditButtonClass =
  'rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500';

function formatRecordedPrice(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
}

export type WatchlistSortOption = 'RECENT' | 'SYMBOL' | 'NAME' | 'PRICE_DESC' | 'PRICE_ASC';

export const WatchlistPage: React.FC = () => {
  const query = useWatchlist();
  const mutations = useWatchlistMutations();
  const [dialog, setDialog] = useState<'add' | null>(null);
  const [removeTarget, setRemoveTarget] = useState<WatchlistRow | null>(null);
  const [priceTarget, setPriceTarget] = useState<WatchlistRow | null>(null);
  const [search, setSearch] = useState('');
  const [assetType, setAssetType] = useState<'ALL' | AssetType>('ALL');
  const [sortBy, setSortBy] = useState<WatchlistSortOption>('RECENT');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const items = query.data ?? [];

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = items.filter((item) => {
      if (assetType !== 'ALL' && item.asset_type !== assetType) return false;
      if (term && !`${item.asset_name} ${item.symbol}`.toLowerCase().includes(term)) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (sortBy === 'SYMBOL') return a.symbol.localeCompare(b.symbol);
      if (sortBy === 'NAME') return a.asset_name.localeCompare(b.asset_name);
      if (sortBy === 'PRICE_DESC') return Number(b.current_price) - Number(a.current_price);
      if (sortBy === 'PRICE_ASC') return Number(a.current_price) - Number(b.current_price);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, search, assetType, sortBy]);

  const addItem = async (values: WatchlistFormValues) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await mutations.add.mutateAsync(values);
      setDialog(null);
      setSuccessMessage(`${values.symbol.trim().toUpperCase()} added to your watchlist.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to add this watchlist item.');
    }
  };

  const removeItem = async () => {
    if (!removeTarget) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await mutations.remove.mutateAsync(removeTarget.id);
      setSuccessMessage(`${removeTarget.symbol} removed from your watchlist.`);
      setRemoveTarget(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to remove this watchlist item.');
    }
  };

  const updatePrice = async (newPrice: number) => {
    if (!priceTarget) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await mutations.updatePrice.mutateAsync({ id: priceTarget.id, currentPrice: newPrice });
      setSuccessMessage(`Updated manual price for ${priceTarget.symbol} to ${formatRecordedPrice(newPrice)}.`);
      setPriceTarget(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update manual price.');
    }
  };

  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-amber-400">Monitor</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Watchlist</h1>
          <p className="mt-2 text-sm text-slate-400">Track assets with prices you enter manually. No live market data is fetched.</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setErrorMessage(null); setDialog('add'); }}>
          Add asset
        </Button>
      </header>

      {errorMessage && <Alert type="error" title="Action failed" onClose={() => setErrorMessage(null)}>{errorMessage}</Alert>}
      {successMessage && <Alert type="success" title="Updated" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}

      {query.isLoading ? (
        <div className="space-y-3" aria-label="Loading watchlist">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : query.isError ? (
        <Alert type="error" title="Could not load watchlist">
          <p>{query.error instanceof Error ? query.error.message : 'Please try again.'}</p>
          <Button className="mt-4" variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void query.refetch()}>Retry</Button>
        </Alert>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Star className="h-6 w-6" />}
          title="Your watchlist is empty"
          description="Add assets you want to monitor and record their current price yourself."
          action={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDialog('add')}>Add an asset</Button>}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_200px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input aria-label="Search watchlist" className="pl-9" placeholder="Search name or symbol" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <select aria-label="Filter by asset type" className={selectClassName} value={assetType} onChange={(event) => setAssetType(event.target.value as 'ALL' | AssetType)}>
              <option value="ALL">All asset types</option>
              {assetTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select aria-label="Sort watchlist" className={selectClassName} value={sortBy} onChange={(event) => setSortBy(event.target.value as WatchlistSortOption)}>
              <option value="RECENT">Recently added</option>
              <option value="SYMBOL">Symbol (A–Z)</option>
              <option value="NAME">Asset Name (A–Z)</option>
              <option value="PRICE_DESC">Price (High to Low)</option>
              <option value="PRICE_ASC">Price (Low to High)</option>
            </select>
          </div>

          {filteredItems.length === 0 ? (
            <EmptyState title="No matching assets" description="Try a different search, filter, or sort option." action={<button type="button" className="text-sm font-semibold text-brand-400 hover:text-brand-300" onClick={() => { setSearch(''); setAssetType('ALL'); setSortBy('RECENT'); }}>Clear filters</button>} />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Asset</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Recorded current price</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredItems.map((item) => (
                        <WatchlistRowView
                          key={item.id}
                          item={item}
                          onEditPrice={() => setPriceTarget(item)}
                          onRemove={() => setRemoveTarget(item)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 md:hidden">
                {filteredItems.map((item) => (
                  <li key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{item.asset_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.symbol}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" title={`Update price for ${item.symbol}`} aria-label={`Update manual price for ${item.asset_name}`} className={iconEditButtonClass} onClick={() => setPriceTarget(item)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" title={`Remove ${item.symbol}`} aria-label={`Remove ${item.asset_name} from watchlist`} className={iconButtonClass} onClick={() => setRemoveTarget(item)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <Badge variant="default">{item.asset_type}</Badge>
                      <div className="text-right">
                        <p className="text-[10px] uppercase text-slate-500">Recorded price (manual)</p>
                        <p className="mt-1 font-mono text-sm text-slate-200">{formatRecordedPrice(Number(item.current_price))}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-right text-xs text-slate-500">{filteredItems.length} {filteredItems.length === 1 ? 'asset' : 'assets'}</p>
            </>
          )}
        </>
      )}

      {dialog === 'add' && <AddWatchlistModal isSubmitting={mutations.add.isPending} onClose={() => setDialog(null)} onSubmit={addItem} />}
      {priceTarget && (
        <UpdatePriceModal
          item={priceTarget}
          isSubmitting={mutations.updatePrice.isPending}
          onClose={() => setPriceTarget(null)}
          onSubmit={updatePrice}
        />
      )}
      {removeTarget && (
        <Modal title="Remove from watchlist?" onClose={() => setRemoveTarget(null)} widthClassName="max-w-md">
          <div className="space-y-4">
            <p className="text-sm text-slate-300">Remove <strong className="text-white">{removeTarget.asset_name} ({removeTarget.symbol})</strong> from your watchlist?</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
              <Button variant="danger" isLoading={mutations.remove.isPending} onClick={() => void removeItem()}>Remove asset</Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};

const WatchlistRowView: React.FC<{
  item: WatchlistRow;
  onEditPrice: () => void;
  onRemove: () => void;
}> = ({ item, onEditPrice, onRemove }) => (
  <tr className="transition hover:bg-slate-900/80">
    <td className="px-4 py-3"><p className="font-medium text-white">{item.asset_name}</p><p className="mt-0.5 text-xs text-slate-500">{item.symbol}</p></td>
    <td className="px-4 py-3"><Badge variant="default">{item.asset_type}</Badge></td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-slate-200">{formatRecordedPrice(Number(item.current_price))}</span>
        <button
          type="button"
          title={`Update price for ${item.symbol}`}
          aria-label={`Update manual price for ${item.symbol}`}
          className="rounded p-1 text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition"
          onClick={onEditPrice}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-0.5 text-[10px] uppercase text-slate-500">User-entered · manual</p>
    </td>
    <td className="px-4 py-3 text-right">
      <button type="button" title={`Remove ${item.symbol}`} aria-label={`Remove ${item.asset_name} from watchlist`} className={iconButtonClass} onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </button>
    </td>
  </tr>
);

interface UpdatePriceModalProps {
  item: WatchlistRow;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (newPrice: number) => Promise<void>;
}

const UpdatePriceModal: React.FC<UpdatePriceModalProps> = ({ item, isSubmitting, onClose, onSubmit }) => {
  const [priceInput, setPriceInput] = useState<string>(String(item.current_price));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(priceInput);
    if (!priceInput.trim() || !Number.isFinite(parsed) || parsed < 0 || parsed > 99999999999999) {
      setError('Enter a valid non-negative price within the supported range.');
      return;
    }
    setError(null);
    await onSubmit(parsed);
  };

  return (
    <Modal title={`Update price: ${item.symbol}`} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-slate-300">
            Record a new manual price for <strong className="text-white">{item.asset_name} ({item.symbol})</strong>:
          </p>
        </div>
        <Input
          label="Manual price"
          type="number"
          min="0"
          step="0.0001"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          error={error ?? undefined}
          hint="Manual price only. FinTrack does not fetch or fabricate market quotes."
          autoFocus
        />
        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Save manual price</Button>
        </div>
      </form>
    </Modal>
  );
};

interface AddWatchlistModalProps {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: WatchlistFormValues) => Promise<void>;
}

const AddWatchlistModal: React.FC<AddWatchlistModalProps> = ({ isSubmitting, onClose, onSubmit }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<WatchlistFormValues>({
    resolver: zodResolver(watchlistSchema),
    defaultValues: {
      asset_name: '',
      symbol: '',
      asset_type: 'Stocks',
      current_price: undefined,
    },
  });

  return (
    <Modal title="Add watchlist asset" onClose={onClose}>
      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Asset name" autoComplete="off" placeholder="Company or fund name" error={errors.asset_name?.message} {...register('asset_name')} />
          <Input label="Symbol" autoComplete="off" placeholder="e.g. ACME" error={errors.symbol?.message} {...register('symbol')} />
          <div className="space-y-1.5">
            <label htmlFor="watchlist_asset_type" className="block text-xs font-semibold uppercase text-slate-300">Asset type</label>
            <select id="watchlist_asset_type" className={selectClassName} {...register('asset_type')}>
              {assetTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <Input label="Current price you recorded" type="number" min="0" step="0.0001" hint="Manual value only. The existing watchlist table does not store a currency or provide a live quote." error={errors.current_price?.message} {...register('current_price', { valueAsNumber: true })} />
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>Add to watchlist</Button>
        </div>
      </form>
    </Modal>
  );
};
