import React, { useMemo, useState } from 'react';
import { AlertCircle, Eye, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import type { AssetType, DisplayCurrency, InvestmentRow } from '@/types';
import { useInvestmentMutations, useInvestments } from './hooks';
import { calculateInvestment, formatMoney, formatQuantity } from './format';
import type { InvestmentFormValues } from './schemas';
import { InvestmentForm } from './components/InvestmentForm';
import { Modal } from './components/Modal';

type InvestmentDialog =
  | { type: 'add' }
  | { type: 'edit' | 'view' | 'delete'; investment: InvestmentRow }
  | null;

interface CurrencyTotals {
  currency: DisplayCurrency;
  invested: number;
  current: number;
  profitLoss: number;
}

function getCurrencyTotals(investments: InvestmentRow[]): CurrencyTotals[] {
  const totals = new Map<DisplayCurrency, CurrencyTotals>();

  investments.forEach((investment) => {
    const values = calculateInvestment(investment);
    const total = totals.get(investment.currency) ?? {
      currency: investment.currency,
      invested: 0,
      current: 0,
      profitLoss: 0,
    };
    total.invested += values.investedValue;
    total.current += values.currentValue;
    total.profitLoss += values.profitLoss;
    totals.set(investment.currency, total);
  });

  return [...totals.values()].sort((first, second) => first.currency.localeCompare(second.currency));
}

const actionClass = 'rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-500';

export const InvestmentsPage: React.FC = () => {
  const { profile } = useAuth();
  const query = useInvestments();
  const mutations = useInvestmentMutations();
  const [dialog, setDialog] = useState<InvestmentDialog>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AssetType>('ALL');
  const investments = query.data ?? [];

  const filteredInvestments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return investments.filter((inv) => {
      if (typeFilter !== 'ALL' && inv.asset_type !== typeFilter) return false;
      if (term && !`${inv.asset_name} ${inv.symbol}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [investments, search, typeFilter]);

  const submitInvestment = async (values: InvestmentFormValues) => {
    if (!dialog || dialog.type === 'view' || dialog.type === 'delete') return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (dialog.type === 'edit') {
        await mutations.update.mutateAsync({ id: dialog.investment.id, values });
        setSuccessMessage('Holding updated.');
      } else {
        await mutations.create.mutateAsync(values);
        setSuccessMessage('Holding added.');
      }
      setDialog(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save this holding.');
    }
  };

  const confirmDelete = async (investment: InvestmentRow) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await mutations.remove.mutateAsync(investment);
      setDialog(null);
      setSuccessMessage(`${investment.asset_name} was removed. Its transaction history is retained.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete this holding.');
    }
  };

  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-emerald-400">Portfolio</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Investments</h1>
          <p className="mt-2 text-sm text-slate-400">Record holdings and prices you provide. FinTrack does not generate market prices.</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setErrorMessage(null); setDialog({ type: 'add' }); }}>
          Add holding
        </Button>
      </header>

      {errorMessage && <Alert type="error" title="Action failed" onClose={() => setErrorMessage(null)}>{errorMessage}</Alert>}
      {successMessage && <Alert type="success" title="Saved" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}

      {query.isLoading ? (
        <div className="space-y-3" aria-label="Loading investments"><Skeleton className="h-24 w-full" /><Skeleton className="h-72 w-full" /></div>
      ) : query.isError ? (
        <Alert type="error" title="Could not load investments">
          <p>{query.error instanceof Error ? query.error.message : 'Please try again.'}</p>
          <Button className="mt-4" variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => void query.refetch()}>Retry</Button>
        </Alert>
      ) : investments.length === 0 ? (
        <EmptyState icon={<Plus className="h-6 w-6" />} title="No holdings recorded" description="Add a holding to start tracking its recorded value and performance." action={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDialog({ type: 'add' })}>Add holding</Button>} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-medium uppercase text-slate-400">Holdings</p>
              <p className="mt-2 text-2xl font-semibold text-white">{investments.length}</p>
            </div>
            {getCurrencyTotals(investments).map((total) => {
              const percent = total.invested === 0 ? null : total.profitLoss / total.invested * 100;
              return <div key={total.currency} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-medium uppercase text-slate-400">{total.currency} invested</p>
                <p className="mt-2 font-mono text-lg font-semibold text-white">{formatMoney(total.invested, total.currency)}</p>
                <p className="mt-1 text-xs text-slate-400">Current {formatMoney(total.current, total.currency)}</p>
                <p className={`mt-1 text-xs font-medium ${total.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>P&amp;L {formatMoney(total.profitLoss, total.currency)} {percent === null ? '(N/A)' : `(${percent.toFixed(2)}%)`}</p>
              </div>;
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search holdings by name or symbol..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'ALL' | AssetType)}
              className="rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            >
              <option value="ALL">All Asset Classes</option>
              <option value="Stocks">Stocks</option>
              <option value="Mutual Funds">Mutual Funds</option>
              <option value="ETFs">ETFs</option>
              <option value="Commodities">Commodities</option>
              <option value="Cryptocurrency">Cryptocurrency</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Holdings ({filteredInvestments.length})</h2>
              <span className="text-xs text-slate-500">{profile?.display_currency ?? 'USD'} preference does not convert asset currencies</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase text-slate-400"><tr>
                  <th className="px-4 py-3 font-medium">Asset</th><th className="px-4 py-3 font-medium">Quantity</th><th className="px-4 py-3 font-medium">Purchase</th><th className="px-4 py-3 font-medium">Current price</th><th className="px-4 py-3 font-medium">Invested</th><th className="px-4 py-3 font-medium">Current value</th><th className="px-4 py-3 font-medium">P&amp;L</th><th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredInvestments.map((investment) => {
                    const values = calculateInvestment(investment);
                    const positive = values.profitLoss >= 0;
                    return <tr key={investment.id} className="transition hover:bg-slate-900/80">
                      <td className="px-4 py-3"><p className="font-medium text-white">{investment.asset_name}</p><p className="mt-0.5 text-xs text-slate-400">{investment.symbol} · {investment.asset_type} · {investment.currency}</p></td>
                      <td className="px-4 py-3 font-mono text-slate-300">{formatQuantity(Number(investment.quantity))}</td>
                      <td className="px-4 py-3 text-slate-300"><p>{formatMoney(Number(investment.purchase_price), investment.currency)}</p><p className="mt-0.5 text-xs text-slate-500">{investment.purchase_date}</p></td>
                      <td className="px-4 py-3 font-mono text-slate-300">{formatMoney(Number(investment.current_price), investment.currency)}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{formatMoney(values.investedValue, investment.currency)}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{formatMoney(values.currentValue, investment.currency)}</td>
                      <td className="px-4 py-3"><p className={`font-mono ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>{formatMoney(values.profitLoss, investment.currency)}</p><p className={`mt-0.5 text-xs ${positive ? 'text-emerald-500' : 'text-rose-500'}`}>{values.profitLossPercentage === null ? 'N/A (zero cost basis)' : `${values.profitLossPercentage.toFixed(2)}%`}</p></td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1">
                        <button type="button" title="View holding" aria-label={`View ${investment.asset_name}`} className={actionClass} onClick={() => setDialog({ type: 'view', investment })}><Eye className="h-4 w-4" /></button>
                        <button type="button" title="Edit holding" aria-label={`Edit ${investment.asset_name}`} className={actionClass} onClick={() => setDialog({ type: 'edit', investment })}><Pencil className="h-4 w-4" /></button>
                        <button type="button" title="Delete holding" aria-label={`Delete ${investment.asset_name}`} className={`${actionClass} hover:text-rose-400`} onClick={() => setDialog({ type: 'delete', investment })}><Trash2 className="h-4 w-4" /></button>
                      </div></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {dialog?.type === 'add' && <Modal title="Add holding" onClose={() => setDialog(null)}><InvestmentForm defaultCurrency={profile?.display_currency ?? 'USD'} isSubmitting={mutations.create.isPending} onCancel={() => setDialog(null)} onSubmit={submitInvestment} /></Modal>}
      {dialog?.type === 'edit' && <Modal title={`Edit ${dialog.investment.asset_name}`} onClose={() => setDialog(null)}><InvestmentForm investment={dialog.investment} defaultCurrency={dialog.investment.currency} isSubmitting={mutations.update.isPending} onCancel={() => setDialog(null)} onSubmit={submitInvestment} /></Modal>}
      {dialog?.type === 'view' && <Modal title={dialog.investment.asset_name} onClose={() => setDialog(null)}><HoldingDetails investment={dialog.investment} /></Modal>}
      {dialog?.type === 'delete' && <Modal title="Delete holding?" onClose={() => setDialog(null)} widthClassName="max-w-md">
        <div className="space-y-4">
          <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-slate-300"><AlertCircle className="h-5 w-5 shrink-0 text-amber-400" /><p>Remove <strong className="text-white">{dialog.investment.asset_name}</strong>? Linked transaction history will be retained.</p></div>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button variant="danger" isLoading={mutations.remove.isPending} onClick={() => void confirmDelete(dialog.investment)}>Delete holding</Button></div>
        </div>
      </Modal>}
    </section>
  );
};

const HoldingDetails: React.FC<{ investment: InvestmentRow }> = ({ investment }) => {
  const values = calculateInvestment(investment);
  const details = [
    ['Asset type', investment.asset_type], ['Symbol', investment.symbol], ['Quantity', formatQuantity(Number(investment.quantity))],
    ['Purchase price', formatMoney(Number(investment.purchase_price), investment.currency)], ['Purchase date', investment.purchase_date],
    ['Current price', formatMoney(Number(investment.current_price), investment.currency)], ['Currency', investment.currency],
    ['Invested value', formatMoney(values.investedValue, investment.currency)], ['Current value', formatMoney(values.currentValue, investment.currency)],
    ['Profit / loss', formatMoney(values.profitLoss, investment.currency)],
    ['P&L percentage', values.profitLossPercentage === null ? 'N/A (zero cost basis)' : `${values.profitLossPercentage.toFixed(2)}%`],
    ['Notes', investment.notes || 'No notes'],
  ];
  return <dl className="grid gap-4 sm:grid-cols-2">{details.map(([label, value]) => <div key={label}><dt className="text-xs font-medium uppercase text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-200">{value}</dd></div>)}</dl>;
};