import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import type { DisplayCurrency, TransactionType } from '@/types';
import { useCreateTransaction, useInvestments, useTransactions } from './hooks';
import { formatMoney, formatQuantity } from './format';
import type { TransactionFormValues } from './schemas';
import { Modal } from './components/Modal';
import { TransactionForm } from './components/TransactionForm';

type CurrencyTotal = {
  currency: DisplayCurrency | null;
  buys: number;
  sells: number;
  count: number;
};

const selectClassName =
  'rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50';

export const TransactionsPage: React.FC = () => {
  const investmentsQuery = useInvestments();
  const transactionsQuery = useTransactions();
  const createTransaction = useCreateTransaction();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [investmentFilter, setInvestmentFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const investments = investmentsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      if (typeFilter !== 'ALL' && transaction.transaction_type !== typeFilter) return false;
      if (investmentFilter !== 'ALL' && transaction.investment_id !== investmentFilter) return false;
      if (startDate && transaction.transaction_date < startDate) return false;
      if (endDate && transaction.transaction_date > endDate) return false;
      if (normalizedSearch && !`${transaction.asset_symbol} ${transaction.asset_name} ${transaction.notes ?? ''}`.toLowerCase().includes(normalizedSearch)) return false;
      return true;
    });
  }, [transactions, typeFilter, investmentFilter, startDate, endDate, search]);

  const totals = useMemo(() => {
    const byCurrency = new Map<string, CurrencyTotal>();
    filteredTransactions.forEach((transaction) => {
      const currency = transaction.currency;
      const key = currency ?? 'UNAVAILABLE';
      const total = byCurrency.get(key) ?? { currency, buys: 0, sells: 0, count: 0 };
      const amount = Number(transaction.total_amount);
      if (transaction.transaction_type === 'BUY') total.buys += amount;
      else total.sells += amount;
      total.count += 1;
      byCurrency.set(key, total);
    });

    return [...byCurrency.values()].sort((first, second) =>
      (first.currency ?? 'ZZZ').localeCompare(second.currency ?? 'ZZZ')
    );
  }, [filteredTransactions]);

  const submitTransaction = async (values: TransactionFormValues) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await createTransaction.mutateAsync(values);
      setDialogOpen(false);
      setSuccessMessage('Transaction recorded. The database calculated its total.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to record this transaction.');
    }
  };

  const hasLoadingError = investmentsQuery.isError || transactionsQuery.isError;
  const isLoading = investmentsQuery.isLoading || transactionsQuery.isLoading;

  return (
    <section className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-sky-400">Ledger</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Transactions</h1>
          <p className="mt-2 text-sm text-slate-400">BUY and SELL history is append-only for signed-in users.</p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={investments.length === 0 || investmentsQuery.isLoading}
          onClick={() => { setErrorMessage(null); setDialogOpen(true); }}
        >
          Record transaction
        </Button>
      </header>

      {errorMessage && <Alert type="error" title="Action failed" onClose={() => setErrorMessage(null)}>{errorMessage}</Alert>}
      {successMessage && <Alert type="success" title="Saved" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}

      {isLoading ? (
        <div className="space-y-3" aria-label="Loading transactions">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : hasLoadingError ? (
        <Alert type="error" title="Could not load transaction data">
          <p>{investmentsQuery.error instanceof Error ? investmentsQuery.error.message : transactionsQuery.error instanceof Error ? transactionsQuery.error.message : 'Please try again.'}</p>
          <Button className="mt-4" variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => { void investmentsQuery.refetch(); void transactionsQuery.refetch(); }}>
            Retry
          </Button>
        </Alert>
      ) : investments.length === 0 ? (
        <EmptyState
          title="Add a holding before recording a transaction"
          description="Transactions are linked to one of your holdings so asset details and currency can be identified without trusting client-supplied user IDs."
          action={<Link to="/investments" className="text-sm font-semibold text-brand-400 hover:text-brand-300">Go to Investments</Link>}
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No transactions recorded"
          description="Your BUY and SELL ledger entries will appear here after you record them."
          action={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDialogOpen(true)}>Record transaction</Button>}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs font-medium uppercase text-slate-400">Filtered entries</p>
              <p className="mt-2 text-2xl font-semibold text-white">{filteredTransactions.length}</p>
            </div>
            {totals.map((total) => (
              <div key={total.currency ?? 'unavailable'} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-medium uppercase text-slate-400">{total.currency ?? 'Currency unavailable'}</p>
                {total.currency ? (
                  <>
                    <p className="mt-2 text-sm text-slate-300">Buys <span className="font-mono text-white">{formatMoney(total.buys, total.currency)}</span></p>
                    <p className="mt-1 text-sm text-slate-300">Sells <span className="font-mono text-white">{formatMoney(total.sells, total.currency)}</span></p>
                  </>
                ) : <p className="mt-2 text-sm text-amber-400">Currency unavailable for legacy entry</p>}
              </div>
            ))}
          </div>

          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="relative xl:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input aria-label="Search transactions" className="pl-9" placeholder="Search asset, symbol, or notes" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <select aria-label="Filter by transaction type" className={selectClassName} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'ALL' | TransactionType)}>
                <option value="ALL">All types</option><option value="BUY">BUY</option><option value="SELL">SELL</option>
              </select>
              <select aria-label="Filter by holding" className={selectClassName} value={investmentFilter} onChange={(event) => setInvestmentFilter(event.target.value)}>
                <option value="ALL">All holdings</option>
                {investments.map((investment) => <option key={investment.id} value={investment.id}>{investment.symbol} · {investment.asset_name}</option>)}
              </select>
              <div className="flex gap-2">
                <Input aria-label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                <Input aria-label="End date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Totals use each transaction’s stored currency snapshot. Unknown legacy currencies are excluded from currency totals.</span>
              <button type="button" className="text-brand-400 hover:text-brand-300" onClick={() => { setTypeFilter('ALL'); setInvestmentFilter('ALL'); setSearch(''); setStartDate(''); setEndDate(''); }}>Clear filters</button>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <EmptyState title="No matching transactions" description="Try changing or clearing the filters." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Asset</th>
                      <th className="px-4 py-3 font-medium">Quantity</th>
                      <th className="px-4 py-3 font-medium">Price</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredTransactions.map((transaction) => {
                      const currency = transaction.currency;
                      return (
                        <tr key={transaction.id} className="transition hover:bg-slate-900/80">
                          <td className="px-4 py-3 text-slate-300">{transaction.transaction_date}</td>
                          <td className="px-4 py-3"><span className={`rounded-md border px-2 py-1 text-xs font-semibold ${transaction.transaction_type === 'BUY' ? 'border-sky-500/20 bg-sky-500/10 text-sky-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-400'}`}>{transaction.transaction_type}</span></td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-white">{transaction.asset_name}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{transaction.asset_symbol}{currency ? ` · ${currency}` : ' · currency unavailable'}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-300">{formatQuantity(Number(transaction.quantity))}</td>
                          <td className="px-4 py-3 font-mono text-slate-300">{currency ? formatMoney(Number(transaction.price), currency) : Number(transaction.price).toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono text-white">{currency ? formatMoney(Number(transaction.total_amount), currency) : Number(transaction.total_amount).toLocaleString()}</td>
                          <td className="max-w-xs truncate px-4 py-3 text-slate-400" title={transaction.notes ?? ''}>{transaction.notes || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {dialogOpen && (
        <Modal title="Record transaction" onClose={() => setDialogOpen(false)}>
          <TransactionForm
            investments={investments}
            isSubmitting={createTransaction.isPending}
            onCancel={() => setDialogOpen(false)}
            onSubmit={submitTransaction}
          />
        </Modal>
      )}
    </section>
  );
};