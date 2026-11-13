import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BriefcaseBusiness,
  ArrowUpRightFromSquare,
  LogOut,
  RefreshCw,
  Wallet,
  Plus,
} from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import type { DisplayCurrency, InvestmentRow } from '@/types';
import { useInvestments, useTransactions } from '@/features/investments/hooks';
import { calculateInvestment } from '@/features/investments/format';

import { OverviewCards, type OverviewSummaryData } from './components/OverviewCards';
import { PerformanceChart } from './components/PerformanceChart';
import { AllocationDonut } from './components/AllocationDonut';
import { PortfolioHealthCard } from './components/PortfolioHealthCard';
import { PerformersCard } from './components/PerformersCard';
import { HoldingsTable } from './components/HoldingsTable';
import { RecentTransactionsCard } from './components/RecentTransactionsCard';
import { GoalsAndInsights } from './components/GoalsAndInsights';

function computeCurrencySummary(
  investments: InvestmentRow[],
  currency: DisplayCurrency
): OverviewSummaryData {
  const items = investments.filter((i) => i.currency === currency && Number(i.quantity) > 0);

  const invested = items.reduce(
    (total, inv) => total + calculateInvestment(inv).investedValue,
    0
  );
  const current = items.reduce(
    (total, inv) => total + calculateInvestment(inv).currentValue,
    0
  );
  const profitLoss = current - invested;
  const profitLossPercentage = invested > 0 ? (profitLoss / invested) * 100 : null;

  const hasValidBaseline = (inv: InvestmentRow) =>
    inv.previous_close_price !== null &&
    Number.isFinite(Number(inv.previous_close_price)) &&
    Number(inv.previous_close_price) >= 0;

  const positionsNeedingBaseline = items.filter((inv) => !hasValidBaseline(inv));
  const baselinePending = positionsNeedingBaseline.length > 0;

  const previousCloseValue = items.reduce((total, inv) => {
    if (!hasValidBaseline(inv)) return total;
    return total + Number(inv.quantity) * Number(inv.previous_close_price);
  }, 0);

  const todayProfitLoss = baselinePending ? null : current - previousCloseValue;
  const todayProfitLossPercentage =
    todayProfitLoss === null || previousCloseValue === 0
      ? null
      : (todayProfitLoss / previousCloseValue) * 100;

  return {
    currency,
    invested,
    current,
    profitLoss,
    profitLossPercentage,
    todayProfitLoss,
    todayProfitLossPercentage,
    baselinePending,
    totalPositions: items.length,
  };
}

export const DashboardPage: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const investmentsQuery = useInvestments();
  const transactionsQuery = useTransactions();

  const investments = investmentsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];

  // Determine available currencies from holdings, fallback to profile preference
  const availableCurrencies = useMemo(() => {
    const set = new Set<DisplayCurrency>();
    investments.forEach((inv) => set.add(inv.currency));
    if (set.size === 0) {
      set.add(profile?.display_currency || 'USD');
    }
    return Array.from(set).sort();
  }, [investments, profile?.display_currency]);

  const [activeCurrency, setActiveCurrency] = useState<DisplayCurrency>(
    profile?.display_currency || 'USD'
  );

  // Sync activeCurrency if availableCurrencies changes and current isn't in it
  const currentEffectiveCurrency = availableCurrencies.includes(activeCurrency)
    ? activeCurrency
    : availableCurrencies[0];

  const summary = useMemo(
    () => computeCurrencySummary(investments, currentEffectiveCurrency),
    [investments, currentEffectiveCurrency]
  );

  const isLoading = investmentsQuery.isLoading || transactionsQuery.isLoading;
  const hasError = investmentsQuery.isError || transactionsQuery.isError;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const retryQueries = () => {
    void investmentsQuery.refetch();
    void transactionsQuery.refetch();
  };

  return (
    <section className="space-y-8">
      {/* Top Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">
            Portfolio Intelligence
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {profile?.full_name ? `${profile.full_name}'s Portfolio` : 'Executive Dashboard'}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Real-time portfolio valuation, risk concentration, and asset allocation
          </p>
        </div>

        {/* Currency Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Currency Toggle Tabs */}
          {availableCurrencies.length > 1 && (
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1">
              {availableCurrencies.map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setActiveCurrency(curr)}
                  className={`rounded-lg px-3 py-1.5 font-mono text-xs font-bold transition-all ${
                    currentEffectiveCurrency === curr
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          )}

          <Link
            to="/investments"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/70 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-sm backdrop-blur-sm transition hover:border-slate-600 hover:bg-slate-700 hover:text-white"
          >
            <BriefcaseBusiness className="h-3.5 w-3.5 text-brand-400" />
            <span>Investments</span>
          </Link>

          <Link
            to="/transactions"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-500"
          >
            <ArrowUpRightFromSquare className="h-3.5 w-3.5" />
            <span>Ledger</span>
          </Link>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<LogOut className="h-3.5 w-3.5" />}
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </div>
      </header>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-6" aria-label="Loading dashboard metrics">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-80 w-full rounded-2xl" />
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : hasError ? (
        <Alert type="error" title="Portfolio Data Unavailable">
          <p>
            {investmentsQuery.error instanceof Error
              ? investmentsQuery.error.message
              : transactionsQuery.error instanceof Error
              ? transactionsQuery.error.message
              : 'Unable to communicate with the database. Please verify your credentials and network connection.'}
          </p>
          <Button
            className="mt-4"
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={retryQueries}
          >
            Retry Query
          </Button>
        </Alert>
      ) : investments.length === 0 ? (
        /* Empty Portfolio State */
        <div className="space-y-8">
          <EmptyState
            icon={<Wallet className="h-8 w-8 text-brand-400" />}
            title="Your Investment Portfolio is Empty"
            description="Start building your portfolio by recording your first holding. FinTrack tracks your recorded prices, performance trajectories, and diversification metrics."
            action={
              <Link
                to="/investments"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-500"
              >
                <Plus className="h-4 w-4" />
                <span>Add Your First Holding</span>
              </Link>
            }
          />
          <RecentTransactionsCard transactions={transactions} currency={currentEffectiveCurrency} />
        </div>
      ) : (
        /* Main Dashboard Content */
        <div className="space-y-7">
          {/* Section A: Overview Cards */}
          <OverviewCards summary={summary} />

          {/* Section B & C: Performance Chart & Asset Allocation */}
          <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
            <PerformanceChart
              investments={investments}
              transactions={transactions}
              currency={currentEffectiveCurrency}
            />
            <AllocationDonut
              investments={investments}
              currency={currentEffectiveCurrency}
            />
          </div>

          {/* Section D & E: Portfolio Health & Top/Worst Performers */}
          <div className="grid gap-5 lg:grid-cols-2">
            <PortfolioHealthCard
              investments={investments}
              currency={currentEffectiveCurrency}
            />
            <PerformersCard
              investments={investments}
              currency={currentEffectiveCurrency}
            />
          </div>

          {/* Section F: Holdings Overview (Search, Sort, Filter) */}
          <HoldingsTable
            investments={investments}
            currency={currentEffectiveCurrency}
          />

          {/* Section G & H: Recent Transactions & Goals / Smart Insights */}
          <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
            <RecentTransactionsCard
              transactions={transactions}
              currency={currentEffectiveCurrency}
            />
            <GoalsAndInsights
              investments={investments}
              transactions={transactions}
              currency={currentEffectiveCurrency}
              currentValue={summary.current}
              userId={user?.id}
            />
          </div>
        </div>
      )}
    </section>
  );
};
