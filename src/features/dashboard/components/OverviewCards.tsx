import React from 'react';
import { Wallet, Briefcase, TrendingUp, TrendingDown, Clock3, AlertCircle } from 'lucide-react';
import type { DisplayCurrency } from '@/types';
import { formatMoney } from '@/features/investments/format';

export interface OverviewSummaryData {
  currency: DisplayCurrency;
  invested: number;
  current: number;
  profitLoss: number;
  profitLossPercentage: number | null;
  todayProfitLoss: number | null;
  todayProfitLossPercentage: number | null;
  baselinePending: boolean;
  totalPositions: number;
}

interface OverviewCardsProps {
  summary: OverviewSummaryData;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ summary }) => {
  const isPositiveTotal = summary.profitLoss >= 0;
  const isPositiveToday = summary.todayProfitLoss !== null && summary.todayProfitLoss >= 0;

  return (
    <section aria-label="Portfolio overview metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Portfolio Value */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md transition-all hover:border-slate-700/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Portfolio Value
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-500/20 bg-brand-500/10 text-brand-300">
            <Wallet className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl tabular-nums">
            {formatMoney(summary.current, summary.currency)}
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Across {summary.totalPositions} active holding{summary.totalPositions === 1 ? '' : 's'}
        </div>
      </div>

      {/* 2. Total Invested Amount */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md transition-all hover:border-slate-700/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Invested Capital
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/70 text-slate-300">
            <Briefcase className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="font-mono text-2xl font-bold tracking-tight text-slate-200 sm:text-3xl tabular-nums">
            {formatMoney(summary.invested, summary.currency)}
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Cumulative recorded cost basis
        </div>
      </div>

      {/* 3. Total Profit / Loss */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md transition-all hover:border-slate-700/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Profit / Loss
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
              isPositiveTotal
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/25 bg-rose-500/10 text-rose-400'
            }`}
          >
            {isPositiveTotal ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
          </div>
        </div>
        <div className="mt-3">
          <div
            className={`font-mono text-2xl font-bold tracking-tight sm:text-3xl tabular-nums ${
              isPositiveTotal ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositiveTotal ? '+' : ''}
            {formatMoney(summary.profitLoss, summary.currency)}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {summary.profitLossPercentage !== null ? (
            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                isPositiveTotal
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border border-rose-500/20 bg-rose-500/10 text-rose-400'
              }`}
            >
              {isPositiveTotal ? '+' : ''}
              {summary.profitLossPercentage.toFixed(2)}%
            </span>
          ) : (
            <span className="text-xs text-slate-500">Zero cost basis</span>
          )}
          <span className="text-xs text-slate-400">all-time unrealized return</span>
        </div>
      </div>

      {/* 4. Today's Change */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md transition-all hover:border-slate-700/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Today&apos;s Change
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/70 text-slate-300">
            <Clock3 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          {summary.baselinePending || summary.todayProfitLoss === null ? (
            <div className="font-mono text-2xl font-bold tracking-tight text-slate-400 sm:text-3xl">
              N/A
            </div>
          ) : (
            <div
              className={`font-mono text-2xl font-bold tracking-tight sm:text-3xl tabular-nums ${
                isPositiveToday ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositiveToday ? '+' : ''}
              {formatMoney(summary.todayProfitLoss, summary.currency)}
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {summary.baselinePending || summary.todayProfitLoss === null ? (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"
              title="Daily performance requires recorded previous-close prices for all positions."
            >
              <AlertCircle className="h-3 w-3" />
              <span>Pending Baseline</span>
            </span>
          ) : summary.todayProfitLossPercentage !== null ? (
            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                isPositiveToday
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border border-rose-500/20 bg-rose-500/10 text-rose-400'
              }`}
            >
              {isPositiveToday ? '+' : ''}
              {summary.todayProfitLossPercentage.toFixed(2)}%
            </span>
          ) : null}
          <span className="text-xs text-slate-400">vs recorded previous close</span>
        </div>
      </div>
    </section>
  );
};
