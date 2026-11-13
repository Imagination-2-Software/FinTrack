import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import type { AssetType, DisplayCurrency, InvestmentRow } from '@/types';
import { calculateInvestment, formatMoney } from '@/features/investments/format';

interface AllocationDonutProps {
  investments: InvestmentRow[];
  currency: DisplayCurrency;
}

interface AllocationSlice {
  assetType: AssetType;
  value: number;
  percentage: number;
  color: string;
}

const ASSET_COLORS: Record<AssetType, string> = {
  Stocks: '#6366f1', // Indigo
  'Mutual Funds': '#06b6d4', // Cyan
  ETFs: '#10b981', // Emerald
  Commodities: '#f59e0b', // Amber
  Cryptocurrency: '#a855f7', // Purple
};

export const AllocationDonut: React.FC<AllocationDonutProps> = ({ investments, currency }) => {
  const filtered = investments.filter((inv) => inv.currency === currency);

  const byType = new Map<AssetType, number>();
  filtered.forEach((inv) => {
    const val = Math.max(0, calculateInvestment(inv).currentValue);
    byType.set(inv.asset_type, (byType.get(inv.asset_type) ?? 0) + val);
  });

  const totalValue = Array.from(byType.values()).reduce((sum, v) => sum + v, 0);

  const slices: AllocationSlice[] = Array.from(byType.entries())
    .map(([assetType, value]) => ({
      assetType,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      color: ASSET_COLORS[assetType] || '#94a3b8',
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <section
      aria-labelledby="asset-allocation-heading"
      className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between border-b border-slate-800/70 pb-4">
        <div>
          <h2 id="asset-allocation-heading" className="text-base font-semibold text-white">
            Asset Allocation
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">Current portfolio distribution by asset class</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/70 text-slate-300">
          <PieIcon className="h-4 w-4" />
        </div>
      </div>

      {slices.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center">
          <p className="text-sm font-medium text-slate-400">No asset allocation data</p>
          <p className="mt-1 text-xs text-slate-500">
            Recorded holdings with positive current value will appear in this breakdown.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid items-center gap-4 sm:grid-cols-[1fr_1.1fr]">
          {/* Donut Chart */}
          <div className="relative h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="assetType"
                  innerRadius="60%"
                  outerRadius="85%"
                  paddingAngle={3}
                  stroke="#0f172a"
                  strokeWidth={2}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.assetType} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as AllocationSlice;
                      return (
                        <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-2.5 shadow-xl backdrop-blur-md text-xs">
                          <p className="font-semibold text-white">{data.assetType}</p>
                          <p className="mt-1 font-mono text-slate-200">
                            {formatMoney(data.value, currency)}
                          </p>
                          <p className="text-slate-400">
                            {data.percentage.toFixed(1)}% of portfolio
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Inner Center Label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Total
              </span>
              <span className="font-mono text-sm font-bold text-white tabular-nums">
                {formatMoney(totalValue, currency)}
              </span>
            </div>
          </div>

          {/* Breakdown Legend */}
          <ul className="space-y-2.5">
            {slices.map((slice) => (
              <li
                key={slice.assetType}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/60 bg-slate-950/40 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate font-medium text-slate-200">
                    {slice.assetType}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-semibold text-white tabular-nums">
                    {slice.percentage.toFixed(1)}%
                  </span>
                  <span className="ml-2 font-mono text-slate-400 tabular-nums">
                    {formatMoney(slice.value, currency)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
