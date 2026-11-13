import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUpDown, ExternalLink, BriefcaseBusiness } from 'lucide-react';
import type { AssetType, DisplayCurrency, InvestmentRow } from '@/types';
import { calculateInvestment, formatMoney, formatQuantity } from '@/features/investments/format';
import { ALL_ASSET_CLASSES } from '../portfolioHealth';

interface HoldingsTableProps {
  investments: InvestmentRow[];
  currency: DisplayCurrency;
}

type SortField = 'value' | 'profitLoss' | 'name' | 'quantity';
type SortDirection = 'asc' | 'desc';

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ investments, currency }) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | AssetType>('ALL');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredInvestments = investments.filter((inv) => inv.currency === currency);

  const displayHoldings = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = filteredInvestments.filter((inv) => {
      if (selectedType !== 'ALL' && inv.asset_type !== selectedType) return false;
      if (term && !`${inv.asset_name} ${inv.symbol}`.toLowerCase().includes(term)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const calcA = calculateInvestment(a);
      const calcB = calculateInvestment(b);

      let comparison = 0;
      switch (sortField) {
        case 'value':
          comparison = calcB.currentValue - calcA.currentValue;
          break;
        case 'profitLoss':
          comparison = calcB.profitLoss - calcA.profitLoss;
          break;
        case 'quantity':
          comparison = Number(b.quantity) - Number(a.quantity);
          break;
        case 'name':
        default:
          comparison = a.asset_name.localeCompare(b.asset_name);
          break;
      }

      return sortDirection === 'desc' ? comparison : -comparison;
    });
  }, [filteredInvestments, search, selectedType, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <section
      aria-labelledby="holdings-overview-heading"
      className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl backdrop-blur-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/70 pb-4">
        <div>
          <h2 id="holdings-overview-heading" className="text-base font-semibold text-white">
            Holdings Overview
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Recorded positions in {currency} with real-time calculations
          </p>
        </div>

        <Link
          to="/investments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition"
        >
          <span>Manage in Investments</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by asset name or symbol..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          />
        </div>

        {/* Asset Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as 'ALL' | AssetType)}
          className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
        >
          <option value="ALL">All Asset Classes</option>
          {ALL_ASSET_CLASSES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Holdings Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40">
        {displayHoldings.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <BriefcaseBusiness className="mx-auto h-6 w-6 text-slate-600 mb-2" />
            <p>No holdings match your filter criteria.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th
                  onClick={() => toggleSort('name')}
                  className="cursor-pointer px-4 py-3 hover:text-white transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Asset</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('quantity')}
                  className="cursor-pointer px-3 py-3 text-right hover:text-white transition"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Quantity</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-3 py-3 text-right">Avg Purchase</th>
                <th className="px-3 py-3 text-right">Current Price</th>
                <th
                  onClick={() => toggleSort('value')}
                  className="cursor-pointer px-3 py-3 text-right hover:text-white transition"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Current Value</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('profitLoss')}
                  className="cursor-pointer px-4 py-3 text-right hover:text-white transition"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Profit / Loss</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayHoldings.map((inv) => {
                const calc = calculateInvestment(inv);
                const isPositive = calc.profitLoss >= 0;

                return (
                  <tr
                    key={inv.id}
                    className="transition hover:bg-slate-900/50"
                  >
                    {/* Asset Name and Symbol */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{inv.asset_name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono">{inv.symbol}</span>
                        <span>&bull;</span>
                        <span className="rounded bg-slate-800/80 px-1.5 py-0.2 text-[10px] text-slate-300">
                          {inv.asset_type}
                        </span>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-3 text-right font-mono text-slate-300 tabular-nums">
                      {formatQuantity(Number(inv.quantity))}
                    </td>

                    {/* Average Purchase Price */}
                    <td className="px-3 py-3 text-right font-mono text-slate-300 tabular-nums">
                      {formatMoney(Number(inv.purchase_price), inv.currency)}
                    </td>

                    {/* Current Price */}
                    <td className="px-3 py-3 text-right font-mono text-slate-200 tabular-nums">
                      {formatMoney(Number(inv.current_price), inv.currency)}
                    </td>

                    {/* Current Value */}
                    <td className="px-3 py-3 text-right font-mono font-bold text-white tabular-nums">
                      {formatMoney(calc.currentValue, inv.currency)}
                    </td>

                    {/* Profit / Loss */}
                    <td className="px-4 py-3 text-right">
                      <div
                        className={`font-mono font-semibold tabular-nums ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatMoney(calc.profitLoss, inv.currency)}
                      </div>
                      <div
                        className={`text-[11px] font-medium tabular-nums ${
                          isPositive ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {calc.profitLossPercentage !== null
                          ? `${isPositive ? '+' : ''}${calc.profitLossPercentage.toFixed(2)}%`
                          : 'N/A'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};
