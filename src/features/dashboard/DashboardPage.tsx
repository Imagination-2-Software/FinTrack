import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ArrowUpRightFromSquare, BriefcaseBusiness, Clock3, LogOut, RefreshCw, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { useAuth } from '@/hooks/useAuth';
import type { AssetType, DisplayCurrency, InvestmentRow, TransactionRow } from '@/types';
import { useInvestments, useTransactions } from '@/features/investments/hooks';
import { calculateInvestment, formatMoney, formatQuantity } from '@/features/investments/format';

interface CurrencySummary {
  currency: DisplayCurrency;
  investments: InvestmentRow[];
  invested: number;
  current: number;
  profitLoss: number;
  profitLossPercentage: number | null;
  todayProfitLoss: number | null;
  todayProfitLossPercentage: number | null;
  baselinePending: boolean;
  previousCloseValue: number;
}

const allocationColors = ['#2dd4bf', '#60a5fa', '#f59e0b', '#a78bfa', '#fb7185'];

function summarizeByCurrency(investments: InvestmentRow[]): CurrencySummary[] {
  const grouped = new Map<DisplayCurrency, InvestmentRow[]>();
  investments.forEach((investment) => {
    const items = grouped.get(investment.currency) ?? [];
    items.push(investment);
    grouped.set(investment.currency, items);
  });

  return [...grouped.entries()].map(([currency, items]) => {
    const invested = items.reduce(
      (total, investment) => total + calculateInvestment(investment).investedValue,
      0
    );
    const current = items.reduce(
      (total, investment) => total + calculateInvestment(investment).currentValue,
      0
    );
    const profitLoss = current - invested;
    const hasValidBaseline = (investment: InvestmentRow) =>
      investment.previous_close_price !== null
      && Number.isFinite(Number(investment.previous_close_price))
      && Number(investment.previous_close_price) >= 0;
    const positionsNeedingBaseline = items.filter(
      (investment) => Number(investment.quantity) > 0 && !hasValidBaseline(investment)
    );
    const baselinePending = positionsNeedingBaseline.length > 0;
    const previousCloseValue = items.reduce((total, investment) => {
      if (!hasValidBaseline(investment)) return total;
      return total + Number(investment.quantity) * Number(investment.previous_close_price);
    }, 0);
    const todayProfitLoss = baselinePending ? null : current - previousCloseValue;

    return {
      currency,
      investments: items,
      invested,
      current,
      profitLoss,
      profitLossPercentage: invested === 0 ? null : profitLoss / invested * 100,
      todayProfitLoss,
      todayProfitLossPercentage:
        todayProfitLoss === null || previousCloseValue === 0
          ? null
          : todayProfitLoss / previousCloseValue * 100,
      baselinePending,
      previousCloseValue,
    };
  }).sort((first, second) => first.currency.localeCompare(second.currency));
}

function getAllocation(investments: InvestmentRow[]) {
  const byType = new Map<AssetType, number>();
  investments.forEach((investment) => {
    const value = calculateInvestment(investment).currentValue;
    byType.set(investment.asset_type, (byType.get(investment.asset_type) ?? 0) + value);
  });
  const total = [...byType.values()].reduce((sum, value) => sum + value, 0);
  return [...byType.entries()].map(([assetType, value]) => ({
    assetType,
    value,
    percentage: total === 0 ? 0 : value / total * 100,
  }));
}

function formatTransactionAmount(transaction: TransactionRow): string {
  return transaction.currency
    ? formatMoney(Number(transaction.total_amount), transaction.currency)
    : `${Number(transaction.total_amount).toLocaleString()} (currency unavailable)`;
}

