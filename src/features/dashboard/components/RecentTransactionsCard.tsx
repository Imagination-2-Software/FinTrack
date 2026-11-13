import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, ExternalLink } from 'lucide-react';
import type { DisplayCurrency, TransactionRow } from '@/types';
import { formatMoney, formatQuantity } from '@/features/investments/format';

interface RecentTransactionsCardProps {
  transactions: TransactionRow[];
  currency?: DisplayCurrency;
}

export const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({
  transactions,
  currency,
}) => {
  const filtered = currency
    ? transactions.filter((t) => !t.currency || t.currency === currency)
    : transactions;

  const recent = filtered.slice(0, 6);

  return (
    <section
      aria-labelledby="recent-transactions-heading"
      className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between border-b border-slate-800/70 pb-4">
        <div>
          <h2 id="recent-transactions-heading" className="text-base font-semibold text-white">
            Recent Ledger Transactions
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Latest BUY &amp; SELL executions across your portfolio
          </p>
        </div>

        <Link
          to="/transactions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition"
        >
          <span>View All</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4">
        {recent.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
            <ArrowLeftRight className="h-6 w-6 text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-400">No transactions recorded</p>
            <p className="mt-1 text-[11px] text-slate-500">
              When you buy or sell assets, ledger entries appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/60 rounded-xl border border-slate-800/80 bg-slate-950/40 overflow-hidden">
            {recent.map((tx) => {
              const isBuy = tx.transaction_type === 'BUY';
              const displayCurr = tx.currency || 'USD';

              return (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-xs transition hover:bg-slate-900/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`inline-flex shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                        isBuy
                          ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                          : 'border border-indigo-500/25 bg-indigo-500/10 text-indigo-300'
                      }`}
                    >
                      {tx.transaction_type}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {tx.asset_name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {tx.transaction_date} &bull; {formatQuantity(Number(tx.quantity))} shares @{' '}
                        {formatMoney(Number(tx.price), displayCurr)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-white tabular-nums">
                      {formatMoney(Number(tx.total_amount), displayCurr)}
                    </div>
                    {tx.currency && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        {tx.currency}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
