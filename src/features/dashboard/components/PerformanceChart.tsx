import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Info } from 'lucide-react';
import type { DisplayCurrency, InvestmentRow, TransactionRow } from '@/types';
import { formatMoney } from '@/features/investments/format';
import {
  buildPortfolioTimeline,
  type TimeFilter,
  type TimelineDataPoint,
} from '../performanceTimeline';

interface PerformanceChartProps {
  investments: InvestmentRow[];
  transactions: TransactionRow[];
  currency: DisplayCurrency;
}

const timeFilters: { label: string; value: TimeFilter }[] = [
  { label: '7D', value: '7D' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: 'ALL', value: 'ALL' },
];

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  investments,
  transactions,
  currency,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>('1M');

  const timeline = buildPortfolioTimeline(
    investments,
    transactions,
    selectedFilter,
    currency
  );

  const isPositive = timeline.changeAmount >= 0;

  return (
    <section
      aria-labelledby="portfolio-performance-heading"
      className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md"
    >
      {/* Header and Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 pb-4">
        <div>
          <h2
            id="portfolio-performance-heading"
            className="flex items-center gap-2 text-base font-semibold text-white"
          >
            <span>Portfolio Performance</span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Valuation and capital trajectory based on recorded dates
          </p>
        </div>

        {/* Time Filters */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/60 p-1">
          {timeFilters.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => setSelectedFilter(tf.value)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                selectedFilter === tf.value
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trajectory Summary Badge */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold text-white tabular-nums">
            {formatMoney(timeline.endValue, currency)}
          </span>
          <span className="text-xs text-slate-400">current value</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
              isPositive
                ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : 'border border-rose-500/20 bg-rose-500/10 text-rose-400'
            }`}
          >
            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span>
              {isPositive ? '+' : ''}
              {formatMoney(timeline.changeAmount, currency)}
            </span>
            {timeline.changePercentage !== null && (
              <span className="font-normal opacity-90">
                ({isPositive ? '+' : ''}
                {timeline.changePercentage.toFixed(2)}%)
              </span>
            )}
          </span>
          <span className="text-xs text-slate-500">over {selectedFilter}</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="mt-4 h-64 w-full">
        {!timeline.hasData || timeline.points.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
            <Calendar className="h-8 w-8 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-400">No performance data in this timeframe</p>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              Add holdings or record transactions to chart portfolio growth across historical dates.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={timeline.points}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? '#10b981' : '#6366f1'} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={isPositive ? '#10b981' : '#6366f1'} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="investedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} opacity={0.6} />

              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : String(value)
                }
                width={45}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as TimelineDataPoint;
                    return (
                      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md">
                        <p className="text-xs font-semibold text-slate-400">{data.date}</p>
                        <div className="mt-1.5 space-y-1 text-xs">
                          <p className="flex justify-between gap-4">
                            <span className="text-slate-400">Portfolio Value:</span>
                            <span className="font-mono font-bold text-white">
                              {formatMoney(data.value, currency)}
                            </span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-slate-400">Capital Invested:</span>
                            <span className="font-mono font-medium text-slate-300">
                              {formatMoney(data.invested, currency)}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey="invested"
                name="Invested Basis"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="url(#investedGradient)"
              />

              <Area
                type="monotone"
                dataKey="value"
                name="Portfolio Value"
                stroke={isPositive ? '#10b981' : '#818cf8'}
                strokeWidth={2}
                fill="url(#performanceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Info className="h-3 w-3" />
          Solid line: Portfolio Value | Dashed line: Invested Basis
        </span>
        <span>Manual ledger pricing</span>
      </div>
    </section>
  );
};