export const DashboardPage: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const investmentsQuery = useInvestments();
  const transactionsQuery = useTransactions();
  const investments = investmentsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];
  const currencySummaries = summarizeByCurrency(investments);
  const isLoading = investmentsQuery.isLoading || transactionsQuery.isLoading;
  const hasError = investmentsQuery.isError || transactionsQuery.isError;
  const recentTransactions = transactions.slice(0, 6);

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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Portfolio dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/investments" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800">
            <BriefcaseBusiness className="h-4 w-4" /> Investments
          </Link>
          <Link to="/transactions" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-500">
            <ArrowUpRightFromSquare className="h-4 w-4" /> Transactions
          </Link>
          <Button variant="outline" leftIcon={<LogOut className="h-4 w-4" />} onClick={handleSignOut}>Sign out</Button>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-5" aria-label="Loading portfolio dashboard">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 w-full" />)}</div>
          <div className="grid gap-5 xl:grid-cols-2"><Skeleton className="h-80 w-full" /><Skeleton className="h-80 w-full" /></div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : hasError ? (
        <Alert type="error" title="Portfolio data could not be loaded">
          <p>{investmentsQuery.error instanceof Error ? investmentsQuery.error.message : transactionsQuery.error instanceof Error ? transactionsQuery.error.message : 'Please retry.'}</p>
          <Button className="mt-4" size="sm" variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={retryQueries}>Retry</Button>
        </Alert>
      ) : investments.length === 0 ? (
        <>
          <EmptyState icon={<Wallet className="h-6 w-6" />} title="No portfolio holdings yet" description="Add a holding to see portfolio values, allocation, and performance based on your recorded prices." action={<Link to="/investments" className="text-sm font-semibold text-brand-400 hover:text-brand-300">Add a holding</Link>} />
          <RecentTransactions transactions={recentTransactions} />
        </>
      ) : (
        <>
          {currencySummaries.map((summary) => (
            <section key={summary.currency} className="space-y-4" aria-label={`${summary.currency} portfolio summary`}>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h2 className="text-sm font-semibold uppercase text-slate-300">{summary.currency} portfolio</h2>
                <Link to="/investments" className="text-xs font-medium text-brand-400 hover:text-brand-300">View holdings</Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Total investment" value={formatMoney(summary.invested, summary.currency)} icon={<Wallet className="h-4 w-4" />} tooltip="Recorded quantity × average purchase price" />
                <StatCard title="Current portfolio value" value={formatMoney(summary.current, summary.currency)} icon={<BriefcaseBusiness className="h-4 w-4" />} tooltip="Recorded quantity × current price" />
                <StatCard title="Total P&L" value={formatMoney(summary.profitLoss, summary.currency)} changePercentage={summary.profitLossPercentage} icon={summary.profitLoss >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />} />
                <StatCard title="Today's P&L" value={summary.todayProfitLoss === null ? 'N/A' : formatMoney(summary.todayProfitLoss, summary.currency)} changePercentage={summary.todayProfitLossPercentage} baselinePending={summary.baselinePending} baselineNote="Previous-close baseline unavailable" icon={<Clock3 className="h-4 w-4" />} tooltip="Compared with stored previous-close prices" />
              </div>
            </section>
          ))}

          <div className="grid gap-5 xl:grid-cols-2">
            <PerformanceCharts summaries={currencySummaries} />
            <AllocationCharts summaries={currencySummaries} />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Performers investments={investments} />
            <RecentTransactions transactions={recentTransactions} />
          </div>
        </>
      )}
    </section>
  );
};

const PerformanceCharts: React.FC<{ summaries: CurrencySummary[] }> = ({ summaries }) => (
  <section className="space-y-4" aria-labelledby="portfolio-performance-title">
    <div>
      <h2 id="portfolio-performance-title" className="text-lg font-semibold text-white">Portfolio value snapshot</h2>
      <p className="mt-1 text-xs text-slate-500">Recorded cost basis versus current value. Historical valuation data is not available in the current schema.</p>
    </div>
    {summaries.map((summary) => (
      <div key={summary.currency} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase text-slate-400">{summary.currency}</h3>
        <div className="h-64 w-full" role="img" aria-label={`${summary.currency} invested and current values by holding`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.investments.map((investment) => ({
              symbol: investment.symbol,
              invested: calculateInvestment(investment).investedValue,
              current: calculateInvestment(investment).currentValue,
            }))} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="#263244" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="symbol" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => Number(value).toLocaleString()} width={68} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={(value) => formatMoney(Number(value), summary.currency)} />
              <Legend />
              <Bar dataKey="invested" name="Invested" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="current" name="Current value" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    ))}
  </section>
);

const AllocationCharts: React.FC<{ summaries: CurrencySummary[] }> = ({ summaries }) => (
  <section className="space-y-4" aria-labelledby="asset-allocation-title">
    <div>
      <h2 id="asset-allocation-title" className="text-lg font-semibold text-white">Asset allocation</h2>
      <p className="mt-1 text-xs text-slate-500">Current value by asset type, kept separate by currency.</p>
    </div>
    {summaries.map((summary) => {
      const allocation = getAllocation(summary.investments).filter((item) => item.value > 0);
      return (
        <div key={summary.currency} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase text-slate-400">{summary.currency}</h3>
          {allocation.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">No positive current values to allocate.</p> : (
            <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(130px,0.8fr)]">
              <div className="h-60 min-w-0" role="img" aria-label={`${summary.currency} asset allocation by type`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={allocation} dataKey="value" nameKey="assetType" innerRadius="55%" outerRadius="82%" paddingAngle={2}>
                      {allocation.map((item, index) => <Cell key={item.assetType} fill={allocationColors[index % allocationColors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} formatter={(value) => formatMoney(Number(value), summary.currency)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {allocation.map((item, index) => <li key={item.assetType} className="flex items-start justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-slate-400"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: allocationColors[index % allocationColors.length] }} /><span className="truncate">{item.assetType}</span></span>
                  <span className="shrink-0 text-right text-slate-200">{item.percentage.toFixed(1)}%<br />{formatMoney(item.value, summary.currency)}</span>
                </li>)}
              </ul>
            </div>
          )}
        </div>
      );
    })}
  </section>
);

const Performers: React.FC<{ investments: InvestmentRow[] }> = ({ investments }) => {
  const ranked = investments
    .map((investment) => ({ investment, performance: calculateInvestment(investment) }))
    .filter((item) => item.performance.profitLossPercentage !== null)
    .sort((first, second) => (second.performance.profitLossPercentage ?? 0) - (first.performance.profitLossPercentage ?? 0));
  const best = ranked.filter((item) => (item.performance.profitLossPercentage ?? 0) > 0).slice(0, 3);
  const worst = [...ranked].reverse().filter((item) => (item.performance.profitLossPercentage ?? 0) < 0).slice(0, 3);

  return (
    <section className="space-y-4" aria-labelledby="performers-title">
      <div>
        <h2 id="performers-title" className="text-lg font-semibold text-white">Holding performance</h2>
        <p className="mt-1 text-xs text-slate-500">Ranked by recorded gain or loss percentage.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <PerformerList title="Top performers" items={best} positive />
        <PerformerList title="Needs attention" items={worst} positive={false} />
      </div>
    </section>
  );
};

interface PerformerItem {
  investment: InvestmentRow;
  performance: ReturnType<typeof calculateInvestment>;
}

const PerformerList: React.FC<{ title: string; items: PerformerItem[]; positive: boolean }> = ({ title, items, positive }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
    <h3 className="mb-3 text-xs font-semibold uppercase text-slate-400">{title}</h3>
    {items.length === 0 ? <p className="py-5 text-sm text-slate-500">No holdings in this group.</p> : (
      <ul className="divide-y divide-slate-800">
        {items.map(({ investment, performance }) => <li key={investment.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{investment.asset_name}</p><p className="text-xs text-slate-500">{investment.symbol} · {investment.currency}</p></div>
          <div className={`shrink-0 text-right text-sm font-semibold ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {performance.profitLossPercentage?.toFixed(2)}%<p className="text-xs font-normal">{formatMoney(performance.profitLoss, investment.currency)}</p>
          </div>
        </li>)}
      </ul>
    )}
  </div>
);

const RecentTransactions: React.FC<{ transactions: TransactionRow[] }> = ({ transactions }) => (
  <section className="space-y-4" aria-labelledby="recent-transactions-title">
    <div className="flex items-center justify-between gap-3">
      <div><h2 id="recent-transactions-title" className="text-lg font-semibold text-white">Recent transactions</h2><p className="mt-1 text-xs text-slate-500">Latest ledger entries across your account.</p></div>
      <Link to="/transactions" className="shrink-0 text-xs font-medium text-brand-400 hover:text-brand-300">View all</Link>
    </div>
    {transactions.length === 0 ? <EmptyState title="No transactions yet" description="Recorded BUY and SELL entries will appear here." action={<Link to="/transactions" className="text-sm font-semibold text-brand-400 hover:text-brand-300">Record a transaction</Link>} /> : (
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        <ul className="divide-y divide-slate-800">
          {transactions.map((transaction) => <li key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{transaction.asset_name} <span className="text-xs text-slate-500">{transaction.asset_symbol}</span></p><p className="mt-1 text-xs text-slate-500">{transaction.transaction_date} · {formatQuantity(Number(transaction.quantity))} · {transaction.transaction_type}</p></div>
            <span className="shrink-0 font-mono text-sm text-slate-200">{formatTransactionAmount(transaction)}</span>
          </li>)}
        </ul>
      </div>
    )}
  </section>
);